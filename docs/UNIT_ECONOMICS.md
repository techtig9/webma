# Unit economics

How to compute webma's actual AI cost per active user against each plan's
price, using the `ai_usage_log` table (added in
`supabase/migrations/20260920000000_ai_usage_log.sql` — see `FIXES.md` /
`AUDIT.md` on `release/growth`). This table did not exist before that
migration, so there is no historical usage data yet — this document gives
the query to run once real usage accumulates, plus an illustrative
back-of-envelope estimate based on known per-call token costs, so the
question can be sanity-checked today rather than only after the fact.

## 1. The query

Run this against the production database (Supabase SQL editor, or `psql`)
once `ai_usage_log` has at least a few weeks of real traffic:

```sql
with monthly_cost as (
  select
    u.user_id,
    date_trunc('month', u.created_at) as month,
    sum(coalesce(u.estimated_cost_usd, 0)) as ai_cost_usd,
    count(*) as ai_calls
  from ai_usage_log u
  where u.user_id is not null
  group by 1, 2
),
plan as (
  select s.user_id, s.plan, s.status
  from subscriptions s
  where s.status = 'active'
)
select
  p.plan,
  count(distinct mc.user_id) as active_users,
  round(avg(mc.ai_cost_usd)::numeric, 4) as avg_ai_cost_usd_per_user,
  round(max(mc.ai_cost_usd)::numeric, 4) as max_ai_cost_usd_per_user,
  round(sum(mc.ai_cost_usd)::numeric, 2) as total_ai_cost_usd
from monthly_cost mc
join plan p on p.user_id = mc.user_id
where mc.month = date_trunc('month', now())
group by p.plan
order by p.plan;
```

Compare `avg_ai_cost_usd_per_user` (and especially `max_ai_cost_usd_per_user`,
which catches a single heavy user before they become a pattern) against each
plan's monthly price in `src/lib/credits.ts`'s `PLAN_PRICES`. A plan whose
`avg_ai_cost_usd_per_user` approaches or exceeds its price has a real margin
problem worth investigating immediately — don't wait for `max` to also cross
that line.

## 2. Illustrative estimate (no production data yet)

Since there's no real usage history yet, here's a worst-case sanity check
using the same price table `ai_usage_log` uses
(`src/lib/ai-cost.ts`) and the actual credit-cost table (`ACTION_COSTS` in
`src/lib/credits.ts`):

- The single most expensive action, `generate_from_url`/`generate_full_website`,
  is two Claude calls (spec + files), each capped at `CLAUDE_MAX_TOKENS`
  (8,192 output tokens by default) plus a modest input prompt. At
  Claude's $3/$15 per-1M input/output estimate, two such calls cost roughly
  **$0.25** in worst-case output tokens alone (input is comparatively
  negligible — prompts are compressed and capped well under 10K tokens).
- Every free-chain action (`ai_edit`, `change_theme`, `generate_new_page`,
  `follow_up_questions`, assistant chat, voice transcription) currently
  routes to Groq/Cerebras/OpenRouter, all free or near-free per the same
  price table — effectively **$0** in provider cost today.
- A **free plan** user (3,000 credits/mo) can only afford roughly one
  `generate_full_website` (2,500 credits) per month — worst-case AI cost
  is therefore around **$0.25/user/month**, against a $0 plan price. This
  is an intentional loss-leader by design (every freemium product's free
  tier costs something to run) — **not** a margin red flag on its own.
- A **Business plan** user (75,000 credits/mo, $39.20/mo) could in theory
  spend their entire allotment on the most expensive action (~30 full
  generations), for a worst-case AI cost around **$7.50/user/month** —
  well under the $39.20 price. In practice almost no user spends every
  credit exclusively on the single most expensive action every month, so
  real average cost will be far lower than this ceiling.

**Conclusion from the illustrative estimate**: no plan looks likely to have
a negative margin from AI cost alone, including at each plan's theoretical
worst case. This is not a substitute for the real query in §1 — Claude/Groq/
Cerebras/OpenRouter pricing changes independently of this document, and
`src/lib/ai-cost.ts`'s price table is a static estimate that needs
re-checking against each provider's current pricing page periodically (see
its own header comment). Re-run §1's query monthly once there's a full
month of real `ai_usage_log` data, and update this document's numbers then.

## 3. What this doesn't cover

AI provider cost is not the only cost of serving a user — Supabase database/
storage/bandwidth, Vercel hosting, Resend email sends, and Upstash rate-limit
storage all cost money too, none of which `ai_usage_log` captures. This
document is scoped to AI cost specifically, per Phase 9's request; a full
unit-economics picture would need those other providers' own billing/usage
APIs as additional inputs.
