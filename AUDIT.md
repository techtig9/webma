# AUDIT.md

Branch: `fix/audit`. Format: `issue | file | priority | status`.

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
| `.env.example` is missing two variables the code actually reads: `TESTING_MODE` (bypasses all credit/feature gating in `credits.ts` when `"true"` — should be documented as dev-only) and `GROQ_WHISPER_MODEL` (voice-to-text model override, optional, defaults to `whisper-large-v3`). | `.env.example` | P1 | open |
| The Supabase Storage bucket `assets` (used by every asset upload — `.storage.from("assets")`) is never created by any migration and isn't documented as a manual setup step anywhere in README or `docs/`. A fresh Supabase project will fail every asset upload with "bucket not found" and no instructions to fix it. | supabase migrations / README | P1 | open |
| `deploy-oauth.ts` builds the GitHub/Vercel/Netlify OAuth redirect URI directly from `` `${process.env.NEXT_PUBLIC_APP_URL}/api/deploy-oauth/${provider}/callback` `` with no fallback or validation. If unset in a deployment, every "Connect" click redirects to a literal `undefined/api/...` URL with no error message shown to the user. | `src/lib/deploy-oauth.ts:52` | P1 | open |

## P2 — buttons / layout / UX (not yet catalogued)

Not yet enumerated in this pass — prior audit phases (see git history: Phase 1–5, tasks covering IDOR, RLS, admin/org RPC grants, dashboard loading states, focus styles, contrast, responsive layout at generator) already covered most of this surface in depth. This pass focused on regressions/gaps those phases didn't test for (the zero-env build path specifically). A dedicated P2 sweep (button-by-button, 375px layout, console errors) is pending — will run in Phase 2 once P0/P1 are fixed, or on request.

## P3 — polish / notes

| issue | file | priority | status |
|---|---|---|---|
| `npm audit`: 15 vulnerabilities (5 low, 3 moderate, 6 high, 1 critical) in transitive deps. Not triaged individually yet — needs decision (may require dependency bumps beyond "small fix" scope). | package-lock.json | P3 | open |
| Email fallback site URL is `webma.app` (`src/lib/email.ts`) while layout/sitemap/robots fall back to `webma.ai` — inconsistent placeholder domains when `NEXT_PUBLIC_APP_URL` is unset. Cosmetic only (real deployments always set the env var). | `src/lib/email.ts` | P3 | open |
| Two migrations share the same date with no time component and sort by name: `20260813_webma_production_editor_deployment.sql` before `20260813_webma_safe_additive_upgrade.sql`. No confirmed dependency issue found, but naming doesn't guarantee intended order the way the later timestamped migrations do. | `supabase/migrations/` | P3 | note only |
