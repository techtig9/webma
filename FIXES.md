# FIXES.md — release/growth (Phase 6-7, grow-harden.md)

Branch: `release/growth`, created from `release/clean` (see AUDIT.md's
"Phase 6-7" section for why — not `main`, confirmed with the user first).
This is the first `FIXES.md` on this branch lineage (`release/clean` only
had `AUDIT.md`); `release/final`'s own `FIXES.md`, on a sibling branch, is
unrelated to this one.

## 1. Fixed / built

See `AUDIT.md`'s "Phase 6-7" section for the full, per-item table with file
paths. Summary:

- **Growth (Phase 6):** per-request AI cost/token logging with an admin
  usage dashboard; a real monthly/yearly pricing toggle; a referral program
  (invite link, credit reward, abuse-limited); a public changelog; an MDX
  blog scaffold with 3 draft posts; missing sitemap entries.
- **Hardening (Phase 7):** the same AI cost logging; self-service data
  export next to account deletion; Dependabot; `docs/UNIT_ECONOMICS.md`.

## 2. Not built, and why

See AUDIT.md's "Not built this pass" notes under each phase — in short:
outbound webhook signing/delivery log, a background job queue, a public API
docs page, and a try-before-signup demo were all judged genuinely
multi-file features deserving their own pass rather than a shallow version,
not gaps that were missed.

## 3. Design decisions

- `release/growth` branches from `release/clean`, not `main` — main is
  missing the credits-ledger/RLS/admin hardening this phase's own
  instructions say to check before improving, so building from it would
  have meant redoing that hardening from scratch under time pressure.
- Referral bonuses use a new, deliberately uncapped `grant_bonus_credits()`
  RPC rather than the existing `increment_credits()`, which clamps to
  `credits_allowance` and would silently zero out a signup bonus for any
  brand-new free-plan user (see AUDIT.md for the full reasoning).
- `PLAN_PRICES`/`PLAN_CREDITS` were extracted into a new dependency-free
  `src/lib/plan-pricing.ts` so the pricing toggle (a client component)
  doesn't pull `credits.ts`'s server-only Supabase/email imports into the
  browser bundle.

## 4. New migrations (apply in this exact order, after everything already
   applied from `release/clean`'s own migration set)

```
20260920000000_ai_usage_log.sql
20260920000002_referral_program.sql
```

Both are additive and idempotent (`create table if not exists`, `create
index if not exists`, `create or replace function`) — safe against an
existing database, no destructive statements. Full migration order for a
brand-new database is every file in `supabase/migrations/`, oldest filename
first (unchanged from `release/clean`'s own README instructions).

## 5. MANUAL ACTIONS FOR ME

- **Apply the 2 new migrations above**, in order, via `supabase db push`
  or the Supabase SQL editor.
- **No new environment variables** — everything in this phase reuses
  existing Supabase/AI provider configuration. `.env.example` is unchanged.
- **No new provider accounts, dashboards, or deploy steps** — nothing here
  needed any of that, per this phase's own constraints.
- **Review the 3 draft blog posts** in `src/content/blog/*.mdx` and flip
  each one's `draft: true` to `draft: false` (in its `meta` export) once
  you're happy with the content — they 404 in production until then, by
  design.
- **`grant_bonus_credits()` and referral bonus amounts** (500 credits each
  side, capped at 10 credited referrals/referrer/month) are a starting
  point in `src/lib/referrals.ts` — adjust the constants there if you want
  a different reward size or cap.

## 6. Verification performed

After every commit on this branch: `npx tsc --noEmit`, `npx eslint . --ext
.ts,.tsx`, `npx vitest run` (468/468 passing throughout), and `npx next
build` (confirmed the new/changed public routes — `/`, `/pricing`, `/blog`,
`/blog/[slug]`, `/changelog`, `/signup` — all stay statically prerendered).

**Fresh-clone test**, per this phase's own FINISH instructions: cloned this
branch from the remote into a clean `/tmp` directory and ran, with the
environment fully cleared (`env -i PATH="$PATH" HOME="$HOME"` — no
`.env.local`, no inherited shell vars):

```
npm ci            -> exit 0
npm run typecheck -> exit 0
npm run lint      -> exit 0
npx vitest run    -> 468/468 passing
npm run build     -> exit 0
```
