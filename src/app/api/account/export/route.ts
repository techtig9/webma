import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Self-service GDPR-style data export — sits next to the existing
// account-deletion route (src/app/api/account/delete/route.ts). Returns
// everything the app stores that's genuinely the user's own data. Secret
// material is deliberately excluded even though it's "theirs": api_keys'
// key_hash (a one-way hash re-derived from the original key, not reversible
// or useful to the user anyway) and deploy_connections' token ciphertext/
// secret-store IDs (re-exporting a live OAuth token would be a credential
// leak, not a data export).
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const userId = user!.id;

  const [profile, subscriptions, projects, payments, creditLedger, apiKeys, customDomains, deployConnections, templateFavorites, orgMemberships] =
    await Promise.all([
      supabase.from("users").select("*").eq("id", userId).maybeSingle(),
      supabase.from("subscriptions").select("*").eq("user_id", userId),
      supabase.from("projects").select("*").eq("user_id", userId),
      supabase.from("payments").select("*").eq("user_id", userId),
      supabase.from("credit_ledger").select("*").eq("user_id", userId),
      supabase.from("api_keys").select("id, name, key_prefix, created_at, last_used_at").eq("user_id", userId),
      supabase.from("custom_domains").select("*").eq("user_id", userId),
      supabase
        .from("deploy_connections")
        .select("id, provider, provider_account_email, created_at, expires_at")
        .eq("user_id", userId),
      supabase.from("template_favorites").select("*").eq("user_id", userId),
      supabase.from("organization_members").select("*").eq("user_id", userId),
    ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    profile: profile.data ?? null,
    subscriptions: subscriptions.data ?? [],
    projects: projects.data ?? [],
    payments: payments.data ?? [],
    creditLedger: creditLedger.data ?? [],
    apiKeys: apiKeys.data ?? [],
    customDomains: customDomains.data ?? [],
    deployConnections: deployConnections.data ?? [],
    templateFavorites: templateFavorites.data ?? [],
    organizationMemberships: orgMemberships.data ?? [],
  });
}
