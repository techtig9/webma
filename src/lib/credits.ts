// Central credit-cost table + feature gating.
// Every AI-generation, export, and deployment route must call canUseFeature()
// before doing paid work, per the spec's "Feature Gating Logic" section.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendCreditsLowEmail } from "@/lib/email";

// Set TESTING_MODE=true in your env while testing to make every gated action
// unlimited for every user. Set it back to false before going live.
const TESTING_MODE = process.env.TESTING_MODE === "true";

export type PlanId = "free" | "starter" | "pro" | "business";

export type Action =
  | "generate_full_website"
  | "generate_from_url"
  | "regenerate_complete"
  | "generate_landing_page"
  | "generate_new_page"
  | "generate_new_section"
  | "ai_edit"
  | "change_theme"
  | "voice_prompt"
  | "generate_image"
  | "export_code"
  | "deploy_vercel";

// Internal engineering reference only — never surface this table on the public pricing page.
export const ACTION_COSTS: Record<Action, number> = {
  generate_full_website: 2500,
  generate_from_url: 3000,
  regenerate_complete: 750,
  generate_landing_page: 750,
  generate_new_page: 500,
  generate_new_section: 200,
  ai_edit: 350,
  change_theme: 100,
  voice_prompt: 50,
  // Priced above ai_edit despite being a single call, unlike every other
  // action in this table which is a text-generation call: per-image cost
  // from real image-generation providers (OpenAI, Stability, etc.) is
  // meaningfully higher than a text completion of comparable size. This
  // number is a reasonable placeholder relative to the rest of the table,
  // not derived from a live provider invoice — retune against actual
  // per-image billing before this feature is priced for real customers.
  generate_image: 600,
  export_code: 0,
  deploy_vercel: 0,

};
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

// Feature flags referenced by canUseFeature beyond raw credit balance.
export const PLAN_FEATURES: Record<PlanId, {
  fullStackGeneration: boolean;
  generateFromUrl: boolean;
  aiEditing: boolean;
  voiceAssistant: boolean;
  aiImageGeneration: boolean;
  zipExport: boolean;
  deployVercel: boolean;
  customDomains: number;   // -1 = unlimited
  versionHistory: number; // -1 = unlimited
  priorityGeneration: boolean;
}> = {
  free: {
    fullStackGeneration: true,
    generateFromUrl: false,
    aiEditing: false,
    voiceAssistant: false,
    aiImageGeneration: false,
    zipExport: false,
    deployVercel: false,
    customDomains: 0,
    versionHistory: 0,
    priorityGeneration: false,
  },
  starter: {
    fullStackGeneration: true,
    generateFromUrl: true,
    aiEditing: true,
    voiceAssistant: true,
    aiImageGeneration: false,
    zipExport: true,
    deployVercel: true,
    customDomains: 1,
    versionHistory: 5,
    priorityGeneration: false,
  },
  pro: {
    fullStackGeneration: true,
    generateFromUrl: true,
    aiEditing: true,
    voiceAssistant: true,
    aiImageGeneration: true,
    zipExport: true,
    deployVercel: true,
    customDomains: 5,
    versionHistory: 25,
    priorityGeneration: true,
  },
  business: {
    fullStackGeneration: true,
    generateFromUrl: true,
    aiEditing: true,
    voiceAssistant: true,
    aiImageGeneration: true,
    zipExport: true,
    deployVercel: true,
    customDomains: -1,
    versionHistory: -1,
    priorityGeneration: true,
  },
};

// Actions gated on a feature flag in addition to raw credit cost.
const ACTION_FLAG: Partial<Record<Action, keyof (typeof PLAN_FEATURES)["free"]>> = {
  generate_full_website: "fullStackGeneration",
  generate_from_url: "generateFromUrl",
  ai_edit: "aiEditing",
  generate_new_page: "aiEditing",
  voice_prompt: "voiceAssistant",
  generate_image: "aiImageGeneration",
  export_code: "zipExport",
  deploy_vercel: "deployVercel",
};

export type GateResult =
  | { allowed: true; creditsAfter: number; isAdmin: boolean }
  | { allowed: false; reason: "no_subscription" | "feature_locked" | "insufficient_credits"; message: string };

