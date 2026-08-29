import { describe, it, expect } from "vitest";
import {
  isTemplateLocked,
  filterTemplates,
  sortTemplates,
  distinctFacets,
  extractKeywords,
  scoreTemplateMatch,
  recommendTemplates,
  type TemplateSummary,
} from "@/lib/templates";

function makeTemplate(overrides: Partial<TemplateSummary> = {}): TemplateSummary {
  return {
    id: "t1",
    category: "Business",
    name: "Modern Business",
    description: "A clean, professional site for a consulting firm.",
    tags: ["consulting", "corporate"],
    style: "minimal",
    industry: "consulting",
    tierRequired: "free",
    thumbnail: null,
    isFeatured: false,
    useCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isTemplateLocked", () => {
  it("is unlocked when the user's plan meets the required tier exactly", () => {
    expect(isTemplateLocked("pro", "pro", false)).toBe(false);
  });

  it("is unlocked when the user's plan exceeds the required tier", () => {
    expect(isTemplateLocked("starter", "business", false)).toBe(false);
  });

  it("is locked when the user's plan is below the required tier", () => {
    expect(isTemplateLocked("business", "free", false)).toBe(true);
  });

  it("free templates are unlocked for every plan, including free itself", () => {
    expect(isTemplateLocked("free", "free", false)).toBe(false);
    expect(isTemplateLocked("free", "business", false)).toBe(false);
  });

  it("admins can use every template regardless of its required tier", () => {
    expect(isTemplateLocked("business", "free", true)).toBe(false);
  });

  it("treats an unrecognized required-tier value as locked rather than silently unlocked", () => {
    // The original inline version of this check (indexOf on an unknown
    // value returning -1, compared against a 0-3 user tier index) would
    // have treated a garbage tier_required value as always-unlocked — an
    // unsafe default for anything gating access. This is the fix.
    expect(isTemplateLocked("nonexistent-tier", "business", false)).toBe(true);
  });

  it("treats an unrecognized user plan as the most restrictive tier, not the least", () => {
    expect(isTemplateLocked("free", "some-unknown-plan", false)).toBe(true);
  });
});

