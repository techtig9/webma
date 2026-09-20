// Plan pricing/credit constants only — no Supabase or email imports, unlike
// credits.ts (which re-exports these). Kept as its own leaf module so a
// client component (e.g. Pricing.tsx) can import just the numbers without
// pulling credits.ts's server-only dependency chain into the browser bundle.

export type PlanId = "free" | "starter" | "pro" | "business";

export const PLAN_CREDITS: Record<PlanId, number> = {
  free: 3_000,
  starter: 10_000,
  pro: 30_000,
  business: 75_000,
};

/** Monthly list price in USD — the single source of truth for MRR estimates.
 * Keep in sync with the figures shown in Pricing.tsx and the billing page.
 *
 * These are FOUNDING-MEMBER prices: a flat 20% off STANDARD_PLAN_PRICES on every
 * paid plan, locked in for as long as a customer who joins during the launch
 * window stays subscribed. Swap which one feeds Paddle checkout/price-ID lookups
 * once the founding window ends — that's a deliberate manual cutover, not a timer. */
export const PLAN_PRICES: Record<PlanId, number> = {
  free: 0,
  starter: 9.6,
  pro: 19.2,
  business: 39.2,
};

export const STANDARD_PLAN_PRICES: Record<PlanId, number> = {
  free: 0,
  starter: 12,
  pro: 24,
  business: 49,
};
