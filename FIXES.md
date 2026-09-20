# FIXES.md — release/all (consolidation branch)

`release/all` merges every branch of this engagement's work into one branch
for a single PR into `main`. It does **not** touch `main`, deploy anything,
or set any environment variable — see the consolidation report at the
bottom of this session for the full branch-comparison and inclusion list.

## 1. How this branch was built

Base: `release/advantage` (fix/audit -> release/clean -> release/growth ->
release/advantage, a single linear chain — every commit on the first three
is also on release/advantage, confirmed via `git merge-base --is-ancestor`).

Ported on top of that base, file-by-file (not cherry-picked, so each port
could be checked against release/all's actual current files rather than
blindly replayed):

- **From `release/design`** (2 commits unique to it: `2e851f3`, `187c563`)
  — the indigo-to-sky visual rebrand: `tailwind.config.ts` color tokens,
  `Logo.tsx`, `ChatWidget.tsx`'s assistant icon, `email.ts`'s `BRAND_COLOR`,
  `preview.ts`'s live-preview selection outline, and `Hero.tsx`'s
  canvas-style cycling mockup (4 generated-site preview frames,
  `prefers-reduced-motion` support).
- **From `release/final`** (4 commits unique to it: `a02d796`, `a45d9b9`,
  `f76a9e9`, `3bcdb39`) — repo cleanup (`.gitignore`, `engines.node`,
  removed 3 dead dependencies, added `@babel/types`), and the README /
  `docs/DEPLOY_VERCEL.md` rewrite. Its 4th commit (`3bcdb39`, lazy Supabase
  client construction) was **not** ported — verified redundant:
  `release/advantage`'s own lineage already builds Supabase clients lazily
  and already has `SupabaseConfigError`; the zero-env-var fresh build below
  proves this holds.
- **`release/growth`, `release/clean`, `fix/audit`**: 0 commits unique to
  any of them — each is a strict ancestor of `release/advantage`, so
  nothing further to port from these three.

Two bugs caught and fixed *while* doing this port (not present in either
source branch, both from the same root cause — a Tailwind custom color
token defined as a single flat value, not a shade scale, silently
shadowing the numbered `amber-*` classes):

- `src/app/dashboard/billing/page.tsx`: `amber-500`/`amber-700` classes
  produced no CSS at all. Fixed to use the `amber` token directly.
- Three spots in `globals.css` (`.corner-frame`, `.focus-ring:focus-visible`,
  `.saas-input:focus`) were still on the pre-rebrand blue-violet hex values
  — this branch's own earlier orange rebrand had missed them. Brought onto
  the new indigo/sky palette for consistency.

## 2. Not built, and why

Nothing new was scoped for this consolidation pass beyond merging existing
work — see `ROADMAP.md` for what's still genuinely unbuilt (admin errors
view, outbound webhooks with HMAC signing, a background job queue, public
API docs, etc.).

## 3. New migrations since `release/growth`

```
20260920000003_feature_flags.sql
```

(Carried over unchanged from `release/advantage` — this consolidation
added no new migrations of its own.) Additive and idempotent — safe against
an existing database. Full order for a brand-new database is every file in
`supabase/migrations/`, oldest filename first; two files share the date
`20260813` with no time component and were verified to have no dependency
on each other (disjoint columns, one shared index created identically and
idempotently in both) — either order is safe.

## 4. MANUAL ACTIONS FOR ME

- **Apply the 1 new migration** (`20260920000003_feature_flags.sql`) via
  `supabase db push` or the Supabase SQL editor, if not already applied
  from `release/advantage`.
- **No new environment variables** — `.env.example` is unchanged by this
  consolidation (it was already at parity with `release/final`'s version).
- **`npm audit` reports 13 vulnerabilities**, all requiring a semver-major
  Next.js bump (14 -> 16) to resolve — logged here as a decision for you,
  not applied. Non-force `npm audit fix` already applied cleanly (removed
  what it could without a major bump).
- **Review the rebrand visually** before deploying — the indigo-to-sky
  palette changes the landing hero, logo, chat widget, and every button/
  focus-ring/link that uses the `signal`/`signal2` tokens. This was
  verified to build and pass all tests, but no human has seen it rendered
  in a real browser yet.
- **This PR is not merged.** Per your instructions, `release/all` only
  opens a PR into `main` — nothing is deployed, and `main` is untouched
  until you choose to merge it.
- Everything else (feature flags, credit grants, legal pages, help center,
  contact form) carries the same "no manual action needed beyond review"
  status already recorded when each was originally built — see the
  Phase 8-9 section of `AUDIT.md`.

## 5. Verification performed

After every commit on this branch: `npx tsc --noEmit`, `npx eslint . --ext
.ts,.tsx`, `npx vitest run` (478/478 passing throughout), and `npx next
build`.

**Fresh-clone test**: cloned `release/all` from the remote into a clean
`/tmp` directory and ran, with the environment fully cleared (`env -i
PATH="$PATH" HOME="$HOME"` — no `.env.local`, no inherited shell vars):

```
npm ci            -> exit 0
npm run typecheck -> exit 0
npm run lint      -> exit 0 (no warnings or errors)
npm test -- --run -> 478/478 passing
npm run build     -> exit 0, all 141 pages generated, including
                     /, /login, /signup, /pricing, /terms, /privacy,
                     /forgot-password, and every /admin/* page —
                     all statically prerendered with no build or
                     prerender errors despite zero configured
                     Supabase/AI/Paddle/etc. credentials.
```
