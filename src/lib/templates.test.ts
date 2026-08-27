import { describe, it, expect } from "vitest";
import { isTemplateLocked } from "@/lib/templates";

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
