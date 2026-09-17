import { describe, it, expect } from "vitest";
import { buildEnrichedDescription } from "@/lib/structured-form";

describe("buildEnrichedDescription", () => {
  it("returns the description unchanged when no optional fields are provided", () => {
    expect(buildEnrichedDescription({ description: "A bakery site." })).toBe("A bakery site.");
  });

  it("appends a pages hint when provided", () => {
    const result = buildEnrichedDescription({ description: "A bakery site.", pages: ["Home", "Menu", "Contact"] });
    expect(result).toContain("A bakery site.");
    expect(result).toContain("exactly these pages: Home, Menu, Contact");
  });

  it("appends an audience hint when provided", () => {
    const result = buildEnrichedDescription({ description: "A bakery site.", targetAudience: "local families" });
    expect(result).toContain("Primary audience: local families.");
  });

  it("appends a call-to-action hint when provided", () => {
    const result = buildEnrichedDescription({ description: "A bakery site.", primaryCta: "Order online" });
    expect(result).toContain("Main call to action: Order online.");
  });

  it("combines all three hints when all are provided, each once", () => {
    const result = buildEnrichedDescription({
      description: "A bakery site.",
      pages: ["Home", "About", "Contact"],
      targetAudience: "local families",
      primaryCta: "Order online",
    });
    expect(result).toContain("exactly these pages: Home, About, Contact");
    expect(result).toContain("Primary audience: local families.");
    expect(result).toContain("Main call to action: Order online.");
  });

  it("trims the original description before appending hints", () => {
    const result = buildEnrichedDescription({ description: "  A bakery site.  ", pages: ["Home"] });
    expect(result.startsWith("A bakery site.")).toBe(true);
  });

  it("ignores an empty pages list and empty-string optional fields the same as omitted ones", () => {
    const result = buildEnrichedDescription({ description: "A bakery site.", pages: [], targetAudience: "" });
    expect(result).toBe("A bakery site.");
  });
});
