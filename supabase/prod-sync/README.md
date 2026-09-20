# Production database sync — how to run this

This directory brings the live webma Supabase database up to date with
what `supabase/migrations/` expects, for exactly the tables that are
genuinely missing. **Nothing here was run against your live database by
Claude** — no live database credentials exist in this environment, and
nothing in this PR deploys, merges, or changes any environment variable.
Everything in this directory is inert until you run it yourself.

See [`INVENTORY.md`](./INVENTORY.md) for the full file-by-file
classification (MISSING / LIKELY APPLIED / UNSURE) this sync is based on.

## Exact order

### 1. Run `CHECK_LIVE.sql` first

Open the Supabase SQL editor for the production project, paste in the
entire contents of [`CHECK_LIVE.sql`](./CHECK_LIVE.sql), and run it. It is
**read-only** — every statement is a `select` against system catalogs or
your own tables; nothing writes, alters, or deletes anything.

Send the output back. In particular:

- **Query 1** must show `public.is_admin()` as a real (non-stub)
  function — `PROD_SYNC.sql`'s two admin-read policies depend on it. If
  it's missing or still a stub, say so before running `PROD_SYNC.sql` —
  those two `CREATE POLICY` statements would otherwise fail (safely; the
  whole file is one transaction, so it would roll back with nothing
  partially applied, but there's no reason to hit that if we can check
  first).
- **Query 4** shows `organization_members`'s actual current RLS
  policies — this resolves the one real UNSURE item from this audit
  (a likely-already-fixed infinite-recursion policy in
  `supabase/migrations/20260829000003`, which is why that file is not
  part of this sync at all — see `INVENTORY.md`'s "Why file #11 is
  excluded" section for the full reasoning).
- **Query 6** should return **zero rows** — confirming none of the 7
  tables this sync creates already exist under a conflicting definition.
  If it returns anything, stop and don't run `PROD_SYNC.sql` yet.
- **Query 10** should show `template_row_count = 107`, confirming (not
  just assuming) that the two big template seed/regenerate migrations are
  already live and must never be re-run.

### 2. Run `PROD_SYNC.sql`

Once query 1 and query 6 above check out, paste the entire contents of
[`PROD_SYNC.sql`](./PROD_SYNC.sql) into the SQL editor and run it. It is
wrapped in a single `BEGIN`/`COMMIT` — either everything in it applies, or
(on any error) nothing does.

It creates exactly 7 things, each labeled with its source file inside the
script:

1. `form_submissions` table + RLS policy
2. `page_views` table + RLS policy
3. `api_keys` table + RLS policy
4. `processed_webhook_events` table (RLS enabled, no policy — service-role
   only, same as `ai_response_cache`) + `subscriptions.low_credit_alert_sent_at`
5. `ai_usage_log` table + 2 RLS policies
6. `users.referral_code` column + `referrals` table + 2 RLS policies +
   `grant_bonus_credits()` function
7. `feature_flags` table + RLS policy

It is safe to run more than once (every statement uses `IF NOT EXISTS`,
`CREATE OR REPLACE`, or `DROP POLICY IF EXISTS` first) — this was verified
by applying it twice in a row in a throwaway local Postgres database, both
runs succeeding identically. See the PR description for that verification
in full.

### 3. Verify

Run these against the live database after step 2 (also read-only):

```sql
-- All 7 new tables should now exist, with RLS enabled.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'form_submissions', 'page_views', 'api_keys', 'processed_webhook_events',
    'ai_usage_log', 'referrals', 'feature_flags'
  )
order by tablename;
-- Expect 7 rows, rowsecurity = true on every one.

-- Every new table's policies are in place (processed_webhook_events
-- intentionally has none — see PROD_SYNC.sql's header comment).
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'form_submissions', 'page_views', 'api_keys',
    'ai_usage_log', 'referrals', 'feature_flags'
  )
order by tablename, policyname;

-- The two new/altered columns exist.
select table_name, column_name from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'subscriptions' and column_name = 'low_credit_alert_sent_at')
    or (table_name = 'users' and column_name = 'referral_code')
  );

-- The new function exists, is SECURITY DEFINER, and only service_role can call it.
select p.proname, p.prosecdef, r.rolname as grantee
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join information_schema.routine_privileges rp on rp.routine_name = p.proname
join pg_roles r on r.rolname = rp.grantee
where n.nspname = 'public' and p.proname = 'grant_bonus_credits';
-- Expect exactly one grantee row: service_role.

-- Confirm templates was NOT touched by this sync (still 107 rows).
select count(*) from public.templates;
```

Then spot-check the features themselves: the contact form on any generated
site (`form_submissions`), a project's Analytics tab (`page_views`), API
key creation in dashboard settings (`api_keys`), a Paddle webhook retry
(`processed_webhook_events` — check Paddle's dashboard for a recent retry
if one exists, or just trust the code path since it degrades safely
either way), the admin AI usage page (`ai_usage_log`), the "Invite
friends" dashboard card (`referrals`), and the admin feature flags page
(`feature_flags`).

## If something needs to be undone

[`ROLLBACK.sql`](./ROLLBACK.sql) drops exactly the objects `PROD_SYNC.sql`
creates, in reverse order. **It is not run as part of this process** — it
exists as a reviewed, prepared escape hatch only. Read its header comment
before ever running it: dropping these tables destroys any real rows
written into them after the sync (real form submissions, page views, API
keys, referral records, AI usage logs, feature flag settings).

## What this sync deliberately does not touch

- `supabase/migrations/20260829000002` and `...000007` (the two big
  template seed/regeneration files) — both are DATA migrations that
  already match your live `templates` table (107 rows) and must never be
  re-run; the first even leads with `DELETE FROM templates`.
- `supabase/migrations/20260829000003` — see `INVENTORY.md` for the full
  reasoning (an org-membership RLS recursion risk plus policies on
  already-live tables under uncertain live naming).
- `supabase/migrations/20260814000002`'s two `UNIQUE` constraints — a
  non-idempotent `ALTER TABLE ... ADD CONSTRAINT` (Postgres has no
  `IF NOT EXISTS` for this) on tables that almost certainly already have
  them; `CHECK_LIVE.sql` query 8 confirms directly rather than guessing.
- Any environment variable, Vercel/Supabase/Paddle dashboard setting, or
  deployment. This sync is exclusively the 7 SQL objects listed above.
