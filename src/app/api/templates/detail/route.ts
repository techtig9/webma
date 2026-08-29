import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isTemplateLocked } from "@/lib/templates";
import { resolvePages } from "@/lib/preview";

/** Powers the template preview modal — the one place a template's actual
 * file content is fetched before a project is created from it (see
 * /api/templates/use). Kept as a separate route from /api/templates/list
 * deliberately: the list route can return dozens of templates cheaply
 * because it never selects `structure`; this route selects it for exactly
 * one template, on demand, only when someone actually opens a preview.
 *
 * A locked template's content is still returned here — the preview is
 * meant to show what an upgrade unlocks, same as any real template
 * marketplace. `locked` comes back in the response so the UI can swap the
 * "Use this template" button for an upgrade prompt; the real enforcement
 * still lives entirely in /api/templates/use, same as before. */
export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const templateId = new URL(request.url).searchParams.get("templateId");
  if (!templateId) {
    return NextResponse.json({ message: "templateId is required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const [{ data: template }, { data: profile }, { data: sub }] = await Promise.all([
    supabase
      .from("templates")
      .select("id, category, name, description, tags, style, industry, tier_required, structure")
      .eq("id", templateId)
      .maybeSingle(),
    supabase.from("users").select("role").eq("id", user!.id).single(),
    supabase.from("subscriptions").select("plan").eq("user_id", user!.id).single(),
  ]);

  if (!template) {
    return NextResponse.json({ message: "Template not found." }, { status: 404 });
  }

  const isAdmin = profile?.role === "admin";
  const locked = isTemplateLocked(template.tier_required, sub?.plan ?? "free", isAdmin);

  const structure = template.structure as { files?: Record<string, string>; pages?: unknown } | null;
  const files = structure?.files ?? {};
  const pages = resolvePages(files, (structure?.pages as ReturnType<typeof resolvePages>) ?? null);

  return NextResponse.json({
    id: template.id,
    category: template.category,
    name: template.name,
    description: template.description,
    tags: template.tags,
    style: template.style,
    industry: template.industry,
    tierRequired: template.tier_required,
    locked,
    files,
    pages,
  });
}
