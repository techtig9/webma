import { describe, it, expect, vi, beforeEach } from "vitest";

// requireUser/requireAdmin/requireApiKey are the entire authorization gate
// for this app — every API route starts with one of these three calls, and
// none of them had any test coverage before this. A hand-rolled mock of
// just the Supabase calls these three functions make, mirroring the same
// lightweight pattern used in credits.test.ts.
let mockUser: { id: string; email?: string } | null = null;
let mockUserRole: string | null = null;
let mockApiKeyRow: { id: string; user_id: string } | null = null;
const updateCalls: Array<{ table: string; fields: unknown }> = [];

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: mockUser } }) },
  }),
  createServiceRoleClient: () => ({
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockUserRole ? { role: mockUserRole } : null }),
            }),
          }),
        };
      }
      if (table === "api_keys") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: mockApiKeyRow }),
            }),
          }),
          update: (fields: unknown) => ({
            eq: () => {
              updateCalls.push({ table, fields });
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      throw new Error(`auth.test.ts mock: unexpected table "${table}"`);
    },
  }),
}));

import { requireUser, requireAdmin, requireApiKey } from "@/lib/auth";

beforeEach(() => {
  mockUser = null;
  mockUserRole = null;
  mockApiKeyRow = null;
  updateCalls.length = 0;
});

describe("requireUser", () => {
  it("returns a 401 response and no user when there's no session", async () => {
    const { user, response } = await requireUser();
    expect(user).toBeNull();
    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
  });

  it("returns the user with no response when authenticated", async () => {
    mockUser = { id: "user-1", email: "jordan@example.com" };
    const { user, response } = await requireUser();
    expect(response).toBeNull();
    expect(user).toEqual(mockUser);
  });
});

describe("requireAdmin", () => {
  it("returns a 401 when not authenticated at all — never reaches the role check", async () => {
    const { user, response } = await requireAdmin();
    expect(user).toBeNull();
    expect(response!.status).toBe(401);
  });

  it("returns a 403 for an authenticated user who isn't an admin", async () => {
    mockUser = { id: "user-1" };
    mockUserRole = "user";
    const { user, response } = await requireAdmin();
    expect(user).toBeNull();
    expect(response!.status).toBe(403);
  });

  it("returns the user with no response for a real admin — re-reads the role from the DB, not client-trusted", async () => {
    mockUser = { id: "admin-1" };
    mockUserRole = "admin";
    const { user, response } = await requireAdmin();
    expect(response).toBeNull();
    expect(user).toEqual(mockUser);
  });
});

describe("requireApiKey", () => {
  function requestWith(header: string | null) {
    const headers = new Headers();
    if (header !== null) headers.set("authorization", header);
    return new Request("https://example.com/api/v1/projects", { headers });
  }

  it("rejects a missing Authorization header", async () => {
    const { userId, response } = await requireApiKey(requestWith(null));
    expect(userId).toBeNull();
    expect(response!.status).toBe(401);
  });

  it("rejects a header that isn't a well-formed webma API key", async () => {
    const { userId, response } = await requireApiKey(requestWith("Bearer not-a-real-key"));
    expect(userId).toBeNull();
    expect(response!.status).toBe(401);
  });

  it("rejects a well-formed key that doesn't match any stored hash", async () => {
    mockApiKeyRow = null;
    const { userId, response } = await requireApiKey(requestWith(`Bearer wm_live_${"a".repeat(24)}`));
    expect(userId).toBeNull();
    expect(response!.status).toBe(401);
  });

  it("accepts a valid key, returns the owning userId, and records last_used_at", async () => {
    mockApiKeyRow = { id: "key-1", user_id: "user-42" };
    const { userId, response } = await requireApiKey(requestWith(`Bearer wm_live_${"b".repeat(24)}`));
    expect(response).toBeNull();
    expect(userId).toBe("user-42");
    // The last_used_at update is fire-and-forget (not awaited by
    // requireApiKey), so give its microtask a turn before asserting.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].table).toBe("api_keys");
  });
});
