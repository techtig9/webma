import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendLoginNotificationEmail } from "@/lib/email";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

/** Called client-side right after a successful email/password sign-in
 * (login/page.tsx). The Google OAuth path sends this same email directly
 * from auth/callback/route.ts instead, since that flow is already
 * server-side and has no client round trip to make.
 *
 * A failed email send here never blocks or fails the login itself — the
 * person is already authenticated by the time this fires; a transient
 * Resend outage or a missing RESEND_API_KEY shouldn't turn into a broken
 * sign-in experience for something this secondary. */
export async function POST() {
  const { user, response } = await requireUser();
  if (response) return response;

  // A generous limit — this exists to stop an authenticated client from
  // hammering its own inbox / this app's Resend send quota, not to be a
  // real friction point for a legitimate caller (this fires once per login).
  const limit = await checkRateLimit(`${user!.id}:notify-login`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ ok: true }); // never surface a rate limit on a fire-and-forget notification
  }

  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase.from("users").select("name").eq("id", user!.id).maybeSingle();

  try {
    await sendLoginNotificationEmail(user!.email ?? "", profile?.name ?? "");
  } catch (err) {
    console.error("login notification email failed", err);
  }

  return NextResponse.json({ ok: true });
}
