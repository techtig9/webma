import { NextResponse } from "next/server";
import { exchangeCodeForToken, verifyOAuthState } from "@/lib/deploy-oauth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const settingsUrl = new URL("/dashboard/settings", origin);

  if (!code || !state) {
    settingsUrl.searchParams.set("error", "netlify_oauth_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const userId = verifyOAuthState("netlify", state);
  if (!userId) {
    settingsUrl.searchParams.set("error", "netlify_oauth_expired");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const token = await exchangeCodeForToken("netlify", code);
    const supabase = createServiceRoleClient();

    const { data: accessTokenSecretId } = await supabase.rpc("deploy_token_encrypt", {
      p_token: token.accessToken,
    });
    const refreshTokenSecretId = token.refreshToken
      ? (await supabase.rpc("deploy_token_encrypt", { p_token: token.refreshToken })).data
      : null;

    await supabase.from("deploy_connections").upsert(
      {
        user_id: userId,
        provider: "netlify",
        access_token_secret_id: accessTokenSecretId!,
        refresh_token_secret_id: refreshTokenSecretId,
        expires_at: token.expiresAt,
      },
      { onConflict: "user_id,provider" }
    );
    settingsUrl.searchParams.set("connected", "netlify");

  return NextResponse.redirect(settingsUrl);
}
