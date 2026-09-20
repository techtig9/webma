# Deploying to Vercel

## Project settings

- **Root directory**: repository root (this is not a monorepo — no
  `vercel.json` root-directory override is needed).
- **Framework preset**: Next.js (Vercel auto-detects this from
  `next.config.mjs` / `package.json`).
- **Build command**: `next build` (the default — no override needed).
- **Install command**: `npm ci` (the default for a repo with a committed
  `package-lock.json`).
- **Output**: managed automatically by the Next.js framework preset (App
  Router, server components, and API routes all work out of the box on
  Vercel — no custom output directory).
- **Node.js version**: 20.x or newer (see `engines.node` in `package.json`;
  CI is pinned to Node 22).

## Steps

1. Import the GitHub repository into a new Vercel project (or connect an
   existing one) — Vercel detects Next.js automatically, so the project
   settings above are its defaults; nothing to change.
2. In the Vercel project's **Settings -> Environment Variables**, add every
   variable your deployment needs from `.env.example` (see below for which
   ones are required vs. optional, and what breaks without each). Set them
   for the **Production** environment; add separate values for **Preview**
   if you want preview deployments to hit a different (e.g. staging)
   Supabase project.
3. Set `NEXT_PUBLIC_APP_URL` to the deployment's real public URL (e.g.
   `https://yourapp.vercel.app` or your custom domain) — OAuth redirect
   URIs, email links, the sitemap, and social-preview metadata all derive
   from this.
4. Deploy. **The build succeeds even with zero environment variables set**
   — public marketing/auth pages are statically generated and render
   normally either way — but a real deployment needs at least the Supabase
   variables (below) for anything behind login to work.
5. After the first deploy, register your real callback URLs with each
   provider you configured (see "Provider callback URLs" below).

## Required vs. optional environment variables

Full reference with one-line purposes: [`.env.example`](../.env.example).
Summary:

| Variable(s) | Required for | If missing |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auth, database, storage — essentially the whole app | Public pages still render; `/dashboard` and `/admin` show a clear "not configured" page instead of crashing |
| `ANTHROPIC_API_KEY` + at least one of `GROQ_API_KEY` / `CEREBRAS_API_KEY` / `OPENROUTER_API_KEY` | AI website generation | Generation requests fail with a clear error |
| `NEXT_PUBLIC_APP_URL` | Correct OAuth redirects, email links, sitemap/robots, social previews | Falls back to `http://localhost:3000`, which is wrong for a real deployment |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Correct rate limiting on serverless/multi-instance (Vercel is both) | Silently falls back to a per-instance in-memory counter — the effective rate limit multiplies by however many warm instances are handling traffic |
| `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_ENV`, the six `PADDLE_PRICE_*` variables | Billing/checkout/subscriptions | Checkout and billing pages show a clear "not configured" error |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional emails (welcome, payment failed, etc.) | Email sends throw a clear server-side error; the rest of the app is unaffected |
| `OPENAI_API_KEY` | AI image generation | That one feature is unavailable; unrelated to website generation |
| `VERCEL_API_TOKEN` / `NETLIFY_API_TOKEN` | Platform-token one-click deploy of generated sites | Users can still export their site as a ZIP |
| `*_OAUTH_CLIENT_ID` / `*_OAUTH_CLIENT_SECRET` (Vercel/GitHub/Netlify) + `DEPLOY_TOKEN_ENCRYPTION_KEY` | Per-user "deploy under your own account" OAuth | Falls back to the platform-token deploy above; each provider's "Connect" button shows a clear error until configured |
| `USER_EVENTS_WEBHOOK_SECRET` | Verifying Supabase's `user-created` database webhook | That webhook endpoint rejects requests until both sides agree on a secret |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Error tracking / source maps | App runs the same; no error reporting |
| `TESTING_MODE`, `EMAIL_TEST_OVERRIDE_TO`, `ANALYTICS_HASH_SALT` | Dev/staging conveniences | Never set `TESTING_MODE` in production — it bypasses all credit/plan gating |

## Provider callback URLs

Once you know your deployment's real URL, register these with each
provider (all under `${NEXT_PUBLIC_APP_URL}`):

- **Supabase Auth** (Google OAuth): add `${NEXT_PUBLIC_APP_URL}/auth/callback`
  as an allowed redirect URL in Supabase Dashboard -> Authentication -> URL
  Configuration.
- **Deploy OAuth** (if using per-user deploy — see `src/lib/deploy-oauth.ts`):
  register `${NEXT_PUBLIC_APP_URL}/api/deploy-oauth/vercel/callback` and
  `${NEXT_PUBLIC_APP_URL}/api/deploy-oauth/github/callback` with each
  provider's OAuth app settings (Vercel Integrations Console / GitHub OAuth
  Apps).
- **Paddle webhooks**: point Paddle's webhook destination at
  `${NEXT_PUBLIC_APP_URL}/api/billing/paddle-webhook` and set
  `PADDLE_WEBHOOK_SECRET` to match what Paddle signs with.
- **Supabase Database Webhooks** (user-created): point it at
  `${NEXT_PUBLIC_APP_URL}/api/webhooks/user-created` with a custom header
  carrying the same value as `USER_EVENTS_WEBHOOK_SECRET`.

## Database migrations

Vercel does not run database migrations for you. Apply
`supabase/migrations/*.sql` to your Supabase project, in filename order,
**before** or immediately after your first deploy — see the "Database
migrations" section in the root [README](../README.md). Also create the
`assets` Storage bucket manually (Supabase Dashboard -> Storage -> New
bucket -> Public) — no migration provisions it.
