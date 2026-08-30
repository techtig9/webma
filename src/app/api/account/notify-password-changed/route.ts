import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendPasswordChangedEmail } from "@/lib/email";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/error-report";

/** Called client-side right after a successful password change
 * (dashboard/profile/page.tsx's changePassword()) — a real security event
 * worth a receipt, same reasoning as notify-login. A failed send here never
 * blocks or fails the password change itself; the change already succeeded
 * by the time this fires. */
export async function POST() {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = await checkRateLimit(`${user!.id}:notify-password-changed`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ ok: true }); // never surface a rate limit on a fire-and-forget notification
  }

  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase.from("users").select("name").eq("id", user!.id).maybeSingle();

  try {
    await sendPasswordChangedEmail(user!.email ?? "", profile?.name ?? "");
  } catch (err) {
    reportError("password-changed email failed", err, { userId: user!.id });
  }

  return NextResponse.json({ ok: true });
}
