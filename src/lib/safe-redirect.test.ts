import { describe, it, expect } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";

// Regression coverage for the open-redirect guard: the auth callback
// redirects to `${origin}${next}` after a successful login, so `next` must
// never be allowed to escape this app's own origin — a protocol-relative
// URL like "//evil.com" (browsers treat this as an absolute URL using the
// current page's protocol) or an absolute URL would otherwise turn a real,
// trusted post-login redirect into a phishing vector.
describe("safeNextPath", () => {
  it("passes through a genuine same-origin relative path", () => {
    expect(safeNextPath("/dashboard/settings")).toBe("/dashboard/settings");
  });

  it("falls back to /dashboard when next is null", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
  });

  it("falls back to /dashboard when next is an empty string", () => {
    expect(safeNextPath("")).toBe("/dashboard");
  });

  it("rejects a protocol-relative URL (the open-redirect vector)", () => {
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("//evil.com/phish")).toBe("/dashboard");
  });

  it("rejects an absolute URL with a scheme", () => {
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeNextPath("http://evil.com/dashboard")).toBe("/dashboard");
  });

  it("rejects a path that doesn't start with a single slash", () => {
    expect(safeNextPath("dashboard")).toBe("/dashboard");
    expect(safeNextPath("evil.com")).toBe("/dashboard");
  });

  it("allows a relative path with a query string or hash", () => {
    expect(safeNextPath("/dashboard/generator?project=abc")).toBe("/dashboard/generator?project=abc");
    expect(safeNextPath("/dashboard#billing")).toBe("/dashboard#billing");
  });
});
