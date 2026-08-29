-- ============================================================================
-- Close the "silent" half of the disclosed credit-deduction race.
--
-- Documented in src/lib/credits.ts (canUseFeature's docstring): canUseFeature
-- (the gate check, done before any paid AI work starts) and spendCredits
-- (the actual deduction, done only after the work succeeds) are two separate
-- steps. Two different-action requests from the same user, fired close
-- together, can both read a balance that individually covers their own cost
-- but not their combined sum, both pass the gate, both complete their real
-- work, and both then call decrement_credits — whose old body
-- (`greatest(credits_remaining - p_amount, 0)`) ALWAYS "succeeds" by
-- clamping at zero, so the shortfall was completely invisible: no error, no
-- log, nothing to reconcile against.
--
-- A full fix (reserve the cost atomically at gate time, refund on any
-- later failure) would change the success/failure control flow of all 7
-- credit-costing routes and needs live traffic to verify the refund path
-- actually fires on a real failure — out of proportion here, and Phase 5's
-- acquireLock/releaseLock already closes the much more common case (a
-- double-click or retry of the SAME action). What's fixed here is the part
-- that's cheap to fix correctly and safe to verify without touching route
-- control flow: decrement_credits now reports whether the deduction it just
-- performed was fully covered by the balance at that moment, so a shortfall
-- becomes an observable, testable, alertable event instead of a silent one.
-- ============================================================================

-- CREATE OR REPLACE cannot change a function's return type, so the old
-- void-returning version must be dropped first. Its only caller in this
-- codebase is spendCredits() in src/lib/credits.ts, updated in the same
-- change to read the new boolean instead of blind-firing the RPC.
drop function if exists public.decrement_credits(uuid, integer);

create function public.decrement_credits(p_user_id uuid, p_amount int)
returns boolean as $$
declare
  v_before int;
  v_fully_covered boolean;
begin
  -- Explicit row lock before reading, so the "was this covered" check and
  -- the write below are atomic with respect to a second concurrent call for
  -- the same user — the second call's SELECT ... FOR UPDATE blocks until
  -- the first's UPDATE (which implicitly held the same lock) commits, then
  -- reads the already-decremented balance rather than a stale one.
  select credits_remaining into v_before
  from public.subscriptions
  where user_id = p_user_id
  for update;

  v_fully_covered := coalesce(v_before, 0) >= p_amount;

  update public.subscriptions
  set credits_remaining = greatest(credits_remaining - p_amount, 0),
      updated_at = now()
  where user_id = p_user_id;

  return v_fully_covered;
end;
$$ language plpgsql security definer;

-- Same grants as every other security-definer credit function (migration
-- 20260829000004): only the service-role client (src/lib/credits.ts) ever
-- calls this, with the amount computed server-side, never client-supplied.
revoke execute on function public.decrement_credits(uuid, integer) from public, anon, authenticated;
grant execute on function public.decrement_credits(uuid, integer) to service_role;
alter function public.decrement_credits(uuid, integer) set search_path = public;
