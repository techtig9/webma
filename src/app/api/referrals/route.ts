import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getReferralStats } from "@/lib/referrals";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const stats = await getReferralStats(user!.id);
  return NextResponse.json(stats);
}
