import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildAuthorizeUrl, signOAuthState } from "@/lib/deploy-oauth";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const state = signOAuthState("netlify", user!.id);
  const url = buildAuthorizeUrl("netlify", state);

  if (!url) {
    const settingsUrl = new URL("/dashboard/settings", request.url);
    settingsUrl.searchParams.set("error", "netlify_oauth_not_configured");
    return NextResponse.redirect(settingsUrl);
  }

  return NextResponse.redirect(url);
}
