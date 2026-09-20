import { describe, it, expect } from "vitest";
import { auditAccessibility } from "@/lib/a11y-audit";
import type { Page } from "@/lib/preview";

function page(overrides: Partial<Page> = {}): Page {
  return { slug: "index", path: "/", name: "Home", sections: ["Hero"], ...overrides };
}

describe("auditAccessibility — heading order", () => {
  it("does not flag a normal sequential heading order", () => {
    const files = { "components/Hero.tsx": `<h1>Title</h1><h2>Sub</h2><h3>Sub-sub</h3>` };
    const result = auditAccessibility(files, [page()]);
    expect(result.issues.filter((i) => i.category === "heading-order")).toEqual([]);
  });

  it("does not flag jumping back up multiple levels (h3 -> h1 is a normal new-section pattern)", () => {
    const files = { "components/Hero.tsx": `<h1>Title</h1><h2>Sub</h2><h3>Sub-sub</h3><h1>New section</h1>` };
    expect(auditAccessibility(files, [page()]).issues.filter((i) => i.category === "heading-order")).toEqual([]);
  });

  it("flags a forward skip (h1 straight to h3)", () => {
    const files = { "components/Hero.tsx": `<h1>Title</h1><h3>Skipped h2</h3>` };
    const result = auditAccessibility(files, [page()]);
    const issues = result.issues.filter((i) => i.category === "heading-order");
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].message).toContain("<h1>");
    expect(issues[0].message).toContain("<h3>");
  });
});

describe("auditAccessibility — vague link text", () => {
  it("flags an <a> whose only text is a generic phrase", () => {
    const files = { "components/Hero.tsx": `<a href="/about">Click here</a>` };
    const result = auditAccessibility(files, [page()]);
    const issues = result.issues.filter((i) => i.category === "vague-link-text");
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
  });

  it("does not flag a link with real, specific text", () => {
    const files = { "components/Hero.tsx": `<a href="/about">About our team</a>` };
    const result = auditAccessibility(files, [page()]);
    expect(result.issues.filter((i) => i.category === "vague-link-text")).toEqual([]);
  });

  it("flags a <button> with generic text the same way", () => {
    const files = { "components/Hero.tsx": `<button>Learn more</button>` };
    const result = auditAccessibility(files, [page()]);
    expect(result.issues.filter((i) => i.category === "vague-link-text")).toHaveLength(1);
  });
});

describe("auditAccessibility — composition and scoring", () => {
  it("reuses seo-audit's alt-text/labels/accessible-names checks", () => {
    const files = { "components/Hero.tsx": `<img src="/a.png"><input id="email">` };
    const result = auditAccessibility(files, [page()]);
    const categories = new Set(result.issues.map((i) => i.category));
    expect(categories.has("alt-text")).toBe(true);
    expect(categories.has("labels")).toBe(true);
  });

  it("scores a clean page at 100 with no issues", () => {
    const files = {
      "components/Hero.tsx": `<h1>Welcome</h1><h2>About us</h2><a href="/contact">Contact our team</a>`,
    };
    const result = auditAccessibility(files, [page()]);
    expect(result.score).toBe(100);
    expect(result.issues).toEqual([]);
  });

  it("deducts more for errors than warnings", () => {
    const files = { "components/Hero.tsx": `<img src="/a.png"><a href="/x">click here</a>` };
    const result = auditAccessibility(files, [page()]);
    const errorCount = result.issues.filter((i) => i.severity === "error").length;
    const warningCount = result.issues.filter((i) => i.severity === "warning").length;
    expect(errorCount).toBeGreaterThan(0);
    expect(warningCount).toBeGreaterThan(0);
    expect(result.score).toBe(100 - errorCount * 8 - warningCount * 3);
  });
});
