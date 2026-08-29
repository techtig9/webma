import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isTemplateLocked } from "@/lib/templates";
import type { TemplateFilters, TemplateSort } from "@/lib/templates";
import { filterTemplates, distinctFacets } from "@/lib/templates";

const VALID_SORTS: TemplateSort[] = ["featured", "popular", "newest"];

/** Replaces the old "select every column including `structure`, group by
 * category client-side" query the templates page used to run — that
 * doesn't scale past a handful of templates (it ships every template's
 * full component-file JSON to the browser on every page load, whether or
 * not it's ever opened) and has no way to search or filter. This route
 * does the filtering/sorting server-side via the same pure functions
 * templates.ts exports (so the logic is identical to, and tested by,
 * templates.test.ts — not reimplemented here), and never selects
 * `structure` at all: that large JSON blob is only ever fetched by
 * /api/templates/use, at the moment it's actually needed. */
export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const url = new URL(request.url);
  const sortParam = url.searchParams.get("sort");
  const sort: TemplateSort = VALID_SORTS.includes(sortParam as TemplateSort) ? (sortParam as TemplateSort) : "featured";

  const filters: TemplateFilters = {
    query: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    industry: url.searchParams.get("industry") ?? undefined,
    style: url.searchParams.get("style") ?? undefined,
    favoritesOnly: url.searchParams.get("favoritesOnly") === "true",
    sort,
  };

  const supabase = createServiceRoleClient();

  const [{ data: templates, error }, { data: profile }, { data: sub }, { data: favorites }] = await Promise.all([
    supabase
      .from("templates")
      .select("id, category, name, description, tags, style, industry, tier_required, thumbnail, is_featured, use_count, created_at"),
    supabase.from("users").select("role").eq("id", user!.id).single(),
    supabase.from("subscriptions").select("plan").eq("user_id", user!.id).single(),
    supabase.from("template_favorites").select("template_id").eq("user_id", user!.id),
  ]);

  if (error) {
    return NextResponse.json({ message: "Couldn't load templates." }, { status: 500 });
  }

  const favoritedIds = new Set((favorites ?? []).map((f) => f.template_id));
  const isAdmin = profile?.role === "admin";
  const userPlan = sub?.plan ?? "free";

  const summaries = (templates ?? []).map((t) => ({
    id: t.id,
    category: t.category,
    name: t.name,
    description: t.description,
    tags: t.tags,
    style: t.style,
    industry: t.industry,
    tierRequired: t.tier_required,
    thumbnail: t.thumbnail,
    isFeatured: t.is_featured,
    useCount: t.use_count,
    createdAt: t.created_at,
    isFavorited: favoritedIds.has(t.id),
    locked: isTemplateLocked(t.tier_required, userPlan, isAdmin),
  }));

  const filtered = filterTemplates(summaries, filters);
  const facets = distinctFacets(summaries);

  return NextResponse.json({ templates: filtered, facets, total: filtered.length });
}
