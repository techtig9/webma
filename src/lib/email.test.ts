import { describe, it, expect, vi, beforeEach } from "vitest";

const send = vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null });
const writeAuditLog = vi.fn().mockResolvedValue(undefined);

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send } })),
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog }));

describe("email.ts", () => {
  beforeEach(() => {
    send.mockClear();
    send.mockResolvedValue({ data: { id: "email-1" }, error: null });
    writeAuditLog.mockClear();
    vi.resetModules();
    process.env.RESEND_API_KEY = "test-key";
    process.env.EMAIL_FROM = "webma <hello@webma.app>";
    process.env.NEXT_PUBLIC_APP_URL = "https://webma.app";
    delete process.env.EMAIL_TEST_OVERRIDE_TO;
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
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

  it("throws a clear error instead of a cryptic SDK failure when EMAIL_FROM is missing", async () => {
    delete process.env.EMAIL_FROM;
    const { sendLoginNotificationEmail } = await import("@/lib/email");
    await expect(sendLoginNotificationEmail("jordan@example.com", "Jordan")).rejects.toThrow(
      "EMAIL_FROM is not set"
    );
  });

  it("sendWelcomeEmail and sendLoginNotificationEmail use different subjects, so recipients can tell them apart", async () => {
    const { sendWelcomeEmail, sendLoginNotificationEmail } = await import("@/lib/email");
    await sendWelcomeEmail("jordan@example.com", "Jordan");
    await sendLoginNotificationEmail("jordan@example.com", "Jordan");
    const subjects = send.mock.calls.map((c) => c[0].subject);
    expect(new Set(subjects).size).toBe(2);
  });

  describe("resolveRecipient / EMAIL_TEST_OVERRIDE_TO", () => {
    it("returns the real address unchanged when no override is set", async () => {
      const { resolveRecipient } = await import("@/lib/email");
      expect(resolveRecipient("jordan@example.com")).toBe("jordan@example.com");
    });

    it("redirects to the override address when EMAIL_TEST_OVERRIDE_TO is set", async () => {
      process.env.EMAIL_TEST_OVERRIDE_TO = "staging-inbox@webma.app";
      const { resolveRecipient } = await import("@/lib/email");
      expect(resolveRecipient("jordan@example.com")).toBe("staging-inbox@webma.app");
    });

    it("an overridden send goes to the override address, and the real recipient is preserved in the subject", async () => {
      process.env.EMAIL_TEST_OVERRIDE_TO = "staging-inbox@webma.app";
      const { sendWelcomeEmail } = await import("@/lib/email");
      await sendWelcomeEmail("real-user@example.com", "Jordan");

      const call = send.mock.calls[0][0];
      expect(call.to).toBe("staging-inbox@webma.app");
      expect(call.subject).toContain("real-user@example.com");
    });
  });

  describe("tracked send logging (event/recipient/type/provider result/failure reason)", () => {
    it("logs a success with the provider message id, never the API key", async () => {
      const { sendWelcomeEmail } = await import("@/lib/email");
      await sendWelcomeEmail("jordan@example.com", "Jordan");

      expect(writeAuditLog).toHaveBeenCalledTimes(1);
      const entry = writeAuditLog.mock.calls[0][0];
      expect(entry.action).toBe("email.sent");
      expect(entry.metadata).toMatchObject({ type: "welcome", recipient: "jordan@example.com", providerMessageId: "email-1" });
      expect(JSON.stringify(entry)).not.toContain("test-key");
    });

    it("logs a failure with the reason when Resend itself reports an error, and still throws", async () => {
      send.mockResolvedValueOnce({ data: null, error: { message: "Resend rejected the request" } });
      const { sendWelcomeEmail } = await import("@/lib/email");
      await expect(sendWelcomeEmail("jordan@example.com", "Jordan")).rejects.toThrow("Resend rejected the request");

      expect(writeAuditLog).toHaveBeenCalledTimes(1);
      const entry = writeAuditLog.mock.calls[0][0];
      expect(entry.action).toBe("email.failed");
      expect(entry.metadata.reason).toContain("Resend rejected the request");
    });
  });

  describe("notifyAdmin", () => {
    it("does nothing when ADMIN_NOTIFICATION_EMAIL isn't configured", async () => {
      const { notifyAdmin } = await import("@/lib/email");
      await notifyAdmin("new_signup", { email: "jordan@example.com" });
      expect(send).not.toHaveBeenCalled();
    });

    it("sends to the configured admin address with the event details when configured", async () => {
      process.env.ADMIN_NOTIFICATION_EMAIL = "owner@webma.app";
      const { notifyAdmin } = await import("@/lib/email");
      await notifyAdmin("new_signup", { email: "jordan@example.com", plan: "free" });

      expect(send).toHaveBeenCalledTimes(1);
      const call = send.mock.calls[0][0];
      expect(call.to).toBe("owner@webma.app");
      expect(call.html).toContain("jordan@example.com");
      expect(call.html).toContain("free");
    });

    it("never throws even if the underlying send fails", async () => {
      process.env.ADMIN_NOTIFICATION_EMAIL = "owner@webma.app";
      delete process.env.EMAIL_FROM; // forces sendTrackedEmail to throw internally
      const { notifyAdmin } = await import("@/lib/email");
      await expect(notifyAdmin("new_signup", { email: "jordan@example.com" })).resolves.toBeUndefined();
    });
  });

  describe("new transactional email templates render their key details", () => {
    it("sendSubscriptionConfirmedEmail mentions the plan name", async () => {
      const { sendSubscriptionConfirmedEmail } = await import("@/lib/email");
      await sendSubscriptionConfirmedEmail("jordan@example.com", "Jordan", "pro");
      expect(send.mock.calls[0][0].html).toContain("pro");
    });

    it("sendPaymentConfirmedEmail formats the amount as currency", async () => {
      const { sendPaymentConfirmedEmail } = await import("@/lib/email");
      await sendPaymentConfirmedEmail("jordan@example.com", "Jordan", 19.2, "USD");
      expect(send.mock.calls[0][0].html).toContain("$19.20");
    });

    it("sendCreditsLowEmail shows remaining and allowance", async () => {
      const { sendCreditsLowEmail } = await import("@/lib/email");
      await sendCreditsLowEmail("jordan@example.com", "Jordan", 250, 10000);
      const html = send.mock.calls[0][0].html;
      expect(html).toContain("250");
      expect(html).toContain("10,000");
    });

    it("sendPasswordChangedEmail is distinguishable from the login notification", async () => {
      const { sendPasswordChangedEmail, sendLoginNotificationEmail } = await import("@/lib/email");
      await sendPasswordChangedEmail("jordan@example.com", "Jordan");
      await sendLoginNotificationEmail("jordan@example.com", "Jordan");
      const subjects = send.mock.calls.map((c) => c[0].subject);
      expect(new Set(subjects).size).toBe(2);
    });
  });
});
