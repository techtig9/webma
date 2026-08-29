import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression coverage for the Phase 5 fix to a real data-loss bug: a
// webhook event that needs a matching local `subscriptions` row (matched
// by paddle_customer_id, set at checkout time) previously got silently
// dropped when that row wasn't found yet — a real, if narrow, race Paddle's
// own docs acknowledge is possible — AND the event was still recorded as
// "processed" in processed_webhook_events, meaning even a genuine Paddle
// retry of the exact same event would immediately hit the duplicate
// short-circuit and never actually try again. Verified here against a
// hand-rolled Supabase/paddle/email mock rather than a live database
// (none available in this environment).

vi.mock("@/lib/paddle", () => ({
  verifyPaddleWebhook: vi.fn(() => true),
  planForPriceId: () => "pro",
}));

vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@/lib/email", () => ({
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentConfirmedEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionConfirmedEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCanceledEmail: vi.fn().mockResolvedValue(undefined),
  notifyAdmin: vi.fn(),
}));

const state = {
  dedupeInsertError: null as { code: string } | null,
  subscriptionsRow: null as Record<string, unknown> | null,
  usersRow: { email: "user@example.com", name: "Jordan" } as Record<string, unknown> | null,
  inserted: [] as Array<{ table: string; row: unknown }>,
  deleted: [] as Array<{ table: string; id: unknown }>,
};

function makeChain(table: string) {
  const self = {
    select: () => self,
    eq: () => self,
    update: () => self,
    single: () => Promise.resolve({ data: table === "users" ? state.usersRow : null }),
    maybeSingle: () => Promise.resolve({ data: table === "subscriptions" ? state.subscriptionsRow : null }),
    insert: (row: unknown) => {
      if (table === "processed_webhook_events" && state.dedupeInsertError) {
        return Promise.resolve({ error: state.dedupeInsertError });
      }
      state.inserted.push({ table, row });
      return Promise.resolve({ error: null });
    },
    upsert: (row: unknown) => {
      state.inserted.push({ table, row });
      return Promise.resolve({ error: null });
    },
    delete: () => ({
      eq: (_col: string, id: unknown) => {
        state.deleted.push({ table, id });
        return Promise.resolve({ error: null });
      },
    }),
  };
  return self;
}

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({ from: (table: string) => makeChain(table) }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => ({ from: (table: string) => makeChain(table) }),
}));

import { POST } from "./route";

function makeRequest(event: Record<string, unknown>) {
  return new Request("https://example.com/api/billing/paddle-webhook", {
    method: "POST",
    headers: { "Paddle-Signature": "ts=1;h1=whatever" },
    body: JSON.stringify(event),
  });
}

beforeEach(() => {
  state.dedupeInsertError = null;
  state.subscriptionsRow = null;
  state.usersRow = { email: "user@example.com", name: "Jordan" };
  state.inserted.length = 0;
  state.deleted.length = 0;
});

describe("paddle webhook — idempotency and the not-found race", () => {
  it("returns 200 and skips processing entirely on a genuine duplicate delivery", async () => {
    state.dedupeInsertError = { code: "23505" };
    const res = await POST(makeRequest({ event_id: "evt_1", event_type: "subscription.created", data: {} }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true, duplicate: true });
  });

  it("processes and updates the matching subscription when the local row already exists", async () => {
    state.subscriptionsRow = { user_id: "user-1", plan: "starter", renews_at: null };
    const event = {
      event_id: "evt_2",
      event_type: "subscription.created",
      data: {
        customer_id: "ctm_1",
        status: "active",
        items: [{ price: { id: "price_pro_month" } }],
        current_billing_period: { starts_at: "2026-01-01T00:00:00Z" },
        next_billed_at: "2026-02-01T00:00:00Z",
      },
    };
    const res = await POST(makeRequest(event));
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    // The dedupe record for a successfully processed event stays recorded.
    expect(state.inserted.some((i) => i.table === "processed_webhook_events")).toBe(true);
    expect(state.deleted).toHaveLength(0);
  });

  it("returns a non-2xx and un-records the dedupe entry when no matching subscription row exists yet — the actual bug fix", async () => {
    state.subscriptionsRow = null; // simulates the race: webhook arrived before the local row was matched
    const event = {
      event_id: "evt_3",
      event_type: "subscription.created",
      data: {
        customer_id: "ctm_unknown",
        status: "active",
        items: [{ price: { id: "price_pro_month" } }],
        current_billing_period: { starts_at: "2026-01-01T00:00:00Z" },
      },
    };
    const res = await POST(makeRequest(event));
    // Non-2xx so Paddle's documented retry-on-failure behavior actually
    // redelivers this event later, once the local row exists.
    expect(res.status).toBe(404);
    expect((await res.json()).received).toBe(false);
    // Critically: the dedupe record inserted at the top of the handler was
    // rolled back — a real retry of this exact event_id must be able to
    // reprocess it, not get silently swallowed by the duplicate check.
    expect(state.deleted).toEqual([{ table: "processed_webhook_events", id: "evt_3" }]);
  });

  it("also un-records and retries for transaction.completed when the customer has no local row yet", async () => {
    state.subscriptionsRow = null;
    const event = {
      event_id: "evt_4",
      event_type: "transaction.completed",
      data: { customer_id: "ctm_unknown", id: "txn_1", details: { totals: { total: "1200" } }, currency_code: "USD" },
    };
    const res = await POST(makeRequest(event));
    expect(res.status).toBe(404);
    expect(state.deleted).toEqual([{ table: "processed_webhook_events", id: "evt_4" }]);
    // And no payment row was ever written for a transaction we couldn't attribute to a user.
    expect(state.inserted.some((i) => i.table === "payments")).toBe(false);
  });

  it("rejects a request with an invalid signature before touching the database at all", async () => {
    const { verifyPaddleWebhook } = await import("@/lib/paddle");
    vi.mocked(verifyPaddleWebhook).mockReturnValueOnce(false);
    const res = await POST(makeRequest({ event_id: "evt_5", event_type: "subscription.created", data: {} }));
    expect(res.status).toBe(401);
    expect(state.inserted).toHaveLength(0);
  });
});
