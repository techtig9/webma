# Webma

Webma is an AI-powered website builder SaaS. Users describe a website, Webma
generates a responsive multi-page site, lets them preview and edit it
visually or in code, use contextual AI editing, manage versions, export the
project, and publish it.

**Core workflow:** Describe -> Understand -> Generate -> Preview ->
Select/Edit -> AI Edit -> Save -> Version -> Export/Publish

## Product areas

- Authentication (email/password + Google OAuth) and account management
- Dashboard, projects, and multi-page website generation
- Responsive live preview with visual element selection and contextual AI editing
- Monaco code editor with undo/redo, autosave, and explicit save
- Version history and restore
- Template marketplace (100+ templates across 30 categories — search, filters, favorites)
- Accessibility check gate before publish/deploy
- SEO/project settings and asset management (with alt-text support)
- Billing, credits, and Paddle subscriptions, including monthly/yearly pricing and admin credit grants
- Referral program
- Teams/organizations and custom domains
- Export to React/Next.js/ZIP, plus Vercel deployment with status tracking
- Public marketing surface: blog, changelog, help center, and legal pages
  (terms, privacy, refund, cookies, subprocessors, AI-use disclosure), plus a
  spam-protected contact form
- Self-service data export (GDPR)
- Admin tools: audit logging, rate limiting, feature flags, template CRUD, subscription overrides
- Sentry error tracking

## Stack

Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Supabase
(Postgres/Auth/Storage), Monaco Editor, Paddle Billing, Sentry, Vercel
deployment APIs, and a fallback chain of AI providers (Anthropic Claude for
complex generation; Groq/Cerebras/OpenRouter for lightweight tasks; OpenAI
for image generation).

## Local setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` using the provider credentials documented in
`.env.example` — every variable there is marked required or optional with a
one-line purpose. At minimum, for the app to run at all you need a Supabase
project's `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY`. **The build itself succeeds with zero env vars
set** — public marketing/auth pages render normally, and any feature that
genuinely needs a missing credential (Supabase, AI providers, Paddle, deploy
OAuth) fails at request time with a clear "not configured" message rather
than crashing.

Then apply the database migrations (see below) to your Supabase project,
and start the dev server:

```bash
npm run dev
```

## Database migrations

Migrations live in `supabase/migrations/`, named `<timestamp>_<description>.sql`
and applied **in filename order** (oldest first) via the Supabase CLI
(`supabase db push`) or by running each file's SQL directly in the Supabase
SQL editor. They are additive/idempotent (`add column if not exists`,
`create index if not exists`, etc.) and safe to run against an existing
database — **never run a database reset against a production installation**.

Two migrations share the date `20260813` with no time component
(`_production_editor_deployment` and `_safe_additive_upgrade`); both were
verified to have no dependency on each other (disjoint columns, one shared
index created identically and idempotently in both), so either run order is
safe.

**Manual step not covered by any migration**: create a public Storage bucket
named `assets` in the Supabase dashboard (Storage -> New bucket -> Public)
before using asset uploads or AI-generated images — the app calls
`.storage.from("assets")` and expects it to already exist.

## Scripts

```bash
npm run dev         # local dev server
npm run build        # production build
npm run start        # run a production build locally
npm run lint          # ESLint
npm run typecheck    # tsc --noEmit
npm test -- --run     # Vitest, once (omit -- --run for watch mode)
npm run test:e2e      # Playwright (see e2e/ for what needs which secrets)
```

## Deploying to Vercel

See [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md) for exact steps and the
full required-variables list.

## Project structure

```
src/
  app/            Next.js App Router — pages, API routes, layouts
    (marketing)   Landing, pricing, blog, help center, legal pages
                  (src/components/landing/)
    dashboard/    Authenticated app: generator, projects, billing, settings, ...
    admin/        Admin-only tools (templates, subscriptions, feature flags,
                  audit log, ...)
    api/          Route handlers, grouped by feature (ai, billing, projects, ...)
  components/     Shared React components (ui/, dashboard/, generator/, landing/)
  lib/            Business logic — auth, credits, AI providers, Supabase clients,
                  Paddle, deploy providers, templates, preview rendering,
                  accessibility/SEO audits, referrals, feature flags, etc.
  content/        MDX source for the blog and help center
supabase/
  migrations/     Version-controlled schema migrations (see above)
  schema.sql      Reference-only full schema dump — migrations are the source of truth
docs/             Deployment and reference documentation
e2e/              Playwright specs (smoke tests + an authenticated flow spec
                  that self-skips without seeded test credentials)
```

## Further reading

- [`AUDIT.md`](AUDIT.md) — cumulative audit findings and fixes across every
  phase of this codebase's hardening/growth work.
- [`ROADMAP.md`](ROADMAP.md) — prioritized list of what's next.
- [`FIXES.md`](FIXES.md) — manual actions required from a human operator
  (dashboard configuration, real API keys, etc.) that no code change can do.
