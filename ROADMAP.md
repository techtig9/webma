# ROADMAP.md

Ranked ideas not built in the Phase 6-9 passes (release/growth,
release/advantage), by impact ÷ effort, highest first. None of these were
started shallow — each is a real, multi-file feature that deserves its own
session rather than a half-built version behind a flag.

Phase 8's own webma feature list (template gallery, per-section AI rewrite,
SEO panel, export to code/ZIP, forms and leads inbox, version history,
accessibility check) is **not** included here — every item on it was
checked against the actual codebase first; all but one (the accessibility
check) already existed, and that one was built this pass. See AUDIT.md's
"Phase 6-7" and "Phase 8-9" sections for the full checked-first list.

## 1. Admin errors view (Sentry-linked)

**Impact: high, Effort: medium.** `/admin` covers users, subscriptions,
payments, templates, feedback, audit log, AI usage, and feature flags — but
not errors. Sentry captures exceptions today (when `NEXT_PUBLIC_SENTRY_DSN`
is set), but there's no in-admin view of them; an admin has to leave the app
and go to sentry.io. A real version would pull recent issues via Sentry's
API (needs `SENTRY_AUTH_TOKEN`, already in `.env.example`) into a page
matching the existing admin list pattern.

## 2. Outbound webhooks with HMAC signing + delivery log

**Impact: high for API/integration customers, Effort: high.** webma
receives webhooks (Paddle, Supabase's user-created event) but doesn't send
any — a customer integrating webma into their own stack (e.g. "notify my
Slack when a generation completes") has no way to subscribe to one. Needs:
a webhook-subscriptions table, HMAC signing (mirroring how
`verifyPaddleWebhook`/the user-created webhook already verify *incoming*
signatures), retries with backoff, and a delivery log visible to the
subscriber.

## 3. Background job queue with dead-letter state

**Impact: medium-high, Effort: high.** Long AI generations currently run
synchronously within the request/response cycle (with client-side polling
for deploy status as the one place this app already queues work). A real
queue (cron-polled table or a hosted queue) would let generation survive a
serverless function timeout on a very large site, and give webhook
delivery (item 2) a natural retry mechanism to build on.

## 4. Public API v1 docs page + OpenAPI spec

**Impact: medium, Effort: medium.** `/api/v1/projects` exists and is
versioned, but undocumented — a customer with an API key has to read this
repo's source to know what it does. Needs an OpenAPI spec (generated or
hand-written) and a docs page, likely at `/docs/api`.

## 5. Workspaces/teams RBAC beyond owner/member

**Impact: medium, Effort: medium.** `organization_members` currently has
two roles (owner/member). A `viewer`-tier role (read-only project access,
no billing/invite rights) is a common ask once teams grow past a
founder-and-one-collaborator size, and the schema/RLS changes are
contained to that one table plus its policies.

## 6. Activation checklist for new users

**Impact: medium, Effort: low-medium.** A first-time dashboard visitor
lands on an empty project list with no guided next step. A dismissible
checklist ("Generate your first site → Preview it → Try an AI edit →
Deploy or export") on the dashboard home page is a real, contained growth
feature — deferred this pass because Phase 6 had a full slate of larger
items already (referrals, pricing toggle, blog, AI cost tracking).

## 7. Try-before-signup demo on the landing page

**Impact: medium for conversion, Effort: medium-high.** A rate-limited,
no-signup-required mini version of generation on the landing page itself.
Real engineering cost: it needs its own credit-free rate limit, a
stripped-down generation path, and careful abuse-limiting since it has no
account to rate-limit against — closer to a small project than a quick
addition.

## 8. Outbound "Made with webma" badge on free-plan output

**Impact: low-medium, Effort: needs a product decision first.** Free-plan
generated sites don't currently have a badge because there's no
webma-hosted public URL to attach one to — export and deploy both go to
the user's own Vercel/Netlify account or a ZIP download, not a webma
subdomain. This needs a decision on whether to build a webma-hosted
preview subdomain (a real infrastructure addition) before a badge makes
sense at all.

## 9. Lighthouse performance budget verification

**Impact: low (already reasonably fast), Effort: low, but needs a live
deployment.** Phase 6's SEO/performance checklist item couldn't be
verified in this environment (no live URL to run Lighthouse against).
Worth a real pass once a staging URL exists — likely already close to
budget given the marketing pages' small bundle sizes confirmed in this
session's own build output.

## 10. Contact form message inbox

**Impact: low, Effort: low.** `/contact` currently notifies
`ADMIN_NOTIFICATION_EMAIL` only, with no persisted record — if that env
var isn't set, or the email bounces, the message is gone. A
`contact_messages` table + a small admin inbox page (same shape as the
feedback list) would make this durable, at the cost of one more table for
what's currently a rare, low-volume form.
