# FIXES.md — release/final (Phase 4–5)

Branch: `release/final`, created from `origin/main` (the default branch).
Scope: fix-all.md **Phases 4 (clean repo) and 5 (verify and package) only**.

## 1. Fixed

- **P0 build-crash bug** (ported from an earlier session's `fix/audit`
  branch, which never merged into `main`): `next build` failed with zero
  env vars set — every public page threw `@supabase/ssr: Your project's
  URL and API key are required...` during prerender. Root cause:
  `ChatWidget` (mounted in the root layout, present on every page) built a
  Supabase client synchronously in its render body, and the Supabase
  client factories used `!` assertions on env vars instead of validating
  them. Fixed across `src/lib/supabase/{client,server,middleware,service}.ts`,
  `src/middleware.ts`, `src/components/ui/ChatWidget.tsx`, and
  `src/app/{login,signup,forgot-password}/page.tsx`. Verified via a
  from-scratch fresh clone building with zero env vars (see §3).
- **Repo cleanup**: deduplicated and expanded `.gitignore` (`.vercel/`,
  `*.zip`, `.env.*.local`, and `.thumbgen/` — a local-only tooling script
  that was one `git add -A` away from being committed by accident); added
  a `typecheck` script and an `engines.node` field to `package.json`
  matching CI's pinned Node 22; removed three genuinely-unused dependencies
  (`@google/generative-ai`, `@paddle/paddle-js`, `@testing-library/user-event`
  — verified via grep across all of `src/`, not just `depcheck`'s say-so);
  added `@babel/types` as an explicit dependency (it's imported directly by
  two files but was only present by luck via `@babel/traverse`'s own
  transitive install).
- **Dependency vulnerabilities**: ran `npm audit fix` (non-force — no
  top-level package.json version changed): 15 → 13 vulnerabilities.
- **Documentation refresh**: README rewritten (was stale, referencing a
  prior session's own build-environment timeout); `.env.example` refreshed
  per Phase 4's instruction — every variable now marked required/optional
  with a one-line purpose, plus two variables the code reads but the file
  never documented (`TESTING_MODE`, `GROQ_WHISPER_MODEL`); new
  `docs/DEPLOY_VERCEL.md` with exact Vercel settings, a required-variables
  table, and provider callback URLs to register post-deploy.

## 2. Not fixed, and why

- **13 remaining npm audit vulnerabilities** all require a semver-major
  bump of a direct dependency (`next` 14→16, `vitest` 3→5,
  `eslint-config-next`). Out of scope for a repo-cleanup pass — a Next.js
  14→16 major bump is a real migration project (breaking changes across
  the App Router, middleware, and image optimization APIs at minimum), not
  a safe drop-in. **Needs decision.**
- **`assets` Storage bucket provisioning**: the app calls
  `.storage.from("assets")` but no migration creates that bucket. Creating
  it is a one-line idempotent migration, but doing so touches live
  Supabase state — logged as a manual action below rather than applied.
- **Legacy one-off documentation** at the repo root and in `docs/`
  (`FRONTEND_REDESIGN.md`, `docs/GAP_ANALYSIS.md`,
  `docs/FINAL_UPGRADE_MANIFEST.md`, `docs/SAFE_UPGRADE.md`,
  `docs/UPGRADE_SUMMARY.md`) read like point-in-time audit reports from an
  earlier automated pass rather than living documentation. Not deleted —
  removing documentation wasn't explicitly asked for, and these may have
  historical value I can't fully assess without reading each in full.
  Flagging as a candidate for manual pruning.
- **CI's build job uses placeholder env vars**, not genuinely zero — so it
  would not by itself have caught the P0 bug this pass fixed, or a future
  regression of it. Consider adding a second CI build step with no env
  vars set at all, as a regression guard.

## 3. Verification performed

All of the following were run **on this branch, after every commit**, not
just once at the end:

- `npx tsc --noEmit` — clean
- `npx eslint . --ext .ts,.tsx` — clean
- `npx vitest run` — 465/465 tests passing (44 files)
- `npm run build` — passes both with `.env.local` populated and with zero
  env vars set

**Fresh-clone test** (Phase 5's explicit requirement): cloned
`release/final` from the remote into a clean `/tmp` directory (not this
working copy) and ran, with the environment fully cleared
(`env -i PATH="$PATH" HOME="$HOME"` — no `.env.local`, no inherited shell
vars):

```
npm ci          -> exit 0
npm run typecheck -> exit 0
npm run lint     -> exit 0
npx vitest run   -> 465/465 passing
npm run build    -> exit 0, public pages static, dashboard/admin/API dynamic
```

## 4. Design decisions

- Ported the P0 fix here (Phase 4/5) rather than treating it as out of
  scope, because Phase 5's own acceptance bar — "a clean clone must build
  with no env vars" — cannot be met without it. Everything else in this
  fix was scoped strictly to repo cleanliness/packaging, not features or
  business logic.
- Chose not to bump any dependency past a safe (`npm audit fix`
  non-force) patch/minor level, consistent with "no dependency swaps or
  big refactors."
- Chose not to delete the legacy audit-report `.md` files (see §2) rather
  than guess whether they're still wanted.

## 5. MANUAL ACTIONS FOR ME

**Exact environment variable names** (full reference with one-line
purposes): [`.env.example`](.env.example). Minimum to run anything behind
login: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`. Full required-vs-optional breakdown, with what
breaks without each: [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md).

**Migrations to run, in order** (via `supabase db push` or pasting each
file into the Supabase SQL editor, oldest filename first):

```
20260101000000_baseline_reconstructed_schema.sql
20260813_webma_production_editor_deployment.sql       (order between these
20260813_webma_safe_additive_upgrade.sql                two verified safe either way)
20260814000000_form_submissions.sql
20260814000001_page_views.sql
20260814000002_missing_unique_constraints.sql
20260814000003_api_keys.sql
20260829000000_webhook_idempotency_and_credit_alerts.sql
20260829000001_template_marketplace_and_asset_alt_text.sql
20260829000002_seed_template_library.sql
20260829000003_restore_missing_trigger_functions_and_rls.sql
20260829000004_implement_admin_org_deploy_token_functions_and_lock_down_rpc_grants.sql
20260829000005_atomic_credit_shortfall_detection.sql
```

**Manual step no migration covers**: create a public Storage bucket named
`assets` (Supabase Dashboard → Storage → New bucket → Public) before using
asset uploads or AI-generated images.

**Auth redirect URLs to register**:
- Supabase Dashboard → Authentication → URL Configuration: add
  `${NEXT_PUBLIC_APP_URL}/auth/callback` as an allowed redirect URL (Google
  OAuth).
- If using per-user deploy OAuth: register
  `${NEXT_PUBLIC_APP_URL}/api/deploy-oauth/vercel/callback` and
  `${NEXT_PUBLIC_APP_URL}/api/deploy-oauth/github/callback` with each
  provider's OAuth app settings.

**Vercel settings**: Root directory = repo root, Framework = Next.js
(auto-detected), Build command = default (`next build`), Install command =
default (`npm ci`). No `vercel.json` needed (not a monorepo). Full steps:
[`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md).

**Keys to rotate**: none found. Scanned full git history for common secret
key shapes (`sk-`/`sk_live_`/`pk_live_`/AWS/Slack/Google API key patterns,
PEM private key headers) and for suspiciously-real-looking values assigned
to this repo's own documented secret env var names — no hits beyond one
obviously-fake test fixture string in a unit test.

## 6. 5-minute test checklist

1. `npm ci && npm run build && npm run start` (or `npm run dev`) with a
   real Supabase project's URL/anon/service-role keys set — confirm `/`
   loads.
2. Sign up with email/password → confirm the "check your email" state
   appears (or lands on `/dashboard` if email confirmation is disabled on
   your Supabase project).
3. Log in → confirm `/dashboard` loads and shows your (empty) project
   list.
4. Click "Create website", enter a prompt, generate → confirm the live
   preview renders and you can save.
5. Visit `/pricing` and `/dashboard/billing` while logged in — confirm
   both render without a Paddle-related crash even if Paddle env vars
   aren't set (should show a clear "not configured" state instead).
6. Stop the server, unset every env var, run `npm run build` again —
   confirm it still exits 0 and `/`, `/login`, `/signup`, `/pricing`,
   `/terms`, `/privacy` all render when you `npm run start` afterward
   (dashboard/admin routes will correctly show "not configured" without
   real Supabase credentials — that's expected, not a bug).
