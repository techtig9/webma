import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendLoginNotificationEmail } from "@/lib/email";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

// Handles both the Google OAuth redirect and Supabase's email verification /
// password reset links, which all pass a `code` param to exchange for a session.

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  // Google/Supabase append these instead of `code` when the OAuth flow
  // itself failed before ever reaching this app — the user cancelled on
  // Google's consent screen (`access_denied`), the Google provider isn't
  // enabled in the Supabase project, etc. Capturing the real reason (server
  // log only — never forwarded to the client as free text, since it's
  // provider-controlled input) is what makes this diagnosable instead of a
  // silent dead end; the previous version discarded it entirely.
  const providerError = searchParams.get("error");
  const providerErrorDescription = searchParams.get("error_description");

  if (providerError) {
    console.error("OAuth provider returned an error", { providerError, providerErrorDescription });
    const reason = providerError === "access_denied" ? "cancelled" : "provider_error";
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Only for a genuine sign-in — Supabase's email verification and
      // password recovery links also pass through this same code-exchange
      // path, each with a `type` param (e.g. type=recovery, type=signup)
      // that a plain OAuth login doesn't carry. Sending "you just logged
      // in" while someone is mid-password-reset would be actively
      // misleading, not just redundant, so this only fires when that
      // param is absent — the reasonable, standard-Supabase-convention
      // signal for "this really was an OAuth sign-in," though unverified
      // against a live project (see docs/DEPLOYMENT_CHECKLIST.md).
      if (!searchParams.get("type") && data.user?.email) {
        const serviceClient = createServiceRoleClient();
        const { data: profile } = await serviceClient.from("users").select("name").eq("id", data.user.id).maybeSingle();
        sendLoginNotificationEmail(data.user.email, profile?.name ?? "").catch((err) =>
          console.error("login notification email failed", err)
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Supabase code exchange failed", error.message);
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  console.error("Auth callback hit with neither a code nor a provider error param");
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
