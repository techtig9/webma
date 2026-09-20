// Referral program core logic (fix-all.md Phase 6). Two entry points call
// into redeemReferral() — the signup page (immediate-session case) and
// /auth/callback (email-confirmation case) — since a code passed at signUp()
// time isn't available again once the user finishes confirming their email
// from a link in that email. Both paths are safe to call unconditionally:
// the `referrals.referred_user_id` UNIQUE constraint means whichever fires
// first wins and the second is a harmless no-op (see the migration).

import { createServiceRoleClient } from "@/lib/supabase/server";
import crypto from "crypto";

const REFERRER_BONUS_CREDITS = 500;
const REFERRED_BONUS_CREDITS = 500;
// Abuse limit: caps how many of a single referrer's invites can earn a
// credit reward in a given calendar month — high enough to reward a real
// advocate, low enough that farming fake signups isn't a meaningful way to
// generate free credits (500 credits is worth roughly one ai_edit-tier
// action; 10/month is 5,000 credits, about one Starter plan's monthly
// allotment — a real, but bounded, incentive).
const MAX_CREDITED_REFERRALS_PER_MONTH = 10;

function generateCode(): string {
  // 8 chars of base32-ish alphabet, no ambiguous characters (0/O, 1/I/L) —
  // meant to be read aloud or typed by hand, not just clicked as a link.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (const byte of crypto.randomBytes(8)) {
    code += alphabet[byte % alphabet.length];
  }
  return code;
}

/** Returns the user's existing referral code, generating and persisting one
 * on first call. Retries on the (astronomically unlikely) unique-constraint
 * collision rather than trusting a single random draw is always unique. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase.from("users").select("referral_code").eq("id", userId).maybeSingle();
  if (existing?.referral_code) return existing.referral_code;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await supabase.from("users").update({ referral_code: code }).eq("id", userId);
    if (!error) return code;
    if (!error.message.includes("duplicate") && !error.message.includes("unique")) throw error;
  }
  throw new Error("Couldn't generate a unique referral code after 5 attempts.");
}

export interface ReferralStats {
  code: string;
  totalReferred: number;
  creditedReferrals: number;
  creditsEarned: number;
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const code = await getOrCreateReferralCode(userId);
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("referrals").select("credited, credits_granted").eq("referrer_id", userId);
  const rows = data ?? [];
  return {
    code,
    totalReferred: rows.length,
    creditedReferrals: rows.filter((r) => r.credited).length,
    creditsEarned: rows.reduce((sum, r) => sum + r.credits_granted, 0),
  };
}

/** Redeems a referral code for a newly created user. Safe to call more than
 * once for the same newUserId (see the module comment) and safe to call with
 * an invalid/unknown code (silently does nothing) — signup must never fail
 * or even surface an error over a bad referral code. */
export async function redeemReferral(newUserId: string, code: string): Promise<void> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return;

  const supabase = createServiceRoleClient();

  const { data: referrer } = await supabase.from("users").select("id").eq("referral_code", trimmed).maybeSingle();
  if (!referrer || referrer.id === newUserId) return; // unknown code, or someone using their own code

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count: creditedThisMonth } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", referrer.id)
    .eq("credited", true)
    .gte("created_at", monthStart.toISOString());

  const underMonthlyCap = (creditedThisMonth ?? 0) < MAX_CREDITED_REFERRALS_PER_MONTH;

  const { error: insertError } = await supabase.from("referrals").insert({
    referrer_id: referrer.id,
    referred_user_id: newUserId,
    credited: underMonthlyCap,
    credits_granted: underMonthlyCap ? REFERRER_BONUS_CREDITS : 0,
  });
  // A unique-violation here means this user was already credited by an
  // earlier call (the other entry point winning the race) — not an error.
  if (insertError) return;

  if (underMonthlyCap) {
    await supabase.rpc("grant_bonus_credits", { p_user_id: referrer.id, p_amount: REFERRER_BONUS_CREDITS }).throwOnError();
    await supabase
      .rpc("grant_bonus_credits", { p_user_id: newUserId, p_amount: REFERRED_BONUS_CREDITS })
      .throwOnError();
    await supabase.from("credit_ledger").insert([
      { user_id: referrer.id, action: "referral_bonus", credits_delta: REFERRER_BONUS_CREDITS },
      { user_id: newUserId, action: "referral_signup_bonus", credits_delta: REFERRED_BONUS_CREDITS },
    ]);
  }
}
