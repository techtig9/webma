-- ============================================================================
-- ROLLBACK.sql — undoes PROD_SYNC.sql, and ONLY PROD_SYNC.sql.
-- ============================================================================
-- DO NOT RUN THIS as part of a normal sync. It exists purely as a prepared,
-- reviewed escape hatch in case PROD_SYNC.sql needs to be undone after the
-- fact (e.g. a policy turns out wrong, or a decision changes). It is safe
-- in the sense that it drops ONLY objects PROD_SYNC.sql itself created —
-- nothing in supabase/migrations/ that predates this sync, and no data
-- from any table that existed before PROD_SYNC.sql ran.
--
-- Dropping form_submissions/page_views/api_keys/processed_webhook_events/
-- ai_usage_log/referrals/feature_flags DOES destroy any rows that were
-- written into them after PROD_SYNC.sql ran (real form submissions, real
-- page views, real API keys, real referral records, real AI usage logs,
-- any feature flags an admin set). Confirm that's actually what you want,
-- and consider exporting those tables first, before running this.
--
-- Order is the reverse of PROD_SYNC.sql, so dependencies (foreign keys,
-- the referral bonus function) drop cleanly.
-- ============================================================================

BEGIN;

-- feature_flags
drop policy if exists "feature_flags_select_all" on public.feature_flags;
drop table if exists public.feature_flags;

-- referral_program
drop function if exists public.grant_bonus_credits(uuid, integer);
drop policy if exists "referrals_select_admin" on public.referrals;
drop policy if exists "referrals_select_own" on public.referrals;
drop table if exists public.referrals;
alter table public.users drop column if exists referral_code;

-- ai_usage_log
drop policy if exists "ai_usage_log_select_admin" on public.ai_usage_log;
drop policy if exists "ai_usage_log_select_own" on public.ai_usage_log;
drop table if exists public.ai_usage_log;

-- webhook_idempotency_and_credit_alerts
alter table public.subscriptions drop column if exists low_credit_alert_sent_at;
drop table if exists public.processed_webhook_events;

-- api_keys
drop policy if exists "manage own api keys" on public.api_keys;
drop table if exists public.api_keys;

-- page_views
drop policy if exists "read own project page views" on public.page_views;
drop table if exists public.page_views;

-- form_submissions
drop policy if exists "read own project form submissions" on public.form_submissions;
drop table if exists public.form_submissions;

COMMIT;
