# AUDIT.md

Branch: `release/clean` (created from `fix/audit`, itself branched from
`claude/webma-repo-audit-tk7dwd` — that branch is NOT merged into `main`, and
`fix/audit` already contains the exact zero-env-build P0 fix requested, so
`release/clean` was based on it instead of redoing that work from scratch).
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
| `npm audit`: 15 vulnerabilities (5 low, 3 moderate, 6 high, 1 critical) in transitive deps. Not triaged individually yet — needs decision (may require dependency bumps beyond "small fix" scope). | package-lock.json | P3 | open |
| Email fallback site URL is `webma.app` (`src/lib/email.ts`) while layout/sitemap/robots fall back to `webma.ai` — inconsistent placeholder domains when `NEXT_PUBLIC_APP_URL` is unset. Cosmetic only (real deployments always set the env var). | `src/lib/email.ts` | P3 | open |
| Two migrations share the same date with no time component and sort by name: `20260813_webma_production_editor_deployment.sql` before `20260813_webma_safe_additive_upgrade.sql`. No confirmed dependency issue found, but naming doesn't guarantee intended order the way the later timestamped migrations do. | `supabase/migrations/` | P3 | note only |
