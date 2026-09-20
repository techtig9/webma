import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** Admin listing — unlike /api/templates/list (the public marketplace read),
 * this returns EVERY template regardless of is_active, since deactivated
 * templates are exactly the ones an admin needs to find again to reactivate.
 * Never selects `structure`, same reasoning as the public list route: that's
 * a large per-template JSON blob only needed once, when actually editing one
 * template (see /api/admin/templates/detail). */
export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("templates")
    .select("id, category, name, description, tags, style, industry, tier_required, thumbnail, is_featured, is_active, use_count, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: "Couldn't load templates." }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}
