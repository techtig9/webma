-- Fixes the gap flagged in the Phase 1/3 audit: supabase/migrations/
-- 20260101000000_baseline_reconstructed_schema.sql was reconstructed from
-- generated TypeScript types (which don't encode triggers, function bodies,
-- or RLS policies at all), so a database built purely from this
-- migrations/ directory — the documented, supposedly-authoritative
-- incremental path — would come up broken in three concrete ways this
-- migration fixes. Nothing here is invented: every function body and every
-- policy below is copied verbatim from supabase/schema.sql, which already
-- contains real, working versions of all of it (proven — it's what this
-- repository's own local dev setup is documented to run). This migration
-- makes the migrations/ directory alone reproduce that same working state,
-- which it could not do before. Safe to run whether or not schema.sql has
-- already been applied to a given database: every statement below either
-- uses CREATE OR REPLACE (functions) or is wrapped to tolerate the object
-- already existing (trigger, policies) — same idempotent-safe convention
-- already used elsewhere in this migrations/ directory for enum types.

-- ============================================================================
-- 1. MISSING SIGNUP TRIGGER — the single most severe gap here. Without
--    this, creating an auth.users row (i.e. anyone signing up) never
--    creates the matching public.users / public.subscriptions rows the
--    rest of this app assumes exist for every authenticated user
--    (requireUser, dashboard/layout.tsx, credits.ts, and more all read
--    from these tables). This function/trigger existed only in
--    schema.sql — never in this migrations/ directory — until now.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email);

  insert into public.subscriptions (user_id, plan, status, provider, credits_remaining, credits_allowance, renews_at)
  values (new.id, 'free', 'active', 'none', 3000, 3000, now() + interval '30 days');

  return new;
end;
$$ language plpgsql security definer;

do $$ begin
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 2. STUB FUNCTIONS THAT RAISE EXCEPTIONS — decrement_credits and
--    increment_credits are called by every AI-generation, export, and
--    deploy route (src/lib/credits.ts: spendCredits / refundCredits) and
--    by the low-credit-warning check added in Phase 2. Their stub bodies
--    in the baseline migration (`raise exception ...`) mean every single
--    credit deduction or refund would fail outright on a database built
--    from migrations alone. Restored to their real bodies, copied
--    verbatim from schema.sql (lines 347-365 there).
-- ============================================================================
create or replace function public.decrement_credits(p_user_id uuid, p_amount int)
returns void as $$
begin
  update public.subscriptions
  set credits_remaining = greatest(credits_remaining - p_amount, 0),
      updated_at = now()
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;

