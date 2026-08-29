import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ACTION_COSTS,
  PLAN_CREDITS,
  PLAN_PRICES,
  PLAN_FEATURES,
  isLowCredit,
  LOW_CREDIT_WARNING_RATIO,
  canUseFeature,
  spendCredits,
  refundCredits,
} from "@/lib/credits";

// A minimal, hand-rolled chainable mock of the subset of the Supabase
// query builder canUseFeature/spendCredits/refundCredits actually call —
// not a generic ORM mock, just enough to drive these three functions'
// real logic (previously entirely untested — the credit-deduction flow
// every AI/export/deploy route depends on) without a live database.
// Responses are keyed by table name and reconfigured per test via
// `mockResponses`.
const mockResponses: Record<string, { data: unknown; error: unknown }> = {};
const rpcCalls: Array<{ fn: string; args: unknown }> = [];
const insertedRows: Array<{ table: string; row: unknown }> = [];

function chain(table: string) {
  const self = {
    select: () => self,
    eq: () => self,
    is: () => self,
    update: () => self,
    single: () => Promise.resolve(mockResponses[table] ?? { data: null, error: null }),
    maybeSingle: () => Promise.resolve(mockResponses[table] ?? { data: null, error: null }),
    insert: (row: unknown) => {
      insertedRows.push({ table, row });
      return Promise.resolve({ data: null, error: null });
    },
  };
  return self;
}

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => chain(table),
    rpc: (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return { throwOnError: () => Promise.resolve({ data: null, error: null }) };
    },
  }),
}));

vi.mock("@/lib/email", () => ({
  sendCreditsLowEmail: vi.fn(),
}));

// These numbers came directly out of the product spec's credit-cost table. This
// test exists so a future edit can't silently change pricing (like the
// regenerate-vs-generate bug found and fixed during development) without a
// visible, deliberate test failure.
describe("credit cost table", () => {
  it("matches the spec exactly", () => {
    expect(ACTION_COSTS).toEqual({
      generate_full_website: 2500,
      generate_from_url: 3000,
      regenerate_complete: 750,
      generate_landing_page: 750,
      generate_new_page: 500,
      generate_new_section: 200,
      ai_edit: 350,
      change_theme: 100,
      voice_prompt: 50,
      generate_image: 600,
      export_code: 0,
      deploy_vercel: 0,
    });
  });

  it("regenerate is always cheaper than a fresh full generation", () => {
    expect(ACTION_COSTS.regenerate_complete).toBeLessThan(ACTION_COSTS.generate_full_website);
  });

  it("image generation costs more than a comparable single-call text edit, reflecting real per-image provider pricing", () => {
    expect(ACTION_COSTS.generate_image).toBeGreaterThan(ACTION_COSTS.ai_edit);
  });

  it("export and deploy are always free of credits", () => {
    expect(ACTION_COSTS.export_code).toBe(0);
    expect(ACTION_COSTS.deploy_vercel).toBe(0);
  });
});

describe("plan credit allowances", () => {
  it("matches the spec exactly", () => {
    expect(PLAN_CREDITS).toEqual({ free: 3_000, starter: 10_000, pro: 30_000, business: 75_000 });
  });

  it("strictly increases with plan tier", () => {
    expect(PLAN_CREDITS.free).toBeLessThan(PLAN_CREDITS.starter);
    expect(PLAN_CREDITS.starter).toBeLessThan(PLAN_CREDITS.pro);
    expect(PLAN_CREDITS.pro).toBeLessThan(PLAN_CREDITS.business);
  });
});

describe("plan prices", () => {
  it("strictly increases with plan tier", () => {
    expect(PLAN_PRICES.free).toBeLessThan(PLAN_PRICES.starter);
    expect(PLAN_PRICES.starter).toBeLessThan(PLAN_PRICES.pro);
    expect(PLAN_PRICES.pro).toBeLessThan(PLAN_PRICES.business);
  });
});

