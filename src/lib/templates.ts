import type { PlanId } from "@/lib/credits";

export const TIER_ORDER: PlanId[] = ["free", "starter", "pro", "business"];

/** Whether a template requiring `tierRequired` is locked for someone on
 * `userPlan`. Previously lived only inline in the templates display page —
 * extracted because the same check needs to be enforced server-side too
 * (see /api/templates/use), where it actually matters for security: a
 * locked template hidden in the UI is not the same as one a direct API
 * call can't bypass. Admins always pass, matching the page's existing
 * behavior. */
export function isTemplateLocked(tierRequired: string, userPlan: string, isAdmin: boolean): boolean {
  if (isAdmin) return false;
  const requiredIndex = TIER_ORDER.indexOf(tierRequired as PlanId);
  const userIndex = TIER_ORDER.indexOf(userPlan as PlanId);
  // An unrecognized tier value should never grant access silently — treat
  // an unknown required tier as maximally restrictive rather than as -1
  // comparing favorably against everything.
  if (requiredIndex === -1) return true;
  return requiredIndex > userIndex;
}

// ---------------------------------------------------------------------------
// Template marketplace: search, filter, sort, recommend
// ---------------------------------------------------------------------------
// A "template" in this app is a fully-built {files, pages} structure —
// /api/templates/use clones it verbatim into a new project, the same shape
// a real project_versions row already has. The functions below operate on
// just the searchable metadata (never the actual file content, which stays
// out of list responses entirely — see /api/templates/list), so this module
// has no database dependency and every rule here is unit-testable without
// a live Supabase project.

export interface TemplateSummary {
  id: string;
  category: string;
  name: string;
  description: string;
  tags: string[];
  style: string | null;
  industry: string | null;
  tierRequired: string;
  thumbnail: string | null;
  isFeatured: boolean;
  useCount: number;
  createdAt: string;
  isFavorited?: boolean;
}

export type TemplateSort = "featured" | "popular" | "newest";

export interface TemplateFilters {
  query?: string;
  category?: string;
  industry?: string;
  style?: string;
  sort?: TemplateSort;
  favoritesOnly?: boolean;
}

/** Case-insensitive substring match across every field a person would
 * plausibly search by — name, description, category, industry, style, and
 * tags. A template only needs to match on ONE of these, not all, since a
 * search for "restaurant" should surface a template whose only mention of
 * "restaurant" is in its industry field even if the name is "Bistro". */
function matchesQuery(t: TemplateSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.category.toLowerCase().includes(q) ||
    (t.industry?.toLowerCase().includes(q) ?? false) ||
    (t.style?.toLowerCase().includes(q) ?? false) ||
    t.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

export function sortTemplates(templates: TemplateSummary[], sort: TemplateSort): TemplateSummary[] {
  const copy = [...templates];
  switch (sort) {
    case "popular":
      return copy.sort((a, b) => b.useCount - a.useCount);
    case "newest":
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "featured":
    default:
      // Featured templates first, then by proven popularity within each
      // group — a real, behavior-driven default rather than an arbitrary one.
      return copy.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.useCount - a.useCount);
  }
}

/** The single function the templates/list route and the marketplace UI's
 * client-side re-filtering both call — search text, category/industry/style
 * facets, and a favorites-only toggle, composed in one place so search and
 * filters can never drift into two different implementations of "match". */
export function filterTemplates(templates: TemplateSummary[], filters: TemplateFilters): TemplateSummary[] {
  let result = templates;
  if (filters.category) result = result.filter((t) => t.category === filters.category);
  if (filters.industry) result = result.filter((t) => t.industry === filters.industry);
  if (filters.style) result = result.filter((t) => t.style === filters.style);
  if (filters.favoritesOnly) result = result.filter((t) => t.isFavorited);
  if (filters.query) result = result.filter((t) => matchesQuery(t, filters.query!));
  return sortTemplates(result, filters.sort ?? "featured");
}

/** Every distinct category/industry/style value present in the current
 * template set, for building filter-chip UIs — derived from the data
 * itself rather than a hardcoded list, so a newly added template's
 * industry/style automatically becomes a filterable facet with no UI
 * change required. */
export function distinctFacets(templates: TemplateSummary[]): { categories: string[]; industries: string[]; styles: string[] } {
  const categories = new Set<string>();
  const industries = new Set<string>();
  const styles = new Set<string>();
  for (const t of templates) {
    categories.add(t.category);
    if (t.industry) industries.add(t.industry);
    if (t.style) styles.add(t.style);
  }
  return {
    categories: [...categories].sort(),
    industries: [...industries].sort(),
    styles: [...styles].sort(),
  };
}

export interface RecommendationInput {
  description?: string;
  websiteType?: string;
  style?: string;
  colorPreference?: string;
}

/** Words worth matching against — anything under 3 characters is almost
 * always noise ("a", "an", "my", "of") rather than a genuine signal like
 * "salon" or "saas". Deliberately simple (no stemming, no synonyms): a
 * template tagged "restaurant" won't match a description saying
 * "restaurants" — a real limitation, not hidden, and a reasonable trade
 * for a heuristic whose entire value is being fast, deterministic, and
 * explainable rather than a black box. */
export function extractKeywords(input: RecommendationInput): Set<string> {
  const raw = [input.description, input.websiteType, input.style, input.colorPreference].filter(Boolean).join(" ");
  return new Set(
    raw
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2)
  );
}

/** Scores one template against a keyword set — industry match weighs most
 * (the strongest signal of "is this the right kind of site"), then style,
 * then category, then each matching tag. Simple deduction/addition model
 * in the same spirit as seo-audit.ts's SEVERITY_PENALTY: someone looking at
 * why a template was recommended should be able to reconstruct the score
 * from the fields alone, not need to trust a black box. */
export function scoreTemplateMatch(t: TemplateSummary, words: Set<string>): number {
  let score = 0;
  if (t.industry && words.has(t.industry.toLowerCase())) score += 3;
  if (t.style && words.has(t.style.toLowerCase())) score += 2;
  if (words.has(t.category.toLowerCase())) score += 2;
  for (const tag of t.tags) {
    if (words.has(tag.toLowerCase())) score += 1;
  }
  return score;
}

/** Recommends templates for a person's generation prompt/follow-up answers
 * — used on the describe step to suggest "start from a template like this
 * instead" and on the templates page's "Recommended for you" rail. Falls
 * back to the same featured/popular ordering the default template browse
 * view uses when there's no text to match against, or nothing scores above
 * zero, rather than returning an empty, dead-feeling list. */
export function recommendTemplates(templates: TemplateSummary[], input: RecommendationInput, limit = 6): TemplateSummary[] {
  const words = extractKeywords(input);
  if (words.size === 0) return sortTemplates(templates, "featured").slice(0, limit);

  const scored = templates
    .map((t) => ({ t, score: scoreTemplateMatch(t, words) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return sortTemplates(templates, "featured").slice(0, limit);
  return scored.slice(0, limit).map((s) => s.t);
}
