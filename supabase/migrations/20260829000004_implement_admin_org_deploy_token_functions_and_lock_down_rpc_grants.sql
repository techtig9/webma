-- Phase 3 rework follow-up: implement the remaining reconstructed-stub
-- functions (is_admin, is_org_member, deploy_token_encrypt/decrypt) for
-- real, AND close a privilege-escalation gap this audit found while doing
-- it — every security-sensitive function in this schema (this file's
-- targets, plus decrement_credits/increment_credits from migration
-- 20260829000003, plus increment_template_use_count from 20260829000001)
-- was created with Postgres' default EXECUTE-granted-to-PUBLIC privilege
-- and never revoked. Under Supabase/PostgREST, that means ANY signed-in
-- user — or, for functions callable with no auth context, ANY anonymous
-- caller — can invoke these directly via `supabase.rpc("<fn>", {...})`
-- from a browser, bypassing every ownership/ordering check the
-- application layer (src/lib/credits.ts, the deploy routes, etc.) wraps
-- around them. Concretely, until this migration: any authenticated user
-- could call increment_credits(p_user_id: <their own id>, p_amount: 999999999)
-- directly and grant themselves unlimited credits, or call
-- decrement_credits(p_user_id: <anyone>, p_amount: 999999) to zero out a
-- different user's balance — the app-layer code never lets you do either,
-- but the raw RPC endpoint did. This migration fixes that for every
-- affected function, in addition to implementing the four that were still
-- raise-exception stubs.

