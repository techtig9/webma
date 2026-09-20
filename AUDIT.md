# AUDIT.md

Branch: `fix/audit`. Format: `issue | file | priority | status`.

## Diagnose summary

- `npm ci`: OK (15 vuln warnings, not blocking — P3).
- `npx tsc --noEmit`: PASS, no errors.
- `npx eslint . --ext .ts,.tsx`: PASS, no errors.
- `npx vitest run`: PASS, 468/468 tests, 44 files.
- `npx next build` (with `.env.local` populated): PASS.
- `npx next build` with **zero env vars**: **FAILS**, exit 1. 15 pages fail to prerender: `/`, `/pricing`, `/login`, `/signup`, `/forgot-password`, `/terms`, `/privacy`, `/sentry-test`, `/_not-found`, and all `/admin/*` pages. Root cause below (P0-1).

## P0 — crash / build / sign-in blockers

| issue | file | priority | status |
|---|---|---|---|
| `next build` fails with no env vars set at all — every public page (`/`, `/pricing`, `/login`, `/signup`, `/terms`, `/privacy`, etc.) throws `@supabase/ssr: Your project's URL and API key are required...` during prerender. Root cause: `ChatWidget` (mounted in root layout, so present on every page) calls `createClient()` synchronously in its component body (not inside `useEffect`), and `src/lib/supabase/client.ts` does `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)` — the `!` assertions mean a missing env produces `undefined`, which the library throws on immediately, synchronously, during render/prerender. | `src/components/ui/ChatWidget.tsx` (trigger) | P0 | open |
| Same underlying pattern (`!`-asserted, unvalidated env vars passed straight into Supabase client constructors) in the other 3 Supabase client factories — `server.ts` and `middleware.ts` throw the same way, so `/dashboard/*` and `/admin/*` (which run `updateSession()` in middleware on every request) crash with a raw exception instead of the required "not configured" message; `service.ts` throws the same way for any route using the service-role client. | `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `service.ts` | P0 | open |
| `/login`, `/signup`, `/forgot-password` each independently call `createClient()` eagerly in the component body on every render (not deferred to the submit handler), so even after the two fixes above, these three pages still construct a Supabase client during prerender/first render regardless of whether it's needed yet. | `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/forgot-password/page.tsx` | P0 | open |

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
