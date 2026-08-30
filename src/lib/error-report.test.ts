import { describe, it, expect, vi, beforeEach } from "vitest";
import { reportError } from "@/lib/error-report";

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

describe("reportError", () => {
  beforeEach(() => {
    captureException.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("logs to console and reports the same error to Sentry", () => {
    const err = new Error("boom");
    reportError("deploy-vercel error", err, { userId: "user-1" });

    expect(console.error).toHaveBeenCalledWith("deploy-vercel error", err, { userId: "user-1" });
    expect(captureException).toHaveBeenCalledWith(err, {
      extra: { message: "deploy-vercel error", userId: "user-1" },
    });
  });

  it("works without context — a common case for fire-and-forget email failures", () => {
    const err = new Error("send failed");
    reportError("welcome email failed", err);

    expect(captureException).toHaveBeenCalledWith(err, { extra: { message: "welcome email failed" } });
  });

  it("reports non-Error values too — some catch sites pass a Postgres error object or a plain string", () => {
    reportError("paddle webhook payload has no event_id", "transaction.completed");

    expect(captureException).toHaveBeenCalledWith("transaction.completed", {
      extra: { message: "paddle webhook payload has no event_id" },
    });
  });
});
