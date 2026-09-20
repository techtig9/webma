# AUDIT.md — release/design

Branch: `release/design`, created from `origin/main` (the default branch) per
instruction. Scope: fix-all.md **Phase 3 (design) only** — visual layer only,
no logic/route/data-model/auth changes. Direction used: **indigo to sky,
canvas-style hero cycling template previews** (explicitly named for this
pass, superseding `main`'s current solid-orange brand — see "Note" below).

## Important context carried over from earlier sessions

`main` does **not** contain the P0–P3 bug-fix work done on `fix/audit` /
`release/clean` in a prior session (that work is still unmerged on those
branches). `main` instead has its own separate recent history (PRs #5–#9:
invisible-input-text fix, real template thumbnails, dedicated `/pricing`
route, signup email-confirmation redirect fix, orange rebrand). This branch
is built on `main` as literally instructed, and does **not** include the
zero-env-build P0 fix — `main` still has the original bug (`ChatWidget` /
`src/lib/supabase/client.ts` construct a Supabase client eagerly with `!`
env assertions, crashing `next build` when no env vars are set). That fix is
out of scope here (Phase 3 is visual-layer-only, no logic changes) but is a
real, known blocker for a from-scratch build — flagging it explicitly rather
than silently leaving it.

**Note on the orange -> indigo/sky reversal**: `main`'s current
`tailwind.config.ts` has a comment recording a deliberate orange rebrand
"confirmed via the uploaded screenshot" of a Figma reference in an earlier
session. This design pass reverses that, per this session's explicit
instruction to use "the webma direction (indigo to sky...)". Flagging this
tension transparently in case the orange rebrand was meant to stick and this
instruction was reused from a generic template rather than a deliberate
reversal.

## What was done (visual layer only, verified)

- **Palette**: `signal`/`signal2`/`violet`/`amber` (tailwind.config.ts) retuned
  to an indigo `#6366F1` -> sky `#38BDF8` family. Token *names* unchanged, so
  every existing component using them (buttons, focus rings, links, badges)
  picked up the new identity without being touched individually — same
  pattern the prior orange rebrand used.
- Hardcoded old-brand hex values that don't go through Tailwind tokens,
  updated to match: `Logo.tsx` (logo mark gradient), `ChatWidget.tsx`
  (assistant icon), `preview.ts` (+ its test — live-preview selected-element
  outline color), `email.ts` (`BRAND_COLOR`).
- **Hero rebuilt**: canvas-style panel cycling through 4 distinct
  generated-site preview frames (digital-growth-studio / bakery / portfolio
  / travel agency — each its own palette, since they represent *other
  people's* generated sites, not webma's own brand), replacing the old
  single fixed mockup. Honors `prefers-reduced-motion` (static first frame,
  no auto-cycling, for reduced-motion visitors).
- Two real bugs caught and fixed during verification (not left for later):
  a contrast failure (white text on amber, ~1.9:1) and a Tailwind config
  collision (the project's custom `amber` token is a flat color, not a
  shade scale, so `amber-500`/`amber-300`/`amber-900` classes silently
  produced no CSS at all — moved that frame to the untouched `orange`
  family).
- Verified: `tsc --noEmit`, `eslint`, `vitest run` (465/465), `next build`
  all pass. Live Playwright check at 1440px and 390px against a production
  build (`next build && next start`): zero console errors, hero cycles
  through all 4 frames correctly, contrast fix confirmed visually.

## Explicitly deferred (not done — scope call, not an oversight)

fix-all.md's Phase 3 spec is large; the following were judged out of
reasonable scope for one pass and are **not** done. Not attempted rather
than attempted-and-broken:

- **Light/dark mode toggle** (spec: "Light and dark mode. Default to
  system, toggle persisted."). The app is currently 100%-dark, built with
  literal `text-white`/`bg-[#070a12]`-style classes throughout — not
  semantic tokens that a toggle could flip. Building this properly would
  mean rewriting color usage across most components (a genuine "big
  refactor", not a visual-layer tweak), and a half-done version (toggle
  flips the navbar/hero but Features/Pricing/FAQ/dashboard stay
  hardcoded-dark) would look broken, which is worse than not shipping it.
  **Needs decision**: is a full token migration in scope for a follow-up
  pass, or is dark-only an acceptable permanent choice (a valid, common
  pattern for this kind of product)?
- **New reusable components** the spec lists that don't exist yet: Tabs,
  Drawer (distinct from Modal), Tooltip, Table, Avatar, Progress. Already
  exist and were reused as-is: Button, Card, Badge, Modal, Toast, Skeleton
  (Skeleton already IS the shimmer requirement), Reveal (already IS the
  scroll-reveal requirement).
- Bento-grid/FAQ-accordion/pricing-toggle **content** rebuilds — the
  marketing site already has dedicated `Features`/`FAQ`/`Pricing` section
  components; this pass didn't touch their internals beyond what the
  palette rebrand cascades automatically via tokens.
- Onboarding checklist, number count-up, route/tab transitions — not
  present before this pass, not added.
- A full per-breakpoint (375/768/1280/1920) visual audit of every page —
  only the landing page (where the hero change is) was screenshot-checked
  this pass, at two widths.

## Next step if resumed

Start with the light/dark mode decision above (ask, don't guess), since
it's the largest deferred item and the one most likely to need a real
answer before more design work builds on top of a dark-only assumption.
