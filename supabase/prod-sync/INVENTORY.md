# Migration inventory & classification

Every file in `supabase/migrations/`, what it creates/alters, and how it's
classified against the live production database (17 tables, RLS on all,
migrations tracked under different, opaque names than this repo's — see
"Why classification isn't by filename" below).

## Classification table

| # | File | Creates/alters | Classification |
|---|---|---|---|
| 1 | `20260101000000_baseline_reconstructed_schema.sql` | 16 tables (users, organizations, organization_members, templates, projects, project_versions, assets, custom_domains, deploy_connections, deployments, subscriptions, payments, credit_ledger, ai_response_cache, feedback, audit_log), 6 enums, 8 indexes, RLS enabled (no policies), 6 stub functions | **LIKELY APPLIED** — every table matches a live table name; the app works today, so this structure (or its real equivalent) is live |
| 2 | `20260813_webma_production_editor_deployment.sql` | `deployments.provider_deployment_id` column, 2 indexes | **LIKELY APPLIED** — additive column on a live table |
| 3 | `20260813_webma_safe_additive_upgrade.sql` | `projects.archived`, `project_versions.pages`, 4 `deploy_connections` columns, 3 indexes | **LIKELY APPLIED** |
| 4 | `20260814000000_form_submissions.sql` | `form_submissions` table, 1 index, RLS enabled (no policy in this file) | **MISSING** |
| 5 | `20260814000001_page_views.sql` | `page_views` table, 1 index, RLS enabled (no policy in this file) | **MISSING** |
| 6 | `20260814000002_missing_unique_constraints.sql` | `deploy_connections(user_id, provider)` and `payments(paddle_transaction_id)` UNIQUE constraints (no `IF NOT EXISTS` — Postgres has no such clause for `ADD CONSTRAINT`) | **LIKELY APPLIED** — both tables live, and the app's own upsert-on-conflict logic (Vercel OAuth reconnect, Paddle webhook retries) already depends on these existing. **CHECK_LIVE.sql query 8** confirms directly since this file can't be safely re-run to find out |
| 7 | `20260814000003_api_keys.sql` | `api_keys` table, 1 index, RLS enabled (no policy in this file) | **MISSING** |
| 8 | `20260829000000_webhook_idempotency_and_credit_alerts.sql` | `processed_webhook_events` table (RLS **not** enabled in the source file — a gap vs. the identical `ai_response_cache` pattern), 1 index, `subscriptions.low_credit_alert_sent_at` column | **MISSING** |
| 9 | `20260829000001_template_marketplace_and_asset_alt_text.sql` | 6 `templates` columns + 4 indexes, `template_favorites` table + index + RLS + policy, `assets.alt_text` column, `increment_template_use_count()` function | **LIKELY APPLIED** — matches live migration name `template_marketplace_schema_and_asset_alt_text (Aug 30)` exactly; `template_favorites` is a live table; live `templates` has 107 rows (this migration's columns are what the seed data in file #10 populates) |
| 10 | `20260829000002_seed_template_library.sql` | **`DELETE FROM templates;`** then bulk-inserts 107 template rows | **LIKELY APPLIED — DATA, and destructive.** Row count (107) matches your live count exactly. **NEVER re-run this file against production** — the leading `DELETE` would wipe every live template (and anything an admin has since edited via `/admin/templates`) before reinserting this file's fixed snapshot. Not part of PROD_SYNC.sql for this reason, independent of its LIKELY APPLIED status |
| 11 | `20260829000003_restore_missing_trigger_functions_and_rls.sql` | Real bodies for `handle_new_user()` + `on_auth_user_created` trigger, real bodies for `decrement_credits`/`increment_credits` (pre-shortfall-detection version), ~20 RLS policies across users/subscriptions/projects/project_versions/deployments/payments/credit_ledger/templates/audit_log/custom_domains/organizations/**organization_members**/deploy_connections/assets/feedback/api_keys/form_submissions/page_views | **UNSURE** — see "Why this file is excluded" below. Not shipped in PROD_SYNC.sql |
| 12 | `20260829000004_implement_admin_org_deploy_token_functions_and_lock_down_rpc_grants.sql` | Real `is_admin()`/`is_org_member()` bodies, conditional real Vault-backed `deploy_token_encrypt`/`decrypt`, EXECUTE revoke/grant on 6 functions, `search_path` pin on 4 functions | **LIKELY APPLIED** — matches live migration name `lock_down_credit_function_grants` exactly |
| 13 | `20260829000005_atomic_credit_shortfall_detection.sql` | Drops + recreates `decrement_credits` returning `boolean` instead of `void`, EXECUTE revoke/grant, `search_path` pin | **LIKELY APPLIED** — matches live migration name `decrement_credits_shortfall_detection` exactly |
| 14 | `20260829000006_admin_template_management.sql` | `templates.is_active` column, 1 partial index | **LIKELY APPLIED** — matches live migration name `admin_template_management (Sep 17)` exactly |
| 15 | `20260829000007_template_design_diversity_regeneration.sql` | Bulk `UPDATE templates SET structure = ...` for ~107 rows by id | **LIKELY APPLIED — DATA.** Matches your account of this branch's own history (templates were regenerated and pushed to production in verified batches). **Do not re-run**: it would silently overwrite `structure` for every live template, including any since-edited by an admin. Not part of PROD_SYNC.sql |
| 16 | `20260920000000_ai_usage_log.sql` | `ai_usage_log` table, 2 indexes, RLS + 2 policies (one depends on `is_admin()`) | **MISSING** |
| 17 | `20260920000002_referral_program.sql` | `users.referral_code` column, `referrals` table + index + RLS + 2 policies (one depends on `is_admin()`), `grant_bonus_credits()` function | **MISSING** |
| 18 | `20260920000003_feature_flags.sql` | `feature_flags` table, RLS + 1 policy | **MISSING** |

## Why classification isn't by filename

The live database's own migration history (the names you provided —
`encrypt_deploy_connection_tokens`, `add_feedback_table`,
`fix_rls_infinite_recursion`, `add_project_archive_and_fix_ledger_fk`,
`add_assets_storage`, `add_project_pages`, `lock_down_credit_function_grants`,
`decrement_credits_shortfall_detection`,
`template_marketplace_schema_and_asset_alt_text`,
`admin_template_management`) uses different names than most files in this
repo's `supabase/migrations/` directory. This repo's own baseline migration
says why: the original base schema was never captured in version control,
so `20260101000000_baseline_reconstructed_schema.sql` was reconstructed
from `database.types.ts` after the fact, and everything before Aug 29 in
this directory is a best-effort reconstruction, not a literal replay of
what actually ran against production. Classification here is therefore by
**function** (does this file create an object the live database already
has, under any name) — matched against live migration names where a name
plainly corresponds (`admin_template_management`,
`lock_down_credit_function_grants`,
`decrement_credits_shortfall_detection`,
`template_marketplace_schema_and_asset_alt_text` all match exactly), and
against the live table/row-count facts you gave otherwise.

