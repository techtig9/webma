-- ============================================================================
-- CHECK_LIVE.sql — read-only diagnostics, run BEFORE PROD_SYNC.sql
-- ============================================================================
-- Every statement here is a SELECT against system catalogs or your own
-- tables. Nothing here writes, alters, or deletes anything. Run this whole
-- file in the Supabase SQL editor and send the output back — it answers
-- every UNSURE item from supabase/prod-sync/INVENTORY.md.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DEPENDENCY CHECK: does public.is_admin() exist, and is it a real
--    implementation or the reconstructed stub that just raises an
--    exception? PROD_SYNC.sql's ai_usage_log/referrals admin-read policies
--    call this function — if it's missing or still a stub, those two
--    CREATE POLICY statements will fail (safely — the whole script is one
--    transaction and will roll back with nothing partially applied).
-- ----------------------------------------------------------------------------
select
  p.proname as function_name,
  pg_get_functiondef(p.oid) as full_definition,
  case
    when pg_get_functiondef(p.oid) ilike '%raise exception%reconstructed stub%' then 'STUB — will break PROD_SYNC''s admin policies'
    when pg_get_functiondef(p.oid) ilike '%raise exception%' then 'RAISES — investigate before running PROD_SYNC'
    else 'looks real'
  end as verdict
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'is_admin';
-- Expect exactly one row, verdict = 'looks real'. Zero rows means the
-- function doesn't exist at all — same conclusion: do not run PROD_SYNC
-- until this is resolved (either implement is_admin() first, or remove the
-- two admin policies from PROD_SYNC.sql and grant admin read some other way).

-- ----------------------------------------------------------------------------
-- 2. Are decrement_credits / increment_credits real bodies (proving
--    migrations 20260829000003/04/05 are already live in some form), or
--    still raise-exception stubs?
-- ----------------------------------------------------------------------------
select
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  case
    when pg_get_functiondef(p.oid) ilike '%raise exception%reconstructed stub%' then 'STUB — credits are broken on this database'
    else 'looks real'
  end as verdict
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('decrement_credits', 'increment_credits')
order by p.proname;
-- Expect decrement_credits to return boolean (the shortfall-detection
-- version, migration 20260829000005) if the app is working correctly
-- today. If it returns void instead, the shortfall-detection migration was
-- never applied — worth knowing, but out of scope for this sync (that
-- migration touches an EXISTING function on an EXISTING table, so it is
-- not part of PROD_SYNC.sql's "only missing tables" scope).

-- ----------------------------------------------------------------------------
-- 3. Does the signup trigger (on_auth_user_created -> handle_new_user)
--    exist? Every real signup depends on this.
-- ----------------------------------------------------------------------------
select tgname as trigger_name, tgrelid::regclass as table_name, tgenabled as enabled_flag
from pg_trigger
where tgname = 'on_auth_user_created';
-- Expect exactly one row. (This should obviously be true — real users can
-- sign up today — this query is just confirmation for the record.)

-- ----------------------------------------------------------------------------
-- 4. THE RECURSION RISK: what RLS policies currently exist on
--    organization_members? supabase/migrations/20260829000003 defines a
--    policy there that queries organization_members FROM WITHIN its own
--    policy — a classic Postgres RLS infinite-recursion trap — which is
--    exactly the kind of bug your live "fix_rls_infinite_recursion"
--    migration name suggests was already found and fixed with a DIFFERENT
--    (non-recursive) implementation. This is why that whole source file is
--    excluded from PROD_SYNC.sql. Send back what this returns.
-- ----------------------------------------------------------------------------
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'organization_members';

-- ----------------------------------------------------------------------------
-- 5. Full RLS policy inventory for every table PROD_SYNC.sql is about to
--    touch or create — so you (and I, from your reply) can see there is no
--    pre-existing policy of the same name with a DIFFERENT definition that
--    my DROP POLICY IF EXISTS / CREATE POLICY would silently replace.
-- ----------------------------------------------------------------------------
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'form_submissions', 'page_views', 'api_keys', 'processed_webhook_events',
    'ai_usage_log', 'referrals', 'feature_flags', 'subscriptions', 'users'
  )
order by tablename, policyname;
-- Expect ZERO rows for form_submissions, page_views, api_keys,
-- processed_webhook_events, ai_usage_log, referrals, feature_flags (they
-- shouldn't exist yet at all — see query 6). Rows for subscriptions/users
-- are informational only; PROD_SYNC.sql does not touch either table's
-- policies.

-- ----------------------------------------------------------------------------
-- 6. Final pre-flight: do any of the 7 "missing" tables already exist
--    under a different definition than what PROD_SYNC.sql expects? This
--    should return ZERO rows given the facts you provided — if it returns
--    ANY rows, STOP and do not run PROD_SYNC.sql until we reconcile why.
-- ----------------------------------------------------------------------------
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'form_submissions', 'page_views', 'api_keys',
    'processed_webhook_events', 'ai_usage_log', 'referrals', 'feature_flags'
  )
order by table_name, ordinal_position;

-- ----------------------------------------------------------------------------
-- 7. Does subscriptions already have low_credit_alert_sent_at, and does
--    users already have referral_code? (Both are additive ALTERs on
--    EXISTING live tables in PROD_SYNC.sql — IF NOT EXISTS makes them safe
--    either way, but useful to know going in.)
-- ----------------------------------------------------------------------------
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'subscriptions' and column_name = 'low_credit_alert_sent_at')
    or (table_name = 'users' and column_name = 'referral_code')
  );

-- ----------------------------------------------------------------------------
-- 8. Do the two non-idempotent unique constraints from
--    supabase/migrations/20260814000002 already exist? (Not part of
--    PROD_SYNC.sql — informational only, since that file's ALTER TABLE ...
--    ADD CONSTRAINT has no IF NOT EXISTS equivalent in Postgres and would
--    error if re-run against a database that already has them.)
-- ----------------------------------------------------------------------------
select conname, conrelid::regclass as table_name, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in ('deploy_connections_user_provider_key', 'payments_paddle_transaction_id_key');

-- ----------------------------------------------------------------------------
-- 9. Is the `vault` extension/schema present? (Relevant only to whether
--    deploy_token_encrypt/decrypt have a real Vault-backed body or are
--    still stubs — informational, not something PROD_SYNC.sql touches.)
-- ----------------------------------------------------------------------------
select exists (select 1 from pg_namespace where nspname = 'vault') as vault_schema_present;

-- ----------------------------------------------------------------------------
-- 10. Sanity check on the templates table this sync deliberately never
--     touches: row count and a content fingerprint, so we can confirm (not
--     just assume from your description) that the two big seed/regenerate
--     migrations (20260829000002, 20260829000007) are already live and
--     must never be re-run.
-- ----------------------------------------------------------------------------
select
  count(*) as template_row_count,
  count(*) filter (where structure is not null and structure::text <> '{}') as rows_with_real_structure,
  md5(string_agg(id::text, ',' order by id)) as id_set_fingerprint
from public.templates;
-- You said 107 rows live. If this returns something else, say so before I
-- treat those two migrations as already-applied data.
