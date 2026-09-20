import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** Admin-only counterpart to /api/templates/detail: returns the raw
 * `structure` blob ({files, pages}) untouched, for editing, rather than the
 * resolved/derived page list the public preview modal needs. requireAdmin,
 * not requireUser — this is the one route that hands out a template's full
 * source, which a regular user should never receive directly (they get it
 * only via /api/templates/use, which clones it straight into their own
 * project row rather than exposing it as a standalone response). */
export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const templateId = new URL(request.url).searchParams.get("templateId");
  if (!templateId) {
    return NextResponse.json({ message: "templateId is required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: template, error } = await supabase
    .from("templates")
    .select("id, category, name, description, tags, style, industry, tier_required, thumbnail, is_featured, is_active, use_count, structure, created_at")
    .eq("id", templateId)
    .maybeSingle();

  if (error || !template) {
    return NextResponse.json({ message: "Template not found." }, { status: 404 });
  }

  return NextResponse.json({ template });
}
