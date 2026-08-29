import { describe, it, expect } from "vitest";
import { parse } from "@babel/parser";
import { buildRootLayout, buildAnalyticsTrackerComponent } from "@/lib/scaffold";

describe("buildRootLayout", () => {
  it("includes the SEO title and description", () => {
    const layout = buildRootLayout({ seoTitle: "Nova Agency", seoDescription: "We build brands." });
    expect(layout).toContain('"Nova Agency"');
    expect(layout).toContain('"We build brands."');
  });

  it("includes an openGraph image block only when one is provided", () => {
    const withImage = buildRootLayout({ seoTitle: "T", seoDescription: "D", ogImageUrl: "https://x.com/og.png" });
    expect(withImage).toContain("openGraph");
    expect(withImage).toContain("https://x.com/og.png");

    const withoutImage = buildRootLayout({ seoTitle: "T", seoDescription: "D" });
    expect(withoutImage).not.toContain("openGraph");
  });

  it("includes no analytics tracking script at all when analyticsProjectId is omitted (the export/download case) — the JSON-LD script below is unrelated and always present", () => {
    const layout = buildRootLayout({ seoTitle: "T", seoDescription: "D" });
    expect(layout).not.toContain("/api/public/analytics/track");
    expect(layout).not.toContain("WebmaAnalyticsTracker");
  });

  it("always includes a WebSite JSON-LD structured-data script, regardless of analytics — closes the gap seo-audit.ts's checkStructuredData otherwise always flags", () => {
    const withTracking = buildRootLayout({ seoTitle: "Nova Agency", seoDescription: "We build brands.", analyticsProjectId: "p1" });
    const withoutTracking = buildRootLayout({ seoTitle: "Nova Agency", seoDescription: "We build brands." });
    for (const layout of [withTracking, withoutTracking]) {
      expect(layout).toContain('type="application/ld+json"');
      expect(layout).toContain("https://schema.org");
      expect(layout).toContain('\\"@type\\":\\"WebSite\\"');
      expect(layout).toContain("Nova Agency");
    }
  });

  it("escapes a '<' in the title/description so structured data can't break out of its own script tag", () => {
    const layout = buildRootLayout({ seoTitle: "T</script><script>alert(1)</script>", seoDescription: "D" });
    // Isolate the JSON-LD script's own embedded content — the ONLY spot this
    // matters, since that's what actually becomes live HTML at runtime via
    // dangerouslySetInnerHTML. (metadata.title elsewhere in this same output
    // legitimately still contains the raw substring: it's TypeScript source
    // that gets compiled, never itself parsed as HTML by a browser.)
    const ldJsonMatch = layout.match(/type="application\/ld\+json" dangerouslySetInnerHTML=\{\{ __html: (.+?) \}\}/);
    expect(ldJsonMatch).not.toBeNull();
    expect(ldJsonMatch![1]).not.toContain("<script>alert(1)</script>");
    expect(ldJsonMatch![1]).toContain("\\u003cscript");
  });

  it("includes an import of the analytics tracker component when analyticsProjectId is provided (the deploy case)", () => {
    const layout = buildRootLayout({
      seoTitle: "T",
      seoDescription: "D",
      analyticsProjectId: "proj-123",
      analyticsAppUrl: "https://webma.app",
    });
    expect(layout).toContain('import WebmaAnalyticsTracker from "./_webma-analytics"');
    expect(layout).toContain("<WebmaAnalyticsTracker");
    expect(layout).toContain('"proj-123"');
    expect(layout).toContain("https://webma.app");
  });

  it("does not import the tracker component at all when analyticsProjectId is omitted", () => {
    const layout = buildRootLayout({ seoTitle: "T", seoDescription: "D" });
    expect(layout).not.toContain("WebmaAnalyticsTracker");
    expect(layout).not.toContain("_webma-analytics");
  });

  it("produces syntactically balanced JSX (no unclosed tags) whether or not tracking is included", () => {
    const withTracking = buildRootLayout({ seoTitle: "T", seoDescription: "D", analyticsProjectId: "p1" });
    const withoutTracking = buildRootLayout({ seoTitle: "T", seoDescription: "D" });
    for (const layout of [withTracking, withoutTracking]) {
      expect((layout.match(/<html/g) ?? []).length).toBe((layout.match(/<\/html>/g) ?? []).length);
      expect((layout.match(/<body/g) ?? []).length).toBe((layout.match(/<\/body>/g) ?? []).length);
    }
  });

  it("is actually syntactically valid TypeScript/JSX, whether or not tracking is included", () => {
    const withTracking = buildRootLayout({ seoTitle: "T", seoDescription: "D", analyticsProjectId: "p1" });
    const withoutTracking = buildRootLayout({ seoTitle: "T", seoDescription: "D" });
    for (const layout of [withTracking, withoutTracking]) {
      expect(() => parse(layout, { sourceType: "module", plugins: ["jsx", "typescript"] })).not.toThrow();
    }
  });
});

describe("buildAnalyticsTrackerComponent", () => {
  it("is a client component", () => {
    expect(buildAnalyticsTrackerComponent()).toContain('"use client"');
  });

  it("uses usePathname so it re-fires on client-side navigation, not just initial mount", () => {
    const source = buildAnalyticsTrackerComponent();
    expect(source).toContain('import { usePathname } from "next/navigation"');
    expect(source).toContain("usePathname()");
    // The dependency array must include pathname, or the effect would only
    // ever fire once on mount — exactly the limitation this component
    // exists to fix, silently reintroduced by a missing dependency.
    expect(source).toMatch(/\[pathname[,\]]/);
  });

  it("posts to the real analytics tracking endpoint", () => {
    expect(buildAnalyticsTrackerComponent()).toContain("/api/public/analytics/track");
  });

  it("accepts projectId and appUrl as props rather than hardcoding them, since the same component source is reused for every project", () => {
    const source = buildAnalyticsTrackerComponent();
    expect(source).toContain("projectId, appUrl");
    expect(source).not.toMatch(/projectId:\s*["']/); // no literal project id baked into the shared template
  });

  it("renders nothing visible", () => {
    expect(buildAnalyticsTrackerComponent()).toContain("return null;");
  });

  it("is actually syntactically valid TypeScript/JSX, not just string-plausible", () => {
    // String-matching (the tests above) can pass on subtly broken output —
    // an actual parse is the only real confirmation this compiles. Reuses
    // the exact parser config jsx-tree.ts already validated in Phase 9.
    expect(() => parse(buildAnalyticsTrackerComponent(), { sourceType: "module", plugins: ["jsx", "typescript"] })).not.toThrow();
  });
});
