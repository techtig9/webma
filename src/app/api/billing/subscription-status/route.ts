import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { PLAN_FEATURES, type PlanId } from "@/lib/credits";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase.from("users").select("role").eq("id", user!.id).single();

  if (profile?.role === "admin") {
    return NextResponse.json({
      plan: "business",
      status: "active",
      creditsRemaining: null, // effectively unlimited
      creditsAllowance: null,
      isAdmin: true,
      domainCount: 0,
      domainLimit: -1,
    });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, credits_remaining, credits_allowance, renews_at")
    .eq("user_id", user!.id)
    .single();

  const domainLimit = sub ? PLAN_FEATURES[sub.plan as PlanId].customDomains : 0;
  const { count: domainCount } = await supabase
    .from("custom_domains")
    .select("id, projects!inner(user_id)", { count: "exact", head: true })
    .eq("projects.user_id", user!.id);

  return NextResponse.json({ ...sub, isAdmin: false, domainCount: domainCount ?? 0, domainLimit });
}
