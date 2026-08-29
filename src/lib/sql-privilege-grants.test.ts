import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// Regression guard for the privilege-escalation gap found in the Phase 3
// follow-up audit: every security definer SQL function that mutates
// balances, decrypts secrets, or otherwise acts on attacker-controllable
// arguments must have its EXECUTE privilege revoked from public/anon/
// authenticated and re-granted only to the roles that legitimately call
// it — otherwise any signed-in (or, for some, anonymous) client can
// invoke it directly via `supabase.rpc(...)`, bypassing every ownership
// check the application layer wraps around it. This can't be verified
// against a live database in this environment (no Postgres to actually
// run these grants against), so it verifies the migration SQL text
// itself: a real, if partial, safety net against silently reintroducing
// this exact class of bug (e.g. a revert, or a future edit that drops
// the revoke/grant block while keeping the function).
const MIGRATIONS_DIR = join(__dirname, "../../supabase/migrations");

function allMigrationsSql(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  return files.map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8")).join("\n");
}

// Functions that mutate state or reveal secrets based on caller-supplied
// arguments — must be restricted to service_role only.
const SERVICE_ROLE_ONLY_FUNCTIONS: Array<{ name: string; signature: string }> = [
  { name: "decrement_credits", signature: "decrement_credits(uuid, integer)" },
  { name: "increment_credits", signature: "increment_credits(uuid, integer)" },
  { name: "deploy_token_encrypt", signature: "deploy_token_encrypt(text)" },
  { name: "deploy_token_decrypt", signature: "deploy_token_decrypt(uuid)" },
  { name: "increment_template_use_count", signature: "increment_template_use_count(uuid)" },
];

// Functions that only ever answer a question about the CALLING user's own
// identity (auth.uid()) — safe for any authenticated user to call
// directly, but not anon (which has no auth.uid()).
const AUTHENTICATED_OK_FUNCTIONS: Array<{ name: string; signature: string }> = [
  { name: "is_admin", signature: "is_admin()" },
  { name: "is_org_member", signature: "is_org_member(uuid)" },
];

describe("SQL privilege grants — no security definer function is left directly callable by a client without an explicit, intentional grant", () => {
  const sql = allMigrationsSql();

  it.each(SERVICE_ROLE_ONLY_FUNCTIONS)(
    "$name is revoked from public/anon/authenticated and granted only to service_role",
    ({ signature }) => {
      const revokePattern = new RegExp(
        `revoke execute on function public\\.${signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} from [^;]*\\bpublic\\b[^;]*\\banon\\b[^;]*\\bauthenticated\\b`,
        "i"
      );
      const grantPattern = new RegExp(
        `grant execute on function public\\.${signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} to [^;]*\\bservice_role\\b`,
        "i"
      );
      expect(sql).toMatch(revokePattern);
      expect(sql).toMatch(grantPattern);
      // And must NOT be granted to authenticated/anon anywhere.
      const badGrant = new RegExp(
        `grant execute on function public\\.${signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} to [^;]*\\b(authenticated|anon)\\b`,
        "i"
      );
      expect(sql).not.toMatch(badGrant);
    }
  );

  it.each(AUTHENTICATED_OK_FUNCTIONS)("$name is revoked from anon and granted to authenticated", ({ signature }) => {
    const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const revokePattern = new RegExp(`revoke execute on function public\\.${escaped} from [^;]*\\banon\\b`, "i");
    const grantPattern = new RegExp(`grant execute on function public\\.${escaped} to [^;]*\\bauthenticated\\b`, "i");
    expect(sql).toMatch(revokePattern);
    expect(sql).toMatch(grantPattern);
  });

  it("is_admin() and is_org_member() have real bodies (not the raise-exception reconstructed stub) in the latest migration defining them", () => {
    // Find every CREATE (OR REPLACE) FUNCTION block for each name, across
    // all migrations in order, and check the LAST one — since Postgres
    // migrations apply in order and CREATE OR REPLACE overwrites, only the
    // final definition matters for what the database actually runs.
    for (const fn of ["is_admin", "is_org_member"]) {
      const blocks = [...sql.matchAll(new RegExp(`create (?:or replace )?function public\\.${fn}\\([^)]*\\)[\\s\\S]*?\\$\\$;`, "gi"))];
      expect(blocks.length).toBeGreaterThan(0);
      const lastBlock = blocks[blocks.length - 1][0];
      expect(lastBlock.toLowerCase()).not.toContain("reconstructed stub");
      expect(lastBlock.toLowerCase()).not.toContain("raise exception");
      expect(lastBlock.toLowerCase()).toContain("auth.uid()");
    }
  });

  it("every security definer function created outside this file's known-safe list sets an explicit search_path (defense against search_path hijacking)", () => {
    // Every CREATE (OR REPLACE) FUNCTION ... SECURITY DEFINER block in the
    // migration history should have "search_path" set somewhere in its
    // signature clause, OR be one of the ones this migration set explicitly
    // pins via ALTER FUNCTION afterward.
    const alteredElsewhere = ["handle_new_user", "decrement_credits", "increment_credits", "increment_template_use_count"];
    for (const fn of alteredElsewhere) {
      const pattern = new RegExp(`alter function public\\.${fn}\\([^)]*\\) set search_path = public`, "i");
      expect(sql).toMatch(pattern);
    }
  });
});
