-- Per-request AI token/cost logging (fix-all.md Phase 7 "AI layer" +
-- Phase 9's docs/UNIT_ECONOMICS.md both need this data source; neither
-- existed before this migration — every AI call was fire-and-forget with
-- no record of tokens spent or estimated cost).
--
-- Written by the app's service-role client only (src/lib/gemini.ts, inside
-- generateWithCache) — never by the browser — so RLS only needs to grant
-- read access; there is deliberately no insert/update/delete policy for
-- "authenticated"/"anon" since the service role bypasses RLS entirely and
-- no other write path should exist.

create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  task text not null,
  provider text not null,
  model text,
  input_tokens integer,
  output_tokens integer,
  -- Estimated from a static, hand-maintained price table (see
  -- src/lib/ai-cost.ts) — provider pricing changes independently of this
  -- schema, so treat this column as an approximation, not a billing record.
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

drop policy if exists "ai_usage_log_select_admin" on public.ai_usage_log;
create policy "ai_usage_log_select_admin"
  on public.ai_usage_log for select
  to authenticated
  using (public.is_admin());