/**
 * Shared check used by every AI-generation, export, and deployment API route.
 * 1. TESTING_MODE -> always allow, no deduction (testing phase only).
 * 2. role === 'admin' -> always allow, no deduction.
 * 3. else look up active plan + feature flags.
 * 4. check credit cost against creditsRemaining.
 * 5. deny with an upgrade-prompt message, or deduct and allow.
 *
 * Deduction itself happens in `spendCredits` after the action actually succeeds
 * (credits are only ever taken on confirmed success — see Credit Rules in the spec).
 *
 * KNOWN LIMITATION, narrowed but not fully closed: this check and the later
 * deduction in spendCredits are still two separate steps, not one atomic
 * check-and-reserve. Two requests fired at nearly the same instant, both
 * arriving while the balance is just above the cost, can both pass this
 * gate before either has deducted. Two mitigations now stand between that
 * and an actual problem:
 *   1. acquireLock/releaseLock (rate-limit.ts), per user+action+project,
 *      closes the common case — a double-click or retry of the SAME
 *      action — before the second request ever reaches this gate's
 *      expensive downstream work.
 *   2. decrement_credits itself (migration 20260829000005) no longer
 *      silently clamps away a shortfall: it reports whether the deduction
 *      it just performed was fully covered, and spendCredits logs it when
 *      not. The balance still never goes negative, and a legitimately
 *      completed generation is never turned into a client-facing error
 *      over this — but the event is now observable instead of invisible.
 * What remains open: two DIFFERENT actions for the same user, racing
 * within the same round trip, at the exact moment their combined cost
 * exceeds the balance a single gate check saw. Closing that fully means
 * reserving the cost atomically at gate time and refunding on failure
 * across all 7 credit-costing routes' success/failure control flow — a
 * larger change whose refund path needs real traffic (or real provider
 * calls) to verify, not something to restructure and ship unverified.
 */