-- ============================================================================
-- 1. is_admin() / is_org_member(uuid) — real implementations.
-- ============================================================================
-- Nothing in this codebase's TypeScript calls either of these today —
-- confirmed by grep: admin authorization is done independently, and
-- correctly, in src/lib/auth.ts's requireAdmin() (re-reads role from
-- public.users, server-side, keyed off the verified session's own user
-- id — not client-trusted); org membership checks are done independently
-- in each src/app/api/orgs/*/route.ts by querying organization_members
-- directly. These two SQL functions were apparently intended as
-- RLS-policy helpers but nothing ever adopted them (the real RLS
-- policies, in schema.sql and in 20260829000003, all inline the
-- equivalent `exists (...)` check directly instead). They're implemented
-- for real here anyway, verbatim matching that same already-proven
-- inline-EXISTS logic — not a guess, just giving the named helper the
-- same body its callers already trust — in case anything (a future RLS
-- policy, a future RPC caller) wants to use the named helper instead of
-- repeating the EXISTS check inline.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin');
end;
$$;

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org_id and m.user_id = auth.uid()
  );
end;
$$;

-- Both functions only ever answer "is the CALLING user (auth.uid(), taken
-- from their own verified JWT) an admin / a member of org p_org_id" — the
-- caller cannot ask on behalf of anyone else, so there is no escalation
-- path in allowing any signed-in user to call these directly. Restricted
-- to `authenticated` anyway (not `anon`, which has no auth.uid() and would
-- always just get `false`) as routine least-privilege hygiene.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;

-- ============================================================================
-- 2. deploy_token_encrypt(text) / deploy_token_decrypt(uuid) — real
--    implementations via Supabase Vault, created ONLY if the `vault`
--    extension/schema is actually present on this database.
-- ============================================================================
-- Why Vault, specifically: the column these functions exist to serve
-- (deploy_connections.access_token_secret_id) is typed `uuid`, and this
-- app's own code (src/app/api/deploy/deploy-vercel/route.ts,
-- vercel-status/route.ts) already documents that legacy path as "existing
-- installations that already use Supabase Vault". A uuid "secret id" you
-- hand to a decrypt function to get plaintext back is exactly Supabase
-- Vault's own create_secret()/decrypted_secrets shape — this is the
-- standard, documented mechanism for precisely this signature, not a
-- guessed reimplementation of unknown custom logic.
--
-- Why conditional: this repository has no live database to confirm the
-- `vault` extension is actually enabled on it, and a plain top-level
-- `create function ... as $$ ... vault.create_secret(...) ... $$` would
-- reference an unqualified/nonexistent schema if it isn't, which risks
-- failing at first invocation (and, depending on Postgres settings, even
-- at CREATE FUNCTION time). Wrapping the whole definition in dynamic SQL
-- inside a guarded DO block means: if `vault` exists, these become real,
-- working functions; if it does not, this block is a no-op and the
-- existing baseline "reconstructed stub" (which clearly raises an
-- actionable exception rather than silently failing) is left exactly as
-- it is — never a fake success path either way.
--
-- This does NOT change today's actual token flow at all: every real read
-- and write already goes through src/lib/deploy-secrets.ts's app-layer
-- AES-256-GCM (encryptDeployToken/decryptDeployToken), which is
-- independent of these RPCs, needs no database extension, and is what
-- both current OAuth callbacks (Vercel, GitHub) write to today. This RPC
-- pair only matters for a database carrying pre-existing legacy
-- Vault-based deploy_connections rows from a version of this app that
-- predates deploy-secrets.ts.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'vault') then
    execute $ddl$
      create or replace function public.deploy_token_encrypt(p_token text)
      returns text
      language plpgsql
      security definer
      set search_path = public
      as $body$
      declare
        v_id uuid;
      begin
        -- vault.create_secret() returns a bare uuid scalar (not a row/table
        -- with an "id" column) — assign it directly rather than SELECT-FROM,
        -- which would only be correct for a set-returning function.
        v_id := vault.create_secret(p_token);
        return v_id::text;
      end;
      $body$;
    $ddl$;

    execute $ddl$
      create or replace function public.deploy_token_decrypt(p_secret_id uuid)
      returns text
      language plpgsql
      security definer
      set search_path = public
      as $body$
      declare
        v_token text;
      begin
        select decrypted_secret into v_token from vault.decrypted_secrets where id = p_secret_id;
        return v_token;
      end;
      $body$;
    $ddl$;
  end if;
end $$;

-- Lock down regardless of which branch above ran (the vault-backed real
-- version, or the pre-existing raise-exception stub from the baseline
-- migration): a function that can decrypt an arbitrary stored OAuth token
-- given only its secret_id must never be callable directly by a client.
-- The application (deploy-vercel/route.ts, vercel-status/route.ts) only
-- ever passes a secret_id it already read from a deploy_connections row
-- it fetched scoped to the calling user (`.eq("user_id", user!.id)`) —
-- that ownership check happens entirely in application code, BEFORE the
-- RPC call, because the RPC itself has no way to know which user is
-- asking (service-role calls carry no auth.uid()). If this function were
-- left directly callable by `authenticated`, any signed-in user could
-- call it with a guessed or enumerated secret_id and decrypt a different
-- user's stored Vercel/GitHub token, entirely bypassing that check.
-- Restricting execution to service_role closes that off regardless of
-- which branch above defined the function body.
revoke execute on function public.deploy_token_encrypt(text) from public, anon, authenticated;
revoke execute on function public.deploy_token_decrypt(uuid) from public, anon, authenticated;
grant execute on function public.deploy_token_encrypt(text) to service_role;
grant execute on function public.deploy_token_decrypt(uuid) to service_role;

-- ============================================================================
-- 3. Lock down the credit-mutation and template-use-count RPCs the same
--    way — these already have real, correct bodies (decrement_credits/
--    increment_credits from 20260829000003; increment_template_use_count
--    from 20260829000001) but were never restricted from direct client
--    invocation either.
-- ============================================================================
-- decrement_credits / increment_credits: every legitimate caller
-- (src/lib/credits.ts's spendCredits/refundCredits) already runs on the
-- service-role client, with the amount computed server-side from a fixed
-- cost table and the user id taken from the authenticated session — never
-- client-supplied. Direct client access to these RPCs would let any
-- signed-in user grant themselves unlimited credits (increment_credits on
-- their own id with an arbitrary amount) or zero out another user's
-- balance (decrement_credits on someone else's id) — restricting
-- execution to service_role closes both off.
revoke execute on function public.decrement_credits(uuid, integer) from public, anon, authenticated;
revoke execute on function public.increment_credits(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_credits(uuid, integer) to service_role;
grant execute on function public.increment_credits(uuid, integer) to service_role;

-- increment_template_use_count: lower severity (it only bumps a public
-- popularity counter, no secret or balance involved) but its only real
-- caller (src/app/api/templates/use/route.ts) already runs on the
-- service-role client, so there's no legitimate reason to leave it
-- client-callable either — an anonymous/authenticated caller left able to
-- invoke it directly could spam a specific template's use_count to game
-- the "popular" sort with no rate limiting at the database layer.
revoke execute on function public.increment_template_use_count(uuid) from public, anon, authenticated;
grant execute on function public.increment_template_use_count(uuid) to service_role;

-- ============================================================================
-- 4. Pin search_path on the pre-existing security definer functions too.
-- ============================================================================
-- A SECURITY DEFINER function that references unqualified object names
-- without an explicit search_path runs with whatever search_path the
-- CALLING session has — if any role were ever able to create an
-- object (e.g. a table named "subscriptions") in a schema that sorts
-- earlier in that path, a security definer function could resolve to the
-- attacker's object instead of the intended public.* one. All of this
-- migration's own new functions above already set search_path explicitly;
-- these three (defined in earlier migrations before this repo's
-- verification pass caught the gap) get the same hardening applied
-- in-place, without changing their already-correct bodies.
alter function public.handle_new_user() set search_path = public;
alter function public.decrement_credits(uuid, integer) set search_path = public;
alter function public.increment_credits(uuid, integer) set search_path = public;
alter function public.increment_template_use_count(uuid) set search_path = public;

-- ============================================================================
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT TOUCH
-- ============================================================================
-- handle_new_user() (the auth.users signup trigger, restored in
-- 20260829000003) is not touched here: its return type is `trigger`,
-- which Postgres refuses to execute outside of an actual trigger context
-- ("trigger functions can only be called as triggers") regardless of
-- EXECUTE grants, and PostgREST does not expose trigger-returning
-- functions as callable RPCs at all — there is no direct-invocation
-- surface to close for it.
