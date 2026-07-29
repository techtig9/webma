# webma

AI website builder SaaS, built by **Techtig**. Describe a site by typing or speaking,
answer a few tap-to-pick follow-up questions, and get a complete, responsive,
ready-to-deploy website — generated live in the dashboard.

This repo implements the full build order from the spec:

1. ✅ Auth (email/password + Google) + dashboard shell
2. ✅ AI generator (Gemini text input + voice) + live preview
3. ✅ Credit system + feature gating (`canUseFeature`)
4. ✅ Export to ZIP / React / Next.js project
5. ✅ Paddle checkout + webhook (Starter/Pro/Business)
6. ✅ Admin panel (users, subscriptions, payments, plan overrides)
7. ✅ Deployment integrations (Vercel + Netlify)
8. ✅ Monaco code editor, templates library, error/notification states

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Supabase
(Postgres + Auth) · Google Gemini API · Paddle Billing · Monaco Editor

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/schema.sql` — it creates every table, RLS
   policy, the credit-ledger trigger, and seeds the template categories.
3. Enable **Google** as an Auth provider (Authentication → Providers) and add
   `http://localhost:3000/auth/callback` as a redirect URL (and your production
   URL once deployed).
4. Copy the Project URL, `anon` key, and `service_role` key into `.env.local`.

### 2. Gemini

Get an API key from [Google AI Studio](https://aistudio.google.com/apikey) and
set `GEMINI_API_KEY`. The two model env vars let you swap which Gemini models
back the "premium" (full generation) vs "lite" (edits, theme changes, follow-up
questions, voice transcription) routing tiers without a code change.

### 3. Paddle

1. Create a Paddle Billing account (sandbox is fine for testing).
2. Create three products, each with a monthly and annual price, matching the
   pricing table in the spec. Put each price ID into the matching
   `PADDLE_PRICE_*` env var.
3. Add a webhook endpoint pointing at `/api/billing/paddle-webhook`, subscribed
   to: `subscription.created`, `subscription.updated`, `subscription.canceled`,
   `transaction.completed`, `transaction.payment_failed`. Copy the webhook
   secret into `PADDLE_WEBHOOK_SECRET`.
4. Copy your client-side token into `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`.

### 4. Deployment integrations (optional for local dev)

`VERCEL_API_TOKEN` / `NETLIFY_API_TOKEN` let the dashboard's "Deploy to
Vercel/Netlify" buttons work. **Note:** these currently deploy every user's
site under Techtig's own platform account (fine for an MVP) — see the comment
at the top of `src/lib/deploy.ts` for the per-user OAuth upgrade path needed
before charging real customers.

### 5. First admin account

Sign up normally, then in Supabase's table editor set that row's `role` to
`admin` in the `users` table. Admins get an `/admin` panel, full feature
access, and are never charged credits or Paddle checkouts (see
`canUseFeature` in `src/lib/credits.ts`).

## Architecture notes

- **`src/lib/credits.ts`** — the single shared `canUseFeature()` gate every
  AI/export/deploy route calls before doing paid work, plus `spendCredits` /
  `refundCredits`. This is the one place plan pricing and feature flags live.
- **`src/lib/gemini.ts`** — model routing (premium vs. lite), prompt
  compression, and response caching, per the spec's cost-optimisation section.
- **`src/lib/preview.ts`** — renders the generator's Live Preview panel by
  running the generated components through Babel Standalone inside a sandboxed
  iframe, with no build step. This is preview-only; real Export/Deploy use the
  original files with their imports/exports intact.
- **RLS everywhere** — every table has row-level security scoped to
  `auth.uid()`, with a separate admin-read policy. Server code that needs to
  bypass RLS (webhooks, admin actions) explicitly uses
  `createServiceRoleClient()` from `src/lib/supabase/service.ts`.

## Known gaps / next steps

- Deployment integrations use a platform-level API token rather than
  per-user OAuth (see above).
- Template thumbnails are placeholders — the `templates` table has a
  `thumbnail` column ready for real preview images.
- The live preview uses a lightweight in-browser transform (Babel Standalone)
  rather than a full bundler, so very advanced generated code (e.g. dynamic
  imports) won't render there — export/deploy are unaffected.
- No automated tests yet.
