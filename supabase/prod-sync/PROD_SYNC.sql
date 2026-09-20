-- ============================================================================
-- PROD_SYNC.sql — webma production database sync
-- ============================================================================
-- Applies ONLY the migrations classified MISSING against the live database
-- (see supabase/prod-sync/INVENTORY.md for the full classification of every
-- file in supabase/migrations/). Every statement below is additive:
--
--   - New tables only (no ALTER of an existing live table's columns except
--     one new nullable/defaulted column on `subscriptions`, guarded with
--     IF NOT EXISTS).
--   - No DROP TABLE, TRUNCATE, DELETE, or destructive ALTER anywhere.
--   - Idempotent throughout: IF NOT EXISTS on every CREATE TABLE/INDEX/
--     COLUMN, DROP POLICY IF EXISTS before every CREATE POLICY, CREATE OR
--     REPLACE for the one new function.
--   - RLS is enabled on every new table. Three tables (form_submissions,
--     page_views, api_keys) get real ownership policies, carried over from
--     supabase/migrations/20260829000003 (NOT otherwise applied by this
--     file — see INVENTORY.md for why that migration as a whole is
--     excluded). processed_webhook_events deliberately gets RLS enabled
--     with ZERO policies — same documented pattern this codebase already
--     uses for ai_response_cache: a table written and read exclusively by
--     the service-role client (which bypasses RLS entirely), so enabling
--     RLS with no policies is a correct fail-closed default for every
--     other role, not an oversight.
--   - The one new SECURITY DEFINER function (grant_bonus_credits) pins
--     search_path and revokes EXECUTE from anon/authenticated/public,
--     matching the pattern already established in
--     supabase/migrations/20260829000004.
--
-- DEPENDENCY: two policies below (on ai_usage_log and referrals) call
-- public.is_admin(). Per INVENTORY.md, is_admin() is classified LIKELY
-- APPLIED (matches the live "lock_down_credit_function_grants" migration)
-- — confirm this with CHECK_LIVE.sql's query #1 BEFORE running this file.
-- If is_admin() does not exist on the live database, this script will fail
-- at those two CREATE POLICY statements and roll back entirely (it is one
-- transaction) — nothing partial will be left behind either way.
--
-- Run CHECK_LIVE.sql first. Then run this file. Then see README.md's
-- verification queries. Never run this file more than once per session
-- without reviewing its output — it IS safe to re-run (that's the whole
-- point of the idempotency rules above, and it's dry-run-tested twice in a
-- row in this branch's own verification — see FIXES.md / the PR
-- description), but there is no reason to run it twice in the same sitting.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SOURCE: supabase/migrations/20260814000000_form_submissions.sql
-- Native form builder: stores submissions from contact/lead forms on
-- generated sites. Written by the service-role client only
-- (/api/public/forms/submit); read by the owning project's user via
-- /api/projects/submissions (also service-role, ownership checked in
-- application code) — the policy below is a defense-in-depth backstop, not
-- the only ownership check in the system.
-- ============================================================================

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  page_slug text not null default 'index',
  form_name text not null default 'contact',
  data jsonb not null,
  submitter_ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists form_submissions_project_id_idx on public.form_submissions (project_id, created_at desc);

alter table public.form_submissions enable row level security;

-- Carried from supabase/migrations/20260829000003 (see file header for why
-- that migration is not applied wholesale). No insert policy for
-- anon/authenticated: the only writer (/api/public/forms/submit) runs on
-- the service-role client, which bypasses RLS.
drop policy if exists "read own project form submissions" on public.form_submissions;
create policy "read own project form submissions" on public.form_submissions
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ============================================================================
-- SOURCE: supabase/migrations/20260814000001_page_views.sql
-- Basic analytics: pageviews for published/exported/deployed sites, tracked
-- via a script injected into every generated site's root layout. Written by
-- the service-role client only (/api/public/analytics/track).
-- ============================================================================

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  path text not null default '/',
  referrer text,
  visitor_hash text,
  created_at timestamptz not null default now()
);

create index if not exists page_views_project_id_idx on public.page_views (project_id, created_at desc);

alter table public.page_views enable row level security;

-- Carried from supabase/migrations/20260829000003 — same reasoning as
-- form_submissions above.
drop policy if exists "read own project page views" on public.page_views;
create policy "read own project page views" on public.page_views
  for select using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ============================================================================
