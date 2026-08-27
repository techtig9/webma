import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null });

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send } })),
}));

describe("email.ts", () => {
  beforeEach(() => {
    send.mockClear();
    vi.resetModules();
    process.env.RESEND_API_KEY = "test-key";
    process.env.EMAIL_FROM = "webma <hello@webma.app>";
    process.env.NEXT_PUBLIC_APP_URL = "https://webma.app";
  });

  it("sendLoginNotificationEmail sends to the given address with a clear subject", async () => {
    const { sendLoginNotificationEmail } = await import("@/lib/email");
    await sendLoginNotificationEmail("jordan@example.com", "Jordan");

    expect(send).toHaveBeenCalledTimes(1);
    const call = send.mock.calls[0][0];
    expect(call.to).toBe("jordan@example.com");
    expect(call.subject).toContain("sign-in");
    expect(call.html).toContain("Jordan");
  });

  it("sendLoginNotificationEmail falls back to a generic greeting when no name is given", async () => {
    const { sendLoginNotificationEmail } = await import("@/lib/email");
    await sendLoginNotificationEmail("jordan@example.com", "");
    expect(send.mock.calls[0][0].html).toContain("Hi there");
  });

  it("sendLoginNotificationEmail mentions what to do if the sign-in wasn't the recipient", async () => {
    const { sendLoginNotificationEmail } = await import("@/lib/email");
    await sendLoginNotificationEmail("jordan@example.com", "Jordan");
    expect(send.mock.calls[0][0].html).toContain("reset");
  });

  it("throws a clear error instead of a cryptic SDK failure when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const { sendLoginNotificationEmail } = await import("@/lib/email");
    await expect(sendLoginNotificationEmail("jordan@example.com", "Jordan")).rejects.toThrow(
      "RESEND_API_KEY is not set"
    );
  });

  it("sendWelcomeEmail and sendLoginNotificationEmail use different subjects, so recipients can tell them apart", async () => {
    const { sendWelcomeEmail, sendLoginNotificationEmail } = await import("@/lib/email");
    await sendWelcomeEmail("jordan@example.com", "Jordan");
    await sendLoginNotificationEmail("jordan@example.com", "Jordan");
    const subjects = send.mock.calls.map((c) => c[0].subject);
    expect(new Set(subjects).size).toBe(2);
  });
});