describe("sortTemplates", () => {
  const templates = [
    makeTemplate({ id: "a", useCount: 5, isFeatured: false, createdAt: "2026-01-01T00:00:00.000Z" }),
    makeTemplate({ id: "b", useCount: 50, isFeatured: true, createdAt: "2026-03-01T00:00:00.000Z" }),
    makeTemplate({ id: "c", useCount: 20, isFeatured: false, createdAt: "2026-02-01T00:00:00.000Z" }),
  ];

  it("popular sorts by use count descending", () => {
    expect(sortTemplates(templates, "popular").map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("newest sorts by created date descending", () => {
    expect(sortTemplates(templates, "newest").map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("featured puts featured templates first, then breaks ties by popularity", () => {
    expect(sortTemplates(templates, "featured").map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input array", () => {
    const original = [...templates];
    sortTemplates(templates, "popular");
    expect(templates).toEqual(original);
  });
});

describe("filterTemplates", () => {
  const templates = [
    makeTemplate({ id: "a", category: "Business", industry: "consulting", style: "minimal", tags: ["corporate"] }),
    makeTemplate({ id: "b", category: "Restaurant", industry: "food", style: "bold", tags: ["menu", "bistro"], name: "Bistro" }),
    makeTemplate({ id: "c", category: "Portfolio", industry: "creative", style: "minimal", tags: ["photographer"], isFavorited: true }),
  ];

  it("filters by category", () => {
    expect(filterTemplates(templates, { category: "Restaurant" }).map((t) => t.id)).toEqual(["b"]);
  });

  it("filters by industry", () => {
    expect(filterTemplates(templates, { industry: "creative" }).map((t) => t.id)).toEqual(["c"]);
  });

  it("filters by style", () => {
    expect(filterTemplates(templates, { style: "minimal" }).map((t) => t.id).sort()).toEqual(["a", "c"]);
  });

  it("filters by favoritesOnly", () => {
    expect(filterTemplates(templates, { favoritesOnly: true }).map((t) => t.id)).toEqual(["c"]);
  });

  it("matches a search query against name even when no other field matches", () => {
    expect(filterTemplates(templates, { query: "bistro" }).map((t) => t.id)).toEqual(["b"]);
  });

  it("matches a search query against tags", () => {
    expect(filterTemplates(templates, { query: "photographer" }).map((t) => t.id)).toEqual(["c"]);
  });

  it("search is case-insensitive", () => {
    expect(filterTemplates(templates, { query: "BISTRO" }).map((t) => t.id)).toEqual(["b"]);
  });

  it("combines multiple filters (AND, not OR)", () => {
    expect(filterTemplates(templates, { style: "minimal", category: "Portfolio" }).map((t) => t.id)).toEqual(["c"]);
  });

  it("an empty/whitespace query matches everything", () => {
    expect(filterTemplates(templates, { query: "   " })).toHaveLength(3);
  });
});

describe("distinctFacets", () => {
  it("derives sorted, deduplicated facet lists from the template set", () => {
    const templates = [
      makeTemplate({ category: "Restaurant", industry: "food", style: "bold" }),
      makeTemplate({ category: "Business", industry: "consulting", style: "minimal" }),
      makeTemplate({ category: "Business", industry: "consulting", style: "minimal" }),
    ];
    expect(distinctFacets(templates)).toEqual({
      categories: ["Business", "Restaurant"],
      industries: ["consulting", "food"],
      styles: ["bold", "minimal"],
    });
  });

  it("omits null industry/style rather than including a null entry", () => {
    const templates = [makeTemplate({ industry: null, style: null })];
    expect(distinctFacets(templates)).toEqual({ categories: ["Business"], industries: [], styles: [] });
  });
});

describe("extractKeywords", () => {
  it("lowercases and splits on non-alphanumeric characters", () => {
    expect(extractKeywords({ description: "A cozy Restaurant & Bar!" })).toEqual(
      new Set(["cozy", "restaurant", "bar"])
    );
  });

  it("drops words 2 characters or shorter as noise", () => {
    expect(extractKeywords({ description: "my go to spa" })).toEqual(new Set(["spa"]));
  });

  it("combines every input field", () => {
    const words = extractKeywords({ description: "site", websiteType: "portfolio", style: "bold", colorPreference: "warm" });
    expect(words).toEqual(new Set(["site", "portfolio", "bold", "warm"]));
  });

  it("returns an empty set for no input", () => {
    expect(extractKeywords({}).size).toBe(0);
  });
});

describe("scoreTemplateMatch", () => {
  it("weighs an industry match highest", () => {
    const t = makeTemplate({ industry: "restaurant", style: "bold", category: "Services", tags: [] });
    expect(scoreTemplateMatch(t, new Set(["restaurant"]))).toBe(3);
  });

  it("sums multiple matching signals", () => {
    const t = makeTemplate({ industry: "restaurant", style: "bold", category: "restaurant", tags: ["cozy"] });
    expect(scoreTemplateMatch(t, new Set(["restaurant", "bold", "cozy"]))).toBe(3 + 2 + 2 + 1);
  });

  it("is zero when nothing matches", () => {
    const t = makeTemplate({ industry: "restaurant", style: "bold", tags: ["cozy"] });
    expect(scoreTemplateMatch(t, new Set(["unrelated"]))).toBe(0);
  });
});

describe("recommendTemplates", () => {
  const templates = [
    makeTemplate({ id: "restaurant", industry: "restaurant", category: "Services", tags: ["cozy"] }),
    makeTemplate({ id: "portfolio", industry: "photography", category: "Personal", tags: ["minimal"] }),
    makeTemplate({ id: "unrelated", industry: "legal", category: "Business", tags: [], isFeatured: true }),
  ];

  it("recommends the best-matching template first", () => {
    const result = recommendTemplates(templates, { description: "I run a cozy restaurant" });
    expect(result[0].id).toBe("restaurant");
  });

  it("falls back to featured/popular ordering when there's nothing to match against", () => {
    const result = recommendTemplates(templates, {});
    expect(result[0].id).toBe("unrelated"); // the only featured template
  });

  it("falls back to featured/popular ordering when nothing scores above zero", () => {
    const result = recommendTemplates(templates, { description: "xyz totally unrelated gibberish" });
    expect(result[0].id).toBe("unrelated");
  });

  it("respects the limit", () => {
    const result = recommendTemplates(templates, { description: "cozy restaurant photography legal" }, 2);
    expect(result).toHaveLength(2);
  });
});