export async function canUseFeature(userId: string, action: Action): Promise<GateResult> {
  if (TESTING_MODE) {
    return { allowed: true, creditsAfter: Infinity, isAdmin: false };
  }

  const supabase = createServiceRoleClient();

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (user?.role === "admin") {
    return { allowed: true, creditsAfter: Infinity, isAdmin: true };
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, credits_remaining")
    .eq("user_id", userId)
    .single();

  if (!sub || sub.status !== "active") {
    return {
      allowed: false,
      reason: "no_subscription",
      message: "You need an active plan to do this. Upgrade to continue.",
    };
  }

  const plan = sub.plan as PlanId;
  const flag = ACTION_FLAG[action];
  if (flag && !PLAN_FEATURES[plan][flag]) {
    return {
      allowed: false,
      reason: "feature_locked",
      message: `This feature isn't included in your ${plan} plan. Upgrade to unlock it.`,
    };
  }

  const cost = ACTION_COSTS[action];
  if (sub.credits_remaining < cost) {
    return {
      allowed: false,
      reason: "insufficient_credits",
      message: `This action costs ${cost} credits, but you only have ${sub.credits_remaining} left this cycle. Upgrade or wait for renewal.`,
    };
  }

  return { allowed: true, creditsAfter: sub.credits_remaining - cost, isAdmin: false };
}

/**
 * Deducts credits after a successful AI action and writes an audit row.
 * Cache hits are logged with cacheHit=true and cost 0, per the "duplicate requests
 * hit the cache" credit rule — pass creditsOverride: 0 for those calls.
 */
export async function spendCredits(
  userId: string,
  action: Action,
  opts: { isAdmin: boolean; cacheHit?: boolean; projectId?: string; creditsOverride?: number }
) {
  if (opts.isAdmin) return; // admin bypass — never deduct, never log a spend

  const supabase = createServiceRoleClient();
  const cost = opts.cacheHit ? 0 : opts.creditsOverride ?? ACTION_COSTS[action];

  const { data: fullyCovered, error: deductError } = await supabase.rpc("decrement_credits", {
    p_user_id: userId,
    p_amount: cost,
  });
  if (deductError) throw deductError;
  if (fullyCovered === false) {
    // The gate check in canUseFeature authorized this cost against a balance
    // that a concurrent, different action has since spent past — see the
    // migration adding this return value for the full explanation. The work
    // this call is billing for already happened and was already persisted,
    // so it still completes (never turn a successful generation into an
    // error over this); what changes is that the shortfall is now visible
    // instead of silently clamped away.
    console.error(
      "Credit shortfall: a concurrent action already spent past what this action's gate check authorized",
      { userId, action, cost }
    );
  }

  await supabase.from("credit_ledger").insert({
    user_id: userId,
    action,
    credits_delta: -cost,
    cache_hit: opts.cacheHit ?? false,
    project_id: opts.projectId,
  });

  // Fire-and-forget: never awaited into the caller's response, since an AI
  // action's latency shouldn't include a low-balance-email round trip. A
  // failure here (missing RESEND_API_KEY, a transient outage) is logged and
  // otherwise invisible — it never turns a successful generation into an
  // error response over something this secondary.
  maybeSendLowCreditWarning(supabase, userId).catch((err) =>
    console.error("low-credit warning check failed", err, "user:", userId)
  );
}

/** Fraction of a plan's credit allowance at or below which a user gets the
 * "running low" warning email — exported so the threshold logic itself is
 * unit-testable without needing a database. */
export const LOW_CREDIT_WARNING_RATIO = 0.1;

export function isLowCredit(remaining: number, allowance: number): boolean {
  return allowance > 0 && remaining <= allowance * LOW_CREDIT_WARNING_RATIO;
}

/** Checks whether the deduction that just happened crossed the low-credit
 * threshold, and if so, sends the warning at most once per billing cycle.
 * "At most once" is enforced with an atomic conditional update — claiming
 * low_credit_alert_sent_at via `.is(..., null)` in the same UPDATE that
 * checks it, rather than a separate read-then-write, so two concurrent
 * requests that both cross the threshold at nearly the same moment can't
 * both win the check and both send the email. The flag is cleared back to
 * null on a real renewal (see the Paddle webhook's isNewCycle branch), so
 * the warning can fire again next cycle. */
async function maybeSendLowCreditWarning(supabase: ReturnType<typeof createServiceRoleClient>, userId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("credits_remaining, credits_allowance, low_credit_alert_sent_at")
    .eq("user_id", userId)
    .single();
  if (!sub || sub.low_credit_alert_sent_at || !isLowCredit(sub.credits_remaining, sub.credits_allowance)) return;

  const { data: claimed } = await supabase
    .from("subscriptions")
    .update({ low_credit_alert_sent_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("low_credit_alert_sent_at", null)
    .select("user_id")
    .maybeSingle();
  if (!claimed) return; // another concurrent request already claimed it

  const { data: user } = await supabase.from("users").select("email, name").eq("id", userId).single();
  if (!user) return;

  await sendCreditsLowEmail(user.email, user.name, sub.credits_remaining, sub.credits_allowance);
}

/** Refunds credits for a failed AI request, per the "failed requests auto-refund" rule. */
export async function refundCredits(userId: string, action: Action, projectId?: string) {
  const supabase = createServiceRoleClient();
  const cost = ACTION_COSTS[action];

  await supabase.rpc("increment_credits", { p_user_id: userId, p_amount: cost }).throwOnError();

  await supabase.from("credit_ledger").insert({
    user_id: userId,
    action,
    credits_delta: cost,
    cache_hit: false,
    project_id: projectId,
  });
}

/**
 * Domain limits are a COUNT gate (how many are attached across all of a user's
 * projects), not a per-action credit cost — separate from canUseFeature for that
 * reason, but built on the same plan lookup.
 */
export async function canAddDomain(userId: string): Promise<GateResult> {
  if (TESTING_MODE) {
    return { allowed: true, creditsAfter: 0, isAdmin: false };
  }

  const supabase = createServiceRoleClient();

  const { data: user } = await supabase.from("users").select("role").eq("id", userId).single();
  if (user?.role === "admin") return { allowed: true, creditsAfter: Infinity, isAdmin: true };

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .single();

  if (!sub || sub.status !== "active") {
    return { allowed: false, reason: "no_subscription", message: "You need an active plan to add a domain." };
  }

  const plan = sub.plan as PlanId;
  const limit = PLAN_FEATURES[plan].customDomains;
  if (limit === 0) {
    return {
      allowed: false,
      reason: "feature_locked",
      message: "Custom domains aren't included in your plan. Upgrade to Starter or higher.",
    };
  }

  if (limit !== -1) {
    const { count } = await supabase
      .from("custom_domains")
      .select("id, projects!inner(user_id)", { count: "exact", head: true })
      .eq("projects.user_id", userId);

    if ((count ?? 0) >= limit) {
      return {
        allowed: false,
        reason: "feature_locked",
        message: `Your plan allows ${limit} custom domain${limit === 1 ? "" : "s"}. Remove one or upgrade to add more.`,
      };
    }
  }

  return { allowed: true, creditsAfter: 0, isAdmin: false };
        }