describe("plan feature matrix", () => {
  it("free plan can generate a website but not export, deploy, or add domains", () => {
    expect(PLAN_FEATURES.free.fullStackGeneration).toBe(true);
    expect(PLAN_FEATURES.free.zipExport).toBe(false);
    expect(PLAN_FEATURES.free.deployVercel).toBe(false);
    expect(PLAN_FEATURES.free.customDomains).toBe(0);
  });

  it("business plan is unlimited on domains and version history", () => {
    expect(PLAN_FEATURES.business.customDomains).toBe(-1);
    expect(PLAN_FEATURES.business.versionHistory).toBe(-1);
  });

  it("version history limits increase with plan tier", () => {
    expect(PLAN_FEATURES.starter.versionHistory).toBeLessThan(PLAN_FEATURES.pro.versionHistory);
  });
});

describe("isLowCredit", () => {
  it("is false comfortably above the threshold", () => {
    expect(isLowCredit(5_000, PLAN_CREDITS.starter)).toBe(false);
  });

  it("is true at exactly the threshold ratio", () => {
    expect(isLowCredit(PLAN_CREDITS.starter * LOW_CREDIT_WARNING_RATIO, PLAN_CREDITS.starter)).toBe(true);
  });

  it("is true at zero remaining", () => {
    expect(isLowCredit(0, PLAN_CREDITS.free)).toBe(true);
  });

  it("is false for a zero allowance (nothing to warn about, and avoids a division-by-zero-shaped comparison)", () => {
    expect(isLowCredit(0, 0)).toBe(false);
  });

  it("scales with plan size, not a fixed number — the same remaining balance reads as fine on a small plan but low on a large one", () => {
    expect(isLowCredit(5_000, PLAN_CREDITS.starter)).toBe(false); // 5,000/10,000 — half the plan left
    expect(isLowCredit(5_000, PLAN_CREDITS.business)).toBe(true); // 5,000/75,000 — under 10% left
  });
});

// Previously entirely untested: canUseFeature/spendCredits/refundCredits are
// the actual server-authoritative gate and deduction logic every AI,
// export, and deploy route calls before/after doing paid work — the exact
// mechanism the spec's "prevent users from manipulating frontend values,
// all credit calculations must be server-authoritative" requirement rests
// on. Exercised here against the hand-rolled Supabase mock above.
describe("canUseFeature", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockResponses)) delete mockResponses[key];
    rpcCalls.length = 0;
    insertedRows.length = 0;
  });

  it("admins bypass credit checks entirely", async () => {
    mockResponses.users = { data: { role: "admin" }, error: null };
    const result = await canUseFeature("user-1", "generate_full_website");
    expect(result).toEqual({ allowed: true, creditsAfter: Infinity, isAdmin: true });
  });

  it("denies a user with no active subscription row", async () => {
    mockResponses.users = { data: { role: "user" }, error: null };
    mockResponses.subscriptions = { data: null, error: null };
    const result = await canUseFeature("user-1", "generate_full_website");
    expect(result).toEqual({
      allowed: false,
      reason: "no_subscription",
      message: expect.stringContaining("active plan"),
    });
  });

  it("denies a feature not included in the user's plan", async () => {
    mockResponses.users = { data: { role: "user" }, error: null };
    mockResponses.subscriptions = { data: { plan: "free", status: "active", credits_remaining: 3000 }, error: null };
    // ai_edit requires Starter+ (PLAN_FEATURES.free.aiEditing === false)
    const result = await canUseFeature("user-1", "ai_edit");
    expect(result).toEqual({
      allowed: false,
      reason: "feature_locked",
      message: expect.stringContaining("free plan"),
    });
  });

  it("denies when the plan's balance is below the action's cost", async () => {
    mockResponses.users = { data: { role: "user" }, error: null };
    mockResponses.subscriptions = { data: { plan: "pro", status: "active", credits_remaining: 100 }, error: null };
    const result = await canUseFeature("user-1", "generate_full_website"); // costs 2500
    expect(result).toEqual({
      allowed: false,
      reason: "insufficient_credits",
      message: expect.stringContaining("2500"),
    });
  });

  it("allows and computes the correct post-deduction balance when everything checks out", async () => {
    mockResponses.users = { data: { role: "user" }, error: null };
    mockResponses.subscriptions = { data: { plan: "pro", status: "active", credits_remaining: 10_000 }, error: null };
    const result = await canUseFeature("user-1", "generate_full_website"); // costs 2500
    expect(result).toEqual({ allowed: true, creditsAfter: 7_500, isAdmin: false });
  });

  it("denies a subscription that exists but isn't active (e.g. past_due)", async () => {
    mockResponses.users = { data: { role: "user" }, error: null };
    mockResponses.subscriptions = { data: { plan: "pro", status: "past_due", credits_remaining: 10_000 }, error: null };
    const result = await canUseFeature("user-1", "generate_full_website");
    expect(result.allowed).toBe(false);
  });
});

