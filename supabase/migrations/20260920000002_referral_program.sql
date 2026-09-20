-- Referral program (fix-all.md Phase 6 "Referral program: invite link with
-- credit reward, abuse-limited"). referral_code is generated lazily by the
-- app (src/lib/referrals.ts) on first request, not backfilled here, so
-- existing users get one the first time they open the referrals card.

alter table public.users add column if not exists referral_code text unique;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  -- unique: a given user can be credited as "referred" at most once ever,
  -- which is what makes redeemReferral() safe to call from both the
  -- immediate-session signup path AND the email-confirmation callback
  -- without a separate idempotency check — whichever fires first wins,
  -- the second insert simply violates this constraint and no-ops.
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

drop policy if exists "referrals_select_admin" on public.referrals;
create policy "referrals_select_admin"
  on public.referrals for select
  to authenticated
  using (public.is_admin());

-- No RLS policy grants insert/update/delete to "authenticated" — every write
-- goes through src/lib/referrals.ts using the service-role client.

-- Deliberately NOT reusing increment_credits(): that function clamps to
-- credits_allowance (least(credits_remaining + p_amount, credits_allowance)),
-- which is correct for restoring a credit that was already spent this cycle
-- but means it's a no-op for a brand-new signup — free-plan users start at
-- credits_remaining == credits_allowance, so a "signup bonus" would clamp
-- straight back down to the same number. A referral bonus is a genuine
-- additive top-up beyond the plan's normal ceiling, so this is a separate,
-- uncapped function.
create or replace function public.grant_bonus_credits(p_user_id uuid, p_amount integer)
returns void language plpgsql security definer as $$
begin
  update public.subscriptions
  set credits_remaining = credits_remaining + p_amount,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke execute on function public.grant_bonus_credits(uuid, integer) from public, anon, authenticated;
grant execute on function public.grant_bonus_credits(uuid, integer) to service_role;
