# FIXES.md — release/advantage (Phase 8-9, advantage-trust.md)

Branch: `release/advantage`, created from `release/growth` (see AUDIT.md's
"Phase 8-9" section for why). This file replaces the previous
`release/growth`-scoped version inherited on branch creation — that
content now lives in AUDIT.md's "Phase 6-7" section as history; this file
covers only this branch's own Phase 8-9 work.

## 1. Fixed / built

See `AUDIT.md`'s "Phase 8-9" section for the full per-item table with file
paths and what was already built vs. genuinely new. Summary:

- **Phase 8 (product advantage):** checked every item on webma's own
  feature list first — template gallery, per-section AI rewrite, SEO panel,
  export to code/ZIP, version history, and forms/leads inbox were all
  already fully built. Only accessibility-check-before-publish was
  genuinely missing; built it.
- **Phase 9 (trust and operations):** Refund/Cookies/Subprocessors/AI-use
  legal pages (new), Privacy/Terms fixed (stale AI-provider references),
  help-center scaffold (new, 4 real articles), contact form with spam
  protection (new), admin feature flags (new), admin one-off credit grants
  (new, extends the existing override-subscription tool). Data-deletion
  flow, transactional email templates, and `docs/UNIT_ECONOMICS.md` were
  all already built (the last one during the Phase 6-7 session).

## 2. Not built, and why

See `ROADMAP.md` for the ranked list — admin errors view, outbound
webhooks with HMAC signing, a background job queue, public API docs, and a
few smaller items. Each is judged a real, multi-file feature deserving its
own session, not something to build shallow just to check a box.

## 3. Design decisions

- `release/advantage` branches from `release/growth`, not `main` — same
  reasoning as `release/growth` branching from `release/clean`.
- Credit grants extend the *existing* override-subscription admin tool
  (new `grant_credits` action) instead of a parallel one.
- `notifyAdmin()` now HTML-escapes every interpolated value — a real,
  pre-existing gap (reachable via signup name, feedback message) made
  materially worse by this session's own new contact-form call site being
  the first fully public, unauthenticated one through that path. Fixed at
  the shared function rather than adding a new call site on top of an
  unescaped sink.

## 4. New migrations (apply in this exact order, after everything already
   applied from `release/growth`'s own migration set)

```
20260920000003_feature_flags.sql
```

Additive and idempotent (`create table if not exists`) — safe against an
existing database. Full migration order for a brand-new database is every
file in `supabase/migrations/`, oldest filename first.

## 5. MANUAL ACTIONS FOR ME

- **Apply the 1 new migration above** via `supabase db push` or the
  Supabase SQL editor.
- **No new environment variables** — everything in this phase reuses
  existing configuration. `.env.example` is unchanged. Contact-form
  notifications use the existing `ADMIN_NOTIFICATION_EMAIL` — set it if you
  want to actually receive them (without it, submissions are validated and
  accepted but no notification is sent — see `notifyAdmin`'s own no-op
  behavior when that var is unset).
- **No new provider accounts, dashboards, or deploy steps.**
- **Review the 4 legal pages** (`/refund`, `/cookies`, `/subprocessors`,
  `/ai-use`) — each carries the existing "draft, not legal advice, have a
  lawyer review it" banner already used on Privacy/Terms, but they're
  written to be accurate about this app's actual behavior as of today.
- **Feature flags and credit grants are live admin tools now** — anything
  you flip in `/admin/feature-flags` or grant via `/admin`'s new credit
  input takes effect immediately; nothing there is itself gated behind
  further setup.

## 6. Verification performed

After every commit on this branch: `npx tsc --noEmit`, `npx eslint . --ext
.ts,.tsx`, `npx vitest run` (478/478 passing throughout — 10 new tests),
and `npx next build` (confirmed every new public route stays statically
prerendered).

**Fresh-clone test**, per this phase's own FINISH instructions: cloned this
branch from the remote into a clean `/tmp` directory and ran, with the
environment fully cleared (`env -i PATH="$PATH" HOME="$HOME"` — no
`.env.local`, no inherited shell vars):

```
npm ci            -> exit 0
npm run typecheck -> exit 0
npm run lint      -> exit 0
npx vitest run    -> 478/478 passing
npm run build     -> exit 0
```
