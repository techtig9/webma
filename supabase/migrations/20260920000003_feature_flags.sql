-- Admin feature flags (fix-all.md Phase 9's admin tools list). Lets an
-- incomplete or risky feature stay hidden behind a flag instead of shipping
-- a button that does nothing (per fix-all.md Phase 8's own instruction) —
-- src/lib/feature-flags.ts is what application code consults; this table
-- and its admin page are how an admin actually flips one.

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

alter table public.feature_flags enable row level security;

-- Every authenticated user can read flags (application code checks these
-- to decide what to render, not just admin tooling) — but only an admin can
-- write, enforced below by never granting authenticated a write policy.
drop policy if exists "feature_flags_select_all" on public.feature_flags;
create policy "feature_flags_select_all"
  on public.feature_flags for select
  to authenticated
  using (true);

-- No insert/update/delete policy for "authenticated" — writes go through
-- src/app/api/admin/feature-flags/route.ts using the service-role client,
-- itself gated by requireAdmin().
