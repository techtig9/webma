-- Phase 2 (SaaS operations hardening): webhook idempotency + credit-low alert dedup.
--
-- 1. processed_webhook_events — Paddle explicitly documents retrying a webhook
--    delivery on any non-2xx response, and does not guarantee exactly-once
--    delivery even on success. Without recording which event ids have already
--    been processed, a retried delivery re-runs the same subscription/credit/
--    payment-record logic a second time — see billing/paddle-webhook/route.ts,
--    which now checks this table before doing any work and skips (still
--    returning 200, so Paddle doesn't keep retrying) on a duplicate.
--    No RLS policies needed: this table is never queried by the anon/
--    authenticated client roles, only by the service-role client from the
--    webhook route itself, same pattern as ai_response_cache.
create table if not exists public.processed_webhook_events (
  id text primary key,
  source text not null,
  processed_at timestamptz not null default now()
);

create index if not exists processed_webhook_events_source_idx on public.processed_webhook_events (source, processed_at desc);

-- 2. low_credit_alert_sent_at — lets spendCredits() (src/lib/credits.ts) send
--    the "you're running low on credits" warning email at most once per
--    billing cycle instead of on every single subsequent request once a user
--    dips under the threshold. Cleared back to null whenever a real renewal
--    resets credits_remaining (see the paddle webhook's isNewCycle branch),
--    so the warning can fire again next cycle if the user runs low again.
alter table public.subscriptions
  add column if not exists low_credit_alert_sent_at timestamptz;