describe("spendCredits", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockResponses)) delete mockResponses[key];
    // Kept null so spendCredits' fire-and-forget low-credit-warning check
    // (maybeSendLowCreditWarning) bails out on its first read instead of
    // racing the test's own assertions — that path is covered separately
    // by the isLowCredit tests above.
    mockResponses.subscriptions = { data: null, error: null };
    rpcCalls.length = 0;
    insertedRows.length = 0;
  });

  it("never deducts or logs anything for an admin", async () => {
    await spendCredits("user-1", "generate_full_website", { isAdmin: true });
    expect(rpcCalls).toHaveLength(0);
    expect(insertedRows).toHaveLength(0);
  });

  it("deducts the action's real cost and logs it to the ledger", async () => {
    await spendCredits("user-1", "generate_full_website", { isAdmin: false });
    expect(rpcCalls).toEqual([{ fn: "decrement_credits", args: { p_user_id: "user-1", p_amount: 2500 } }]);
    expect(insertedRows).toEqual([
      {
        table: "credit_ledger",
        row: { user_id: "user-1", action: "generate_full_website", credits_delta: -2500, cache_hit: false, project_id: undefined },
      },
    ]);
  });

  it("charges zero for a cache hit, per the 'duplicate requests hit the cache' credit rule", async () => {
    await spendCredits("user-1", "generate_full_website", { isAdmin: false, cacheHit: true });
    expect(rpcCalls).toEqual([{ fn: "decrement_credits", args: { p_user_id: "user-1", p_amount: 0 } }]);
    // toBeCloseTo (not toBe) because -cost with cost=0 is JS's harmless -0,
    // which Object.is-based equality treats as distinct from 0.
    expect((insertedRows[0].row as { credits_delta: number }).credits_delta).toBeCloseTo(0);
  });

  it("respects an explicit creditsOverride instead of the action's table cost", async () => {
    await spendCredits("user-1", "generate_full_website", { isAdmin: false, creditsOverride: 42 });
    expect(rpcCalls).toEqual([{ fn: "decrement_credits", args: { p_user_id: "user-1", p_amount: 42 } }]);
  });
});

describe("refundCredits", () => {
  beforeEach(() => {
    rpcCalls.length = 0;
    insertedRows.length = 0;
  });

  it("credits back the action's full cost and logs a positive ledger entry", async () => {
    await refundCredits("user-1", "ai_edit", "project-1");
    expect(rpcCalls).toEqual([{ fn: "increment_credits", args: { p_user_id: "user-1", p_amount: 350 } }]);
    expect(insertedRows).toEqual([
      { table: "credit_ledger", row: { user_id: "user-1", action: "ai_edit", credits_delta: 350, cache_hit: false, project_id: "project-1" } },
    ]);
  });
});