-- SOURCE: supabase/migrations/20260814000003_api_keys.sql
-- Public API v1: read-only project access via a webma-issued API key,
-- authenticated with Authorization: Bearer <key> instead of a session
-- cookie (src/lib/auth.ts's requireApiKey).
-- ============================================================================

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_user_id_idx on public.api_keys (user_id);

alter table public.api_keys enable row level security;

-- Carried from supabase/migrations/20260829000003 — the owning user manages
-- their own keys directly (create/list/revoke); the lookup-by-hash the app
-- does to authenticate a bearer token runs on the service-role client.
drop policy if exists "manage own api keys" on public.api_keys;
create policy "manage own api keys" on public.api_keys
  for all using (auth.uid() = user_id);

-- ============================================================================
-- SOURCE: supabase/migrations/20260829000000_webhook_idempotency_and_credit_alerts.sql
-- 1. processed_webhook_events — Paddle explicitly documents retrying a
--    webhook delivery on any non-2xx response, and does not guarantee
--    exactly-once delivery even on success. src/app/api/billing/
--    paddle-webhook/route.ts checks this table before doing any work.
-- 2. low_credit_alert_sent_at — lets spendCredits() send the "you're
--    running low on credits" warning email at most once per billing cycle.
-- ============================================================================

create table if not exists public.processed_webhook_events (
  id text primary key,
  source text not null,
  processed_at timestamptz not null default now()
);

create index if not exists processed_webhook_events_source_idx on public.processed_webhook_events (source, processed_at desc);

-- Enabled with deliberately ZERO policies — see this file's header comment.
-- The original source migration omitted this ENABLE statement entirely
-- (an inconsistency with this table's own documented intent, and with the
-- identical ai_response_cache pattern elsewhere in this schema); added here
-- so a new install of this table is fail-closed to every role except
-- service_role from the moment it's created, exactly like ai_response_cache.
alter table public.processed_webhook_events enable row level security;

alter table public.subscriptions
  add column if not exists low_credit_alert_sent_at timestamptz;

-- ============================================================================
-- SOURCE: supabase/migrations/20260920000000_ai_usage_log.sql
-- Per-request AI token/cost logging. Written by the service-role client
-- only (src/lib/gemini.ts); read by the owning user and by admins.
-- ============================================================================

create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  task text not null,
  provider text not null,
  model text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 6),
  cache_hit boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_log_user_id_created_at_idx
  on public.ai_usage_log (user_id, created_at desc);

create index if not exists ai_usage_log_created_at_idx
  on public.ai_usage_log (created_at desc);

alter table public.ai_usage_log enable row level security;

drop policy if exists "ai_usage_log_select_own" on public.ai_usage_log;
create policy "ai_usage_log_select_own"
  on public.ai_usage_log for select
  to authenticated
  using (user_id = auth.uid());

-- Depends on public.is_admin() already existing on the live database —
-- see this file's header DEPENDENCY note and CHECK_LIVE.sql query #1.
drop policy if exists "ai_usage_log_select_admin" on public.ai_usage_log;
create policy "ai_usage_log_select_admin"
  on public.ai_usage_log for select
  to authenticated
  using (public.is_admin());

-- ============================================================================
-- SOURCE: supabase/migrations/20260920000002_referral_program.sql
-- referral_code is generated lazily by the app (src/lib/referrals.ts) on
-- first request, not backfilled here — existing users get one the first
-- time they open the referrals card.
-- ============================================================================

alter table public.users add column if not exists referral_code text unique;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid not null unique references public.users(id) on delete cascade,
  credited boolean not null default false,
  credits_granted integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists referrals_referrer_id_idx on public.referrals (referrer_id, created_at);

alter table public.referrals enable row level security;

drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own"
  on public.referrals for select
  to authenticated
  using (referrer_id = auth.uid());

-- Depends on public.is_admin() already existing on the live database —
-- see this file's header DEPENDENCY note and CHECK_LIVE.sql query #1.
drop policy if exists "referrals_select_admin" on public.referrals;
create policy "referrals_select_admin"
  on public.referrals for select
  to authenticated
  using (public.is_admin());

-- No RLS policy grants insert/update/delete to "authenticated" — every
-- write goes through src/lib/referrals.ts using the service-role client.

-- Deliberately NOT reusing increment_credits(): that function clamps to
-- credits_allowance, which would no-op a brand-new signup bonus (free-plan
-- users start at credits_remaining == credits_allowance). This is a
-- genuine additive top-up beyond the plan's normal ceiling.
--
-- search_path pinned and EXECUTE revoked from anon/public/authenticated —
-- the source migration omitted both (a gap vs. the pattern established in
-- 20260829000004 for every other credit-mutating function); fixed here.
create or replace function public.grant_bonus_credits(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subscriptions
  set credits_remaining = credits_remaining + p_amount,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke execute on function public.grant_bonus_credits(uuid, integer) from public, anon, authenticated;
grant execute on function public.grant_bonus_credits(uuid, integer) to service_role;

-- ============================================================================
-- SOURCE: supabase/migrations/20260920000003_feature_flags.sql
-- Admin feature flags. Every authenticated user can read flags (application
-- code checks these to decide what to render); only an admin can write,
-- enforced by never granting authenticated a write policy — writes go
-- through /api/admin/feature-flags using the service-role client, itself
-- gated by requireAdmin().
-- ============================================================================

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

alter table public.feature_flags enable row level security;

drop policy if exists "feature_flags_select_all" on public.feature_flags;
create policy "feature_flags_select_all"
  on public.feature_flags for select
  to authenticated
  using (true);

COMMIT;
