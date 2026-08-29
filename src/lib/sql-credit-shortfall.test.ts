import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Regression guard for migration 20260829000005: decrement_credits changed
// from a void-returning, always-succeeds clamp to a boolean-returning
// function that reports whether the deduction it just performed was fully
// covered by the balance — closing the "silent" half of the disclosed
// credit-deduction race (see src/lib/credits.ts's canUseFeature docstring
// and src/lib/credits.test.ts's spendCredits shortfall tests for the
// application-layer half of this coverage). No live database is available
// in this environment, so this verifies the migration SQL text itself.
const MIGRATION_PATH = join(
  __dirname,
  "../../supabase/migrations/20260829000005_atomic_credit_shortfall_detection.sql"
);

describe("decrement_credits shortfall-detection migration", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("drops the old void-returning function before redefining it (CREATE OR REPLACE can't change return type)", () => {
    expect(sql).toMatch(/drop function if exists public\.decrement_credits\(uuid,\s*integer\)/i);
  });

  it("the new function returns boolean, not void", () => {
    const block = sql.match(/create function public\.decrement_credits\([^)]*\)[\s\S]*?\$\$ language plpgsql/i);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/returns boolean/i);
  });

  it("locks the row before reading it, so the covered-check and the write are atomic against a concurrent call", () => {
    expect(sql.toLowerCase()).toContain("for update");
  });

  it("never lets the balance go negative — still clamps the actual write at zero", () => {
    expect(sql).toMatch(/greatest\(credits_remaining\s*-\s*p_amount,\s*0\)/i);
  });

  it("re-applies the service-role-only lockdown after the drop+recreate", () => {
    expect(sql).toMatch(/revoke execute on function public\.decrement_credits\(uuid, integer\) from [^;]*\bpublic\b[^;]*\banon\b[^;]*\bauthenticated\b/i);
    expect(sql).toMatch(/grant execute on function public\.decrement_credits\(uuid, integer\) to [^;]*\bservice_role\b/i);
  });

  it("re-pins search_path after the drop+recreate", () => {
    expect(sql).toMatch(/alter function public\.decrement_credits\(uuid, integer\) set search_path = public/i);
  });
});
