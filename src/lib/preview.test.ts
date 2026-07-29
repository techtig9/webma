import { describe, it, expect } from "vitest";
import { deriveSections } from "@/lib/preview";

describe("deriveSections", () => {
  it("extracts component names from components/*.tsx paths, in order", () => {
    const files = {
      "components/Navbar.tsx": "// navbar",
      "components/Hero.tsx": "// hero",
      "components/Footer.tsx": "// footer",
    };
    expect(deriveSections(files)).toEqual(["Navbar", "Hero", "Footer"]);
  });

  it("ignores non-component files (e.g. a future config or utils file)", () => {
    const files = {
      "components/Navbar.tsx": "// navbar",
      "utils/helpers.ts": "// not a section",
      "components/Footer.tsx": "// footer",
    };
    expect(deriveSections(files)).toEqual(["Navbar", "Footer"]);
  });

  it("strips both .tsx and .ts extensions", () => {
    const files = {
      "components/About.ts": "// about",
    };
    expect(deriveSections(files)).toEqual(["About"]);
  });

  it("returns an empty array for a project with no files yet", () => {
    expect(deriveSections({})).toEqual([]);
  });
});