## Why file #11 (`20260829000003`) is excluded, in detail

This file creates zero new tables (not "MISSING" by that test), but it
also isn't cleanly "LIKELY APPLIED" the way files #12–14 are, for two
concrete reasons:

1. **Your live migration name `fix_rls_infinite_recursion` strongly
   suggests a bug this exact file still has.** Its `organization_members`
   policy —
   ```sql
   create policy "members read org membership" on public.organization_members
     for select using (
       exists (
         select 1 from public.organization_members m2
         where m2.organization_id = organization_id and m2.user_id = auth.uid()
       )
     );
   ```
   queries `organization_members` from *within* a policy defined *on*
   `organization_members` — a textbook Postgres RLS infinite-recursion
   trap. If your live database already has a working, non-recursive
   version of this policy (under a different name, since Postgres policy
   names aren't necessarily consistent between an ad-hoc fix and this
   repo's reconstruction), running this file would try to add a *second*,
   recursive policy alongside it — and Postgres evaluates every applicable
   policy for a role, so adding a broken one back in can reintroduce the
   exact bug your migration name says was already fixed, even though it
   wouldn't overwrite the working one.
2. Its other ~19 policies target tables that already work today in
   production (users can log in, credits deduct, templates are readable),
   so their *effect* is almost certainly already live — but under
   potentially different policy names, which the safe
   `do $$ ... exception when duplicate_object then null $$` guard would
   not detect as "already equivalent," only as "already present under this
   exact name."

**CHECK_LIVE.sql query 4** asks you to send back `organization_members`'s
actual current policies so this can be resolved with certainty rather than
left as a guess. Nothing in PROD_SYNC.sql depends on this file.

## Cross-check: every table/RPC/bucket the app code references

Grepped `src/` for every `.from("...")`, `.rpc("...")`, and
`.storage.from("...")` call. Every single one resolves to an object
defined somewhere in `supabase/migrations/` — **zero orphaned references**
(no table or function the code calls that no migration anywhere creates):

- **24 tables referenced in code** = exactly the 16 baseline + `form_submissions` + `page_views` + `api_keys` + `processed_webhook_events` + `template_favorites` + `ai_usage_log` + `referrals` + `feature_flags`.
- **5 RPCs referenced in code** (`decrement_credits`, `increment_credits`, `deploy_token_decrypt`, `grant_bonus_credits`, `increment_template_use_count`) all have a defining migration.
- **1 storage bucket** (`assets`) — not created by any migration (Supabase
  Storage buckets aren't SQL objects); this matches your live
  `add_assets_storage` migration and the README's documented manual
  "create the bucket in the dashboard" step.

## Graceful-degradation check for every MISSING table

Confirmed by reading the actual route/lib code, not assumed:

| Table | Feature | Behavior if table is absent |
|---|---|---|
| `form_submissions` | Public form-submit endpoint | `.insert()` error is checked → clean `500 {"message":"Couldn't record that submission."}`, no crash |
| `form_submissions` | Project owner's submissions inbox | `.select()` error is checked → clean `500 {"message": <db error>}`, no crash |
| `page_views` | Public analytics tracking | Same pattern — error checked, clean failure |
| `page_views` | Project analytics dashboard | Same pattern — error checked, clean failure |
| `api_keys` | API key management UI | Error checked on every route → clean 500s |
| `api_keys` | Bearer-token auth (`requireApiKey`) | No error check on the lookup, but a missing/errored row just falls through to the existing "Invalid API key" 401 — no crash, just an indistinguishable-from-wrong-key response |
| `processed_webhook_events` | Paddle webhook idempotency | **Explicitly designed for this**: any insert error other than a duplicate-key violation is logged and processing continues without idempotency protection — never blocks or crashes webhook handling |
| `ai_usage_log` | Per-request cost logging | Fire-and-forget `.then(({error}) => reportError(...))` — never awaited, never blocks the AI response, never throws |
| `referrals` / `users.referral_code` | Referral bonus redemption (`redeemReferral`) | `.insert()` error is checked and returns cleanly — signup is never blocked by a referral failure |
| `referrals` / `users.referral_code` | Referral stats card (`getReferralStats`) | **Found a real gap during this audit**: the original code threw an uncaught exception if `users.referral_code` was missing (an unchecked initial `SELECT` followed by an `UPDATE` whose error didn't match the code's own "duplicate key" check, so it fell through to a bare `throw`). **Fixed** in this branch (`src/lib/referrals.ts`): wrapped in try/catch, matching the same fail-safe convention `feature-flags.ts` already uses, returning a zeroed stats object instead. The dashboard card (`ReferralCard.tsx`) already handled a failed fetch gracefully either way ("Couldn't load your referral link."), so this was never user-visible, but it removed an unhandled-exception log entry on every dashboard load without the migration applied |
| `feature_flags` | Flag checks (`isFeatureEnabled`) | Already wrapped in try/catch, returns `false` — this was already the correct pattern before this audit |
| `feature_flags` | Admin flag management UI | Error checked on every route → clean 500s |
