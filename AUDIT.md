# AUDIT.md

Branch: `release/clean` (created from `fix/audit`, itself branched from
`claude/webma-repo-audit-tk7dwd` — that branch is NOT merged into `main`, and
`fix/audit` already contains the exact zero-env-build P0 fix requested, so
`release/clean` was based on it instead of redoing that work from scratch).

---

## Phase 6-7 (grow-harden.md) — branch `release/growth`

`release/growth` was created from `release/clean` (this file's own branch),
**not** from `main` or from `release/final` — confirmed with the user first
(main has neither this file nor `release/final`'s repo-cleanup work merged
into it, and lacks the credits-ledger/RLS/admin hardening below that
grow-harden.md explicitly asks to "check first what already exists" for;
building from `main` would have meant redoing that hardening from scratch
under time pressure, which is a real risk for security-sensitive code, or
"checking what exists" finding nothing when it already does). Once whichever
of `release/design`/`release/final`/`release/growth` the user picks are
merged into `main`, a later session should reconcile this branch note.

**Checked first, found already done (not duplicated):** entitlements single
source of truth (`PLAN_CREDITS`/`PLAN_PRICES`/`PLAN_FEATURES`/`ACTION_COSTS`
in `src/lib/credits.ts`); atomic credit deduction with a ledger
(`decrement_credits`/`credit_ledger`); RLS on every table with real policies
(49 occurrences across the RLS-restoring migrations); real `is_admin`/
`is_org_member` with RPC grants locked down; billing webhook idempotency
(`processed_webhook_events`); AI provider fallback chain with per-provider
timeouts; rate limiting (`src/lib/rate-limit.ts`); admin tools for users,
subscriptions, payments, templates, feedback, audit log; an in-app feedback
widget + API; SEO groundwork (`sitemap.ts`, `robots.ts`, `opengraph-image.tsx`,
`FAQ.tsx`); account deletion; security headers/CSP; CI with typecheck/lint/
test/build; a Dependabot-shaped gap (see below) aside.

### Phase 6 — Growth and conversion (built)

| item | file | status |
|---|---|---|
| Per-request AI token/cost logging, attributed per user, with an admin cost/usage dashboard | `supabase/migrations/20260920000000_ai_usage_log.sql`, `src/lib/gemini.ts`, `src/lib/ai-cost.ts`, `/admin/ai-usage` | **built** |
| Real monthly/yearly pricing toggle (previously a static "annual billing available" note with no real yearly numbers or control) | `src/components/landing/Pricing.tsx`, `src/lib/plan-pricing.ts` (new leaf module — see note below) | **built** |
| Referral program: invite link, 500-credit bonus each side, capped at 10 credited referrals/referrer/month | `supabase/migrations/20260920000002_referral_program.sql`, `src/lib/referrals.ts`, `/api/referrals*`, `ReferralCard.tsx` | **built** |
| Public `/changelog` with real, dated entries traceable to this repo's migration history and commits | `src/app/changelog/page.tsx` | **built** |
| Blog scaffold (MDX) with 3 draft posts, draft-gated so they 404 (body **and** metadata — see note below) in production until edited and published | `@next/mdx` wiring in `next.config.mjs`, `src/lib/blog.ts`, `src/content/blog/*.mdx`, `/blog`, `/blog/[slug]` | **built** |
| `/pricing`, `/changelog`, `/blog` were missing from `sitemap.ts` (pricing was missing even before this session) | `src/app/sitemap.ts` | **fixed** |

**Not built this pass** (real gaps, left for a future session rather than
built shallow): try-before-signup landing-page demo, an activation checklist/
progress-tracker for new users, a "Made with webma" badge on free-plan
outputs (no public subdomain-preview surface exists to attach it to —
exports/deploys go to the user's own Vercel/Netlify account, not a
webma-hosted URL, so this needs a product decision on where such a badge
would even render), a "how we differ" landing section, Lighthouse budget
verification (no live deploy to measure against in this environment).

**Design notes / real bugs caught and fixed while building this:**
- `grant_bonus_credits()` is a **new, separate** RPC from the existing
  `increment_credits()` — the existing one clamps to `credits_allowance`
  (`least(credits_remaining + p_amount, credits_allowance)`), which is
  correct for restoring a credit already spent this cycle but is a silent
  no-op for a brand-new signup already sitting at `credits_remaining ==
  credits_allowance`. Reusing it for the referral bonus would have quietly
  given zero bonus credits to every new signup.
- `Pricing.tsx` needed `PLAN_PRICES`/`PLAN_CREDITS` to stay a single source
  of truth, but importing them from `src/lib/credits.ts` directly (a client
  component) would have pulled that file's Supabase/email server-only
  import chain into the browser bundle. Extracted the plain constants into
  a new `src/lib/plan-pricing.ts` leaf module; `credits.ts` re-exports them
  so every existing import site is unaffected. Verified via a real
  production build that `/` and `/pricing` stay statically prerendered at
  their previous bundle size.
- The blog's `generateMetadata` initially returned a draft post's real
  title/description regardless of the page body's `notFound()` gate —
  Next.js resolves metadata independently of the page component, so the
  real content was leaking into the rendered `<head>` and the RSC flight
  payload even though the visible page correctly 404'd. Caught by
  inspecting the actual built HTML output, not just trusting the visible
  render; fixed by applying the same `isPubliclyVisible()` check to
  `generateMetadata`.

### Phase 7 — Backend, security, reliability (built)

| item | file | status |
|---|---|---|
| Same AI cost-logging work above also satisfies "per-request token/cost logging" | (see above) | **built** |
| Self-service data export (GDPR-style), next to the existing account-deletion flow | `/api/account/export`, `dashboard/settings` | **built** |
| Dependabot (npm grouped minor/patch + github-actions, weekly; major bumps of `next`/`eslint-config-next`/`vitest` excluded — those are real migrations, not safe auto-PRs) | `.github/dependabot.yml` | **built** |
| `docs/UNIT_ECONOMICS.md` — exact query to compute AI cost per active user from `ai_usage_log` against `PLAN_PRICES`, plus an illustrative worst-case estimate (no real usage history exists yet) | `docs/UNIT_ECONOMICS.md` | **built** |

**Not built this pass** (already substantially covered, or genuinely
out of scope for one session — see "checked first" above for what already
exists): outbound webhooks with HMAC signing/delivery log (only inbound
Paddle + Supabase webhooks exist); a background job queue with retries/
dead-letter state; a public `/api/v1` OpenAPI spec/docs page (`/api/v1/
projects` exists but isn't documented); workspaces/teams RBAC beyond the
existing owner/member `organization_members` role; try-before-signup rate-
limited demo. None of these were started shallow — they're real, multi-file
features that deserve their own pass rather than a half-built version.

**Also noticed, not fixed (pre-existing, out of this pass's scope):**
`privacy/page.tsx` still names "Google Gemini and OpenAI" as AI processors —
the actual provider chain is Anthropic/Groq/Cerebras/OpenRouter (OpenAI is
only used for image generation). Flagging for Phase 9's "AI-use disclosure"
work rather than fixing here, since Phase 9 explicitly owns legal-page
accuracy and this is exactly that kind of correction.

### Verification (Phase 6-7)

After every commit: `npx tsc --noEmit`, `npx eslint . --ext .ts,.tsx`,
`npx vitest run` (468/468 passing throughout — no new tests were needed for
this pass's own code, since none of it is complex enough logic to warrant
new unit tests beyond what manual verification + the existing suite already
covers), and `npx next build` (confirmed `/`, `/pricing`, `/blog`,
`/blog/[slug]`, `/changelog`, `/signup` all stay statically prerendered at
consistent bundle sizes). Fresh-clone, zero-env-var verification and a
pushed PR are recorded in `FIXES.md`.

**Next step if this session ends here:** phases 6-7 are complete and merged
into this branch; phases 8-9 (advantage-trust.md) have not been started —
see FIXES.md / the PR description for status.

---

## Phase 8-9 (advantage-trust.md) — branch `release/advantage`

`release/advantage` was created from `release/growth` (this branch), per
explicit confirmation from the user — the same reasoning as `release/growth`
being based on `release/clean` rather than `main` applies again here:
main still lacks all of this work, and phase 8's own instruction to "check
first what already exists (template marketplace, version history, export)"
only makes sense against a base where those things exist.

### Phase 8 — Product advantage (webma list)

Checked every item on fix-all.md's webma-specific list against the actual
codebase before building anything:

| Item | Status |
|---|---|
| Template gallery with live preview | **Already built** (Phase 3 of the original audit — 107 templates, search/filter/favorites) |
| Per-section AI rewrite | **Already built** (`editSection`/`ai_edit` — single-file targeted edits) |
| SEO panel per page | **Already built** (`auditSeo` + `ProjectSettingsPanel`'s SEO section) |
| Export to code/ZIP | **Already built** (`ExportBar`, ZIP/React/Next.js formats) |
| Version history with undo | **Already built** (`project_versions`, restore-version route, version history UI) |
| Forms and leads inbox | **Already built** — found fully wired (fetch, expandable list, CSV export) inside `ProjectSettingsPanel.tsx`; a first pass at this AUDIT.md nearly duplicated it before checking that file specifically rather than just `src/app/dashboard/` |
| Accessibility check before publish | **Genuinely missing — built this pass** |

Only one item needed building, so there's no "rest" from this specific list
to defer to ROADMAP.md — see ROADMAP.md instead for broader next-tier ideas
noticed along the way.

**Built:** `src/lib/a11y-audit.ts` composes seo-audit.ts's existing
alt-text/form-labels/accessible-names checks (already WCAG-relevant) with
two new ones (heading-level skips, vague link text) and gates the Deploy
action in `ExportBar` behind a confirmation modal when error-severity issues
are found — never hard-blocking, since regex-based checks can false-positive
(documented in each check's own comment).

### Phase 9 — Trust and operations

| Item | Status |
|---|---|
| Legal pages (Privacy, Terms, Refund, Cookies, Subprocessors, AI-use disclosure) | Refund/Cookies/Subprocessors/AI-use **built new**; Privacy/Terms **fixed** (both still named "Google Gemini and OpenAI" as the AI provider — corrected to the real Anthropic/Groq/Cerebras/OpenRouter/OpenAI chain) |
| Data-deletion flow | **Already built** (account/delete route + Settings UI) — confirmed, not duplicated |
| Help-center scaffold (MDX) | **Built new** — 4 real articles, reusing Phase 6's blog MDX infra |
| Contact form with spam protection | **Built new** — honeypot + per-IP rate limit, same pattern as the generated-sites' own public form endpoint |
| Transactional email templates (welcome, receipt, payment-failed, etc.) | **Already built** (`sendWelcomeEmail`/`sendPaymentConfirmedEmail`/`sendPaymentFailedEmail`/`sendSubscriptionCanceledEmail`/`sendCreditsLowEmail`, all via one provider-agnostic `sendTrackedEmail` → Resend path); "trial ending" doesn't apply — this product has no trial-period concept, only a free plan |
| Admin: users, subscriptions, AI cost, feature flags, credit grants | Users/subscriptions/AI-cost **already built**; feature flags and credit grants **built new** (see below); admin "errors" view genuinely missing — see ROADMAP.md |
| No impersonation | Confirmed — never added, per instruction |
| `docs/UNIT_ECONOMICS.md` | **Already built** — this was completed during the Phase 6-7 session (its own instructions didn't distinguish which phase it belonged to; advantage-trust.md's Phase 9 asks for the same file) |

**Built — feature flags:** new `feature_flags` table (RLS: any
authenticated user can read, since application code needs to check these;
only admins can write), `src/lib/feature-flags.ts`'s `isFeatureEnabled()`
for real app code to consult, and a full admin CRUD page.

**Built — credit grants:** extended the *existing*
`/api/admin/override-subscription` route and its schema with a
`grant_credits` action, rather than building a parallel tool — reuses the
admin/users page's table row. Uses the referral program's
`grant_bonus_credits()` (uncapped), not `increment_credits()` (clamped to
`credits_allowance`), for the same reason documented in the Phase 6-7
section: a user already at their monthly allowance would see a plain
`increment_credits()` grant silently do nothing.

**Real bug caught and fixed while building this:** `notifyAdmin()` (used by
both the new contact form and several pre-existing call sites — new
signups, feedback, payment events) interpolated event details directly into
the notification email's HTML with zero escaping. The pre-existing call
sites were already reachable with attacker-controlled strings (a Google
display name, a feedback message), but the new contact-form call site is
the first fully public, unauthenticated one — the least-trusted input yet
through this path. Added HTML-escaping to `notifyAdmin` itself rather than
adding a new call site on top of an existing unescaped sink, covered by a
new test asserting a `<script>` payload renders as literal text.

### Verification (Phase 8-9)

After every commit: `npx tsc --noEmit`, `npx eslint . --ext .ts,.tsx`,
`npx vitest run` (478/478 passing — 10 new tests: 9 for `a11y-audit.ts`, 1
for `notifyAdmin`'s HTML-escaping), and `npx next build` (confirmed every
new public route — `/help`, `/help/[slug]`, `/contact`, `/refund`,
`/cookies`, `/subprocessors`, `/ai-use` — stays statically prerendered).
Fresh-clone, zero-env-var verification and a pushed PR are recorded in
`FIXES.md`.
Format: `issue | file | priority | status`.

Product: webma — AI website builder SaaS. Chosen design direction (per
fix-all.md's list, for the Phase 3 design pass — **not run this session**,
per instruction to stop after Phase 2): indigo to sky gradient; canvas-style
hero cycling template previews.

## Diagnose summary

- `npm ci`: OK (15 vuln warnings, not blocking — P3).
- `npx tsc --noEmit`: PASS, no errors.
- `npx eslint . --ext .ts,.tsx`: PASS, no errors.
- `npx vitest run`: PASS, 468/468 tests, 44 files.
- `npx next build` (with `.env.local` populated): PASS.
- `npx next build` with **zero env vars**: was **FAILING**, exit 1 (15 pages). Fixed — see P0 rows below. Re-verified after each fix: exit 0, public pages render `○` static, dashboard/admin/API routes render `ƒ` dynamic (correct — they must never be statically cached).

## P0 — crash / build / sign-in blockers — ALL FIXED

| issue | file | priority | status |
|---|---|---|---|
| `next build` failed with no env vars set — every public page (`/`, `/pricing`, `/login`, `/signup`, `/terms`, `/privacy`, etc.) threw `@supabase/ssr: Your project's URL and API key are required...` during prerender. Root cause: `ChatWidget` (mounted in root layout, present on every page) called `createClient()` synchronously in its component body (not inside `useEffect`). Fix: client is now constructed inside `useEffect` (client-only, never runs during SSR/prerender), with a try/catch that treats "not configured" the same as "signed out". | `src/components/ui/ChatWidget.tsx` | P0 | **fixed** |
| Same underlying pattern (`!`-asserted, unvalidated env vars passed straight into Supabase client constructors) in all 4 Supabase client factories. Fix: added `SupabaseConfigError` (`src/lib/supabase/config-error.ts`) and replaced every `!` assertion with an explicit check that throws it with a clear message. | `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `service.ts` | P0 | **fixed** |
| `/dashboard/*` and `/admin/*` ran `updateSession()` in Edge Middleware on every request; a missing config threw the framework's raw 500 instead of a clear message (middleware errors aren't caught by React error boundaries). Fix: `src/middleware.ts` now catches `SupabaseConfigError` specifically and returns a plain 503 "not configured" response; any other error still propagates. | `src/middleware.ts` | P0 | **fixed** |
| `/login`, `/signup`, `/forgot-password` each independently called `createClient()` eagerly in the component body on every render. Fix: client is now constructed on demand inside each submit handler, wrapped in try/catch, surfacing a friendly inline error ("...isn't configured yet") instead of crashing the render. | `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/forgot-password/page.tsx` | P0 | **fixed** |
| Fixing the `!` assertion in `server.ts` (row above) initially introduced a **new** regression: the env-var check ran before the `cookies()` call, which is what tells Next.js a page/route is request-dependent. With the check first, every dashboard page and `requireUser()`-gated API route was wrongly attempted as **static** at build time (previously silently masked, since the `!` assertion never threw early enough to reveal it) — 35+ pages/routes failed to prerender. Fix: reordered so `cookies()` runs before the env check. Verified via a from-scratch zero-env build: exit 0, all such routes correctly render as `ƒ` dynamic. | `src/lib/supabase/server.ts` | P0 | **fixed** |

Verification after all P0 fixes: `tsc`/`eslint`/`vitest` all pass (468/468 tests); `next build` passes both with `.env.local` populated and with zero env vars set (confirmed twice, from a clean `.next`).

## P1 — core feature broken / undocumented required config

| issue | file | priority | status |
|---|---|---|---|
| `.env.example` was missing two variables the code actually reads: `TESTING_MODE` and `GROQ_WHISPER_MODEL`. Fix: documented both with a one-line purpose. | `.env.example` | P1 | **fixed** |
| `deploy-oauth.ts` built the GitHub/Vercel OAuth redirect URI directly from `NEXT_PUBLIC_APP_URL` with no fallback. If unset, every "Connect" click silently built a redirect_uri of literal `undefined/api/...`. Fix: `buildAuthorizeUrl()` now returns `null` (the same signal it already used for a missing client id) when `NEXT_PUBLIC_APP_URL` is unset too — both authorize routes already turn that into a clear `?error=..._oauth_not_configured` redirect, so no route/UI changes were needed. | `src/lib/deploy-oauth.ts` | P1 | **fixed** |
| The Supabase Storage bucket `assets` (used by every asset upload) is never created by any migration and isn't documented as a manual setup step. A fresh Supabase project fails every asset upload with "bucket not found". **Needs decision**: this instance's own working rules say not to touch Supabase state and to ask before schema/infra-adjacent changes — creating the bucket is a one-line idempotent migration (`insert into storage.buckets (id, name, public) values ('assets','assets', true) on conflict (id) do nothing;`, since the code calls `getPublicUrl` everywhere, never signed URLs) but I did not add it without confirmation. | supabase migrations / README | P1 | **needs decision** |

## P2 — buttons / layout / UX

This pass did what the previous one only claimed to skip: built for production
(`next build && next start`), loaded all 7 public pages in a real headless
Chromium at 375/768/1280/1920px (Playwright), and checked console errors,
horizontal scroll, and visual layout via screenshots. Dashboard/admin pages
require a real session (no E2E test credentials available in this
environment) so those were not visually verified this pass — only the
public/unauthenticated surface.

| issue | file | priority | status |
|---|---|---|---|
| Marketing navbar (`Navbar.tsx`, shared by `/`, `/pricing`) had no mobile fallback: the link list was `hidden md:flex` and the "Sign in" button `hidden sm:inline-flex`, with nothing replacing either. Below 768px there was no way to reach Product/Templates/Resources from the header, and below 640px no way to reach Sign in either — only "Get started" stayed visible. Confirmed live via screenshot at 375px before the fix (only logo + Get started rendered). Fix: added `MobileMenu.tsx`, a hamburger toggle following the same pattern the dashboard's own `MobileNav.tsx` already uses, revealing all links plus Sign in. Verified live at 375px: menu opens, Sign-in click navigates to `/login`, zero console errors. | `src/components/landing/Navbar.tsx`, `src/components/landing/MobileMenu.tsx` (new) | P2 | **fixed** |

Also confirmed (no defects): zero console errors and zero horizontal-scroll
at any of the 7 pages × 4 widths in production mode (a CSP `unsafe-eval`
violation appeared in `next dev` only — Next's own webpack HMR, not
application code; gone under `next start`). No buttons without a handler
(2 grep hits were false positives — `Button.tsx`'s primitive spreads
`...props`; a decorative `<button>` inside `Hero.tsx`'s mock browser-window
illustration). No leftover `console.log` in `src/`. No `next/image` missing
`alt`. Not re-litigated: IDOR, RLS, admin/org RPC grants, dashboard loading
states, focus styles, contrast — already covered by Phase 1–5 in git history.

## P3 — polish / notes

| issue | file | priority | status |
|---|---|---|---|
| `npm audit`: 15 vulnerabilities. Fix: ran `npm audit fix` (non-force) — bumped only transitive resolutions already inside existing `package.json` ranges (postcss, fast-uri, js-yaml, dompurify and friends); `package.json` itself is untouched. Reduced to 13. Verified: `tsc`/`eslint`/468 tests/build (with and without env vars) all still pass. **Remaining 13 all require a semver-major bump of a direct dependency** — `next` 14→16, `vitest` 3→5, `eslint-config-next` — which is a big-refactor-risk upgrade, not a small fix. **Needs decision**, not applied. | package-lock.json | P3 | **partially fixed** |
| Email fallback site URL was `webma.app` while layout/sitemap/robots fall back to `webma.ai`. Fix: made `email.ts` consistent with `webma.ai` everywhere (including the `support@` mailto). Verified: tests still pass (the test suite always sets `NEXT_PUBLIC_APP_URL` explicitly, never asserts the fallback string). | `src/lib/email.ts` | P3 | **fixed** |
| Two same-date migrations, order not obvious from the name. Investigated: read both files in full. Every statement in both is `add column if not exists` / `create index if not exists` against tables that already exist from the baseline schema; they touch disjoint columns except one index (`deployments_project_created_idx`) both create identically — idempotent, so whichever runs second is a harmless no-op. **No actual ordering dependency exists between these two files.** Not renaming them: an already-applied migration's filename is how Supabase's migration-history table identifies it, so renaming one is a real risk to a live deployment for zero benefit here, and this instance's rules bar destructive DB actions and schema-adjacent changes without asking. Closing as verified-safe rather than "fixed". | `supabase/migrations/` | P3 | **verified safe, no action needed** |
