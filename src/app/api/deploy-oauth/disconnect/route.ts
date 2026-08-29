import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { provider } = (await request.json().catch(() => ({}))) as { provider?: string };
  // Was hard-coded to reject anything but "vercel" — since GitHub OAuth
  // connections have been supported since deploy-oauth.ts's DeployProvider
  // type was extended to "vercel" | "github" (see ProjectSettingsPanel.tsx's
  // link to /api/deploy-oauth/github/authorize), that meant a user could
  // connect GitHub but never revoke it through the app.
  if (provider !== "vercel" && provider !== "github") {
    return NextResponse.json({ message: "provider must be 'vercel' or 'github'." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  await supabase.from("deploy_connections").delete().eq("user_id", user!.id).eq("provider", provider);

  return NextResponse.json({ ok: true });
}