create or replace function public.increment_credits(p_user_id uuid, p_amount int)
returns void as $$
begin
  update public.subscriptions
  set credits_remaining = least(credits_remaining + p_amount, credits_allowance),
      updated_at = now()
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 3. MISSING RLS POLICIES — every table below has row level security
--    ENABLED (the baseline migration did that much) but zero policies
--    defined anywhere in this migrations/ directory, meaning every one of
--    these tables is completely inaccessible to the anon/authenticated
--    Supabase client roles on a migrations-only database (fail-closed —
--    not itself an exploitable hole, but it silently breaks any feature
--    that isn't exclusively routed through the service-role client).
--    Policies below are copied verbatim from schema.sql for every table
--    that already has proven ones there; is_admin()/is_org_member() are
--    deliberately NOT used (schema.sql's real policies never call them
--    either — they inline the equivalent `exists (select ... )` check
--    directly), so this migration does not need their bodies, which
--    remain unimplemented stubs (see note at the bottom of this file).
-- ============================================================================
do $$ begin
  create policy "users read own row" on public.users
    for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users update own row" on public.users
    for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins read all users" on public.users
    for select using (
      exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read own subscription" on public.subscriptions
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins read all subscriptions" on public.subscriptions
    for select using (
      exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read own projects" on public.projects
    for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "org members read org projects" on public.projects
    for select using (
      organization_id is not null
      and exists (
        select 1 from public.organization_members m
        where m.organization_id = projects.organization_id and m.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read own project versions" on public.project_versions
    for all using (
      exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read own deployments" on public.deployments
    for all using (
      exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read own payments" on public.payments
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins read all payments" on public.payments
    for select using (
      exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read own ledger" on public.credit_ledger
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "templates are public read" on public.templates
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins read audit log" on public.audit_log
    for select using (
      exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "manage domains on own projects" on public.custom_domains
    for all using (
      exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "members read their orgs" on public.organizations
    for select using (
      exists (
        select 1 from public.organization_members m
        where m.organization_id = id and m.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "owners manage their orgs" on public.organizations
    for update using (owner_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "members read org membership" on public.organization_members
    for select using (
      exists (
        select 1 from public.organization_members m2
        where m2.organization_id = organization_id and m2.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "owners manage org membership" on public.organization_members
    for all using (
      exists (
        select 1 from public.organizations o
        where o.id = organization_id and o.owner_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "manage own deploy connections" on public.deploy_connections
    for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ai_response_cache is deliberately left with RLS enabled and NO policy —
-- matching schema.sql's own explicit documented intent (see that file's
-- comment above its ai_response_cache table): it holds no user-identifying
-- data, only (task, prompt) -> output, and is accessed exclusively through
-- the service-role client (src/lib/gemini.ts). Fail-closed-to-every-other-
-- role is the correct, intentional state here, not a gap.

-- ---------------------------------------------------------------------------
-- Tables added after the baseline migration that have never had ANY policy
-- anywhere in this repository's history (not even in schema.sql, since
-- they were added by later, additive migrations) — written fresh here,
-- following the exact same ownership pattern every other table above
-- already uses, not a new design.
-- ---------------------------------------------------------------------------

do $$ begin
  create policy "manage own assets" on public.assets
    for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users insert own feedback" on public.feedback
    for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users read own feedback" on public.feedback
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
-- No update/delete policy for the authenticated role: feedback status is
-- only ever changed by an admin (/api/admin/update-feedback-status), which
-- runs on the service-role client and bypasses RLS by design, same as
-- every other admin-only write path in this app.

do $$ begin
  create policy "manage own api keys" on public.api_keys
    for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "read own project form submissions" on public.form_submissions
    for select using (
      exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;
-- No insert policy for anon/authenticated: /api/public/forms/submit (the
-- only writer) runs on the service-role client, same as ai_response_cache.

do $$ begin
  create policy "read own project page views" on public.page_views
    for select using (
      exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
    );
exception when duplicate_object then null; end $$;
-- Same reasoning as form_submissions: /api/public/analytics/track is the
-- only writer, and it runs on the service-role client.

-- ============================================================================
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT TOUCH
-- ============================================================================
-- is_admin() and is_org_member() remain unimplemented stubs. Nothing in
-- this app's code or in any policy (here or in schema.sql) calls either —
-- confirmed by grepping this repository's application source and every
-- .sql file in it. They appear to be leftover signatures from an earlier
-- design that used helper-function-style policies before this schema
-- settled on inlining the equivalent `exists (...)` check directly into
-- each policy instead. Safe to leave as-is; implement for real only if
-- something is later written that actually calls them.
--
-- deploy_token_encrypt(p_token) and deploy_token_decrypt(p_secret_id)
-- remain unimplemented stubs — deliberately: they are genuinely
-- security-sensitive (Supabase Vault secret handling), and per this
-- repository's own standing rule, that is not something to reconstruct
-- from a guess. Their real blast radius, precisely: deploy_token_encrypt
-- is never called by any app code at all (grepped, zero matches) — fully
-- dead as far as this codebase is concerned. deploy_token_decrypt IS
-- called, but only as an explicit legacy fallback in
-- src/app/api/deploy/deploy-vercel/route.ts and vercel-status/route.ts,
-- and only when a deploy_connections row has access_token_secret_id set
-- with no access_token_ciphertext — i.e. only for a connection created
-- under an OLDER version of this app that used Supabase Vault, before the
-- current AES-256-GCM app-layer encryption (src/lib/deploy-secrets.ts)
-- existed. Every OAuth callback in this codebase today writes only to the
-- ciphertext columns (confirmed by reading deploy-oauth/*/callback), so on
-- a brand-new install this code path is unreachable — nothing ever sets
-- access_token_secret_id in the first place. It only matters for an
-- existing production database carrying real legacy Vault-based
-- connections, and even there, only if this migration were run against
-- that same live database (which would need its REAL deploy_token_decrypt
-- definition preserved or restored from the live database directly — see
-- docs/DEPLOYMENT_CHECKLIST.md item 2 for the exact query to pull it).
