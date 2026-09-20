import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { validate } from "@/lib/validation";
import { redeemReferral } from "@/lib/referrals";
import { reportError } from "@/lib/error-report";

const redeemSchema = z.object({ code: z.string().min(1).max(32) });

// Called right after signup (immediate-session case) or from /auth/callback
// (email-confirmation case) — see src/lib/referrals.ts's module comment for
// why it's safe to call from both places for the same user.
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = await checkRateLimit(`${user!.id}:redeem-referral`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ message: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(redeemSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  try {
    await redeemReferral(user!.id, parsed.data.code);
  } catch (err) {
    // A referral redemption failing must never block or error out the
    // signup flow it's attached to — log and report success regardless.
    reportError("referral redemption failed", err, { userId: user!.id });
  }

  return NextResponse.json({ ok: true });
}
