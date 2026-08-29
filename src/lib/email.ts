import { Resend } from "resend";
import { writeAuditLog } from "@/lib/audit";

// Lazily constructed so a missing RESEND_API_KEY doesn't crash builds or cold
// starts — matches the same defensive pattern as the optional OpenAI client in
// src/lib/gemini.ts. Callers just get a clear runtime error if it's actually used
// without a key configured, instead of the whole app failing to build.
let resend: Resend | null = null;
function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set — emails can't be sent yet.");
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/** When EMAIL_TEST_OVERRIDE_TO is set, every outgoing email is redirected to
 * that single address instead of the real recipient — the real recipient is
 * still recorded in the audit log and appended to the subject line, so a
 * staging environment can exercise the entire send pipeline (real Resend
 * call, real template, real delivery) against a safe inbox without ever
 * reaching an actual user. Unset in production. Pure/exported so this
 * routing decision is unit-testable without mocking the Resend SDK. */
export function resolveRecipient(to: string): string {
  return process.env.EMAIL_TEST_OVERRIDE_TO || to;
}

const BRAND_COLOR = "#5B6CFF";

/** Shared branded HTML wrapper every outgoing email renders through — this is
 * the "centralized template" the emails below build on rather than each
 * hand-rolling its own markup, so Webma's branding, footer, and support
 * contact stay in exactly one place. Inline styles throughout (no
 * `<style>` block) because that's what actually survives being stripped or
 * reformatted by real email clients (Gmail, Outlook) — external/embedded
 * CSS is the single most common reason a "responsive" email template
 * breaks in practice. The single max-width container with fluid inner
 * elements is the standard, durable way to get reasonable mobile behavior
 * without a full email-grid framework. */
function renderEmailLayout(opts: {
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://webma.app";
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<tr><td style="padding:28px 0 4px;">
           <a href="${opts.ctaUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;">
             ${opts.ctaLabel}
           </a>
         </td></tr>`
      : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            <tr>
              <td style="padding:28px 32px 0;">
                <span style="font-size:16px;font-weight:700;color:#111827;letter-spacing:-0.01em;">webma</span>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;">
                <h1 style="margin:0;font-size:20px;line-height:1.3;color:#111827;font-weight:700;">${opts.heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0;font-size:14px;line-height:1.6;color:#374151;">
                ${opts.bodyHtml}
              </td>
            </tr>
            <tr><td style="padding:0 32px;">${cta}</td></tr>
            <tr>
              <td style="padding:32px 32px 28px;">
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />
                <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#9ca3af;">
                  This is a transactional email related to your webma account activity.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                  Questions? Contact <a href="mailto:support@webma.app" style="color:#9ca3af;">support@webma.app</a> ·
                  <a href="${appUrl}" style="color:#9ca3af;">webma.app</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Every actual send goes through here — the single place that (a) applies
 * the dev/staging recipient override, (b) throws a clear error instead of a
 * cryptic SDK failure when required config is missing, and (c) records the
 * event/recipient/type/provider-result/failure-reason the notification
 * architecture needs for debugging delivery issues, without ever logging
 * the API key itself (writeAuditLog's metadata below never includes it —
 * only the Resend message id or a plain error message). This is also what
 * makes "don't place Resend calls randomly throughout components" true in
 * practice: every email function in this file calls this, nothing outside
 * this file ever imports the Resend SDK. */
async function sendTrackedEmail(opts: { type: string; to: string; subject: string; html: string }): Promise<void> {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM is not set — emails can't be sent yet.");
  }
  const recipient = resolveRecipient(opts.to);
  const subject = recipient === opts.to ? opts.subject : `${opts.subject} [to: ${opts.to}]`;

  try {
    const result = await getResendClient().emails.send({ from, to: recipient, subject, html: opts.html });
    if (result.error) throw new Error(result.error.message);

    await writeAuditLog({
      actorId: null,
      actorRole: "system",
      action: "email.sent",
      metadata: { type: opts.type, recipient, providerMessageId: result.data?.id ?? null },
    });
  } catch (err) {
    await writeAuditLog({
      actorId: null,
      actorRole: "system",
      action: "email.failed",
      metadata: { type: opts.type, recipient, reason: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// User lifecycle emails
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(to: string, name: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://webma.app";
  await sendTrackedEmail({
    type: "welcome",
    to,
    subject: "Welcome to webma",
    html: renderEmailLayout({
      heading: `Welcome, ${name || "there"}`,
      bodyHtml: `<p style="margin:0 0 12px;">Your webma account is ready — no extra steps needed. Log in and start generating your first site.</p>`,
      ctaLabel: "Log in",
      ctaUrl: `${appUrl}/login`,
    }),
  });
}

/** A security-notification-style email sent on every real sign-in — both
 * the email/password path (login/page.tsx) and the Google OAuth path
 * (auth/callback/route.ts). Deliberately not wired into every code exchange
 * that route handles (it also completes email verification and password
 * reset links, not just logins) — sending "you just logged in" after
 * someone verifies their email would be misleading. Callers decide when a
 * genuine login actually happened; this function only sends. */
export async function sendLoginNotificationEmail(to: string, name: string) {
  await sendTrackedEmail({
    type: "login_notification",
    to,
    subject: "New sign-in to your webma account",
    html: renderEmailLayout({
      heading: "New sign-in",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${name || "there"}, your webma account was just signed into. If this was you, no action is needed.</p>
                 <p style="margin:0;">If you don't recognize this, secure your account by resetting your password.</p>`,
    }),
  });
}

/** Sent after a password change completes (dashboard/profile/page.tsx) —
 * a real security event worth a receipt, distinct from the login
 * notification: this fires on the change itself, not on a subsequent
 * sign-in with the new password. */
export async function sendPasswordChangedEmail(to: string, name: string) {
  await sendTrackedEmail({
    type: "password_changed",
    to,
    subject: "Your webma password was changed",
    html: renderEmailLayout({
      heading: "Password changed",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${name || "there"}, the password on your webma account was just changed.</p>
                 <p style="margin:0;">If you made this change, no action is needed. If you didn't, contact support immediately — someone else may have access to your account.</p>`,
    }),
  });
}

/** Sent right before the underlying auth user is deleted (api/account/delete)
 * — the caller must fetch email/name BEFORE calling supabase.auth.admin.deleteUser,
 * since the cascade removes everything needed to send this afterward. */
export async function sendAccountDeletedEmail(to: string, name: string) {
  await sendTrackedEmail({
    type: "account_deleted",
    to,
    subject: "Your webma account has been deleted",
    html: renderEmailLayout({
      heading: "Account deleted",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${name || "there"}, your webma account and all associated projects, deployments, and billing history have been permanently deleted, as you requested.</p>
                 <p style="margin:0;">If you didn't request this, contact support right away.</p>`,
    }),
  });
}

// ---------------------------------------------------------------------------
// Billing / subscription emails
// ---------------------------------------------------------------------------

export async function sendSubscriptionConfirmedEmail(to: string, name: string, plan: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://webma.app";
  await sendTrackedEmail({
    type: "subscription_confirmed",
    to,
    subject: `You're on the webma ${plan} plan`,
    html: renderEmailLayout({
      heading: "Subscription confirmed",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${name || "there"}, your webma subscription is now active on the <strong>${plan}</strong> plan.</p>
                 <p style="margin:0;">Your credits and plan features are available right away.</p>`,
      ctaLabel: "Go to dashboard",
      ctaUrl: `${appUrl}/dashboard`,
    }),
  });
}

export async function sendPaymentConfirmedEmail(to: string, name: string, amount: number, currency: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://webma.app";
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);
  await sendTrackedEmail({
    type: "payment_confirmed",
    to,
    subject: `Payment received — ${formatted}`,
    html: renderEmailLayout({
      heading: "Payment received",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${name || "there"}, we've received your payment of <strong>${formatted}</strong>. Thanks for keeping webma running.</p>`,
      ctaLabel: "View billing",
      ctaUrl: `${appUrl}/dashboard/billing`,
    }),
  });
}

export async function sendPaymentFailedEmail(to: string, name: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://webma.app";
  await sendTrackedEmail({
    type: "payment_failed",
    to,
    subject: "Your webma payment didn't go through",
    html: renderEmailLayout({
      heading: "Payment failed",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${name || "there"}, we couldn't process your last payment. Please update your billing details to avoid losing access to your plan.</p>`,
      ctaLabel: "Update billing",
      ctaUrl: `${appUrl}/dashboard/billing`,
    }),
  });
}

export async function sendSubscriptionCanceledEmail(to: string, name: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://webma.app";
  await sendTrackedEmail({
    type: "subscription_canceled",
    to,
    subject: "Your webma subscription has been canceled",
    html: renderEmailLayout({
      heading: "Subscription canceled",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${name || "there"}, your webma subscription has been canceled. You'll keep access through the end of your current billing period.</p>
                 <p style="margin:0;">Changed your mind? You can resubscribe any time.</p>`,
      ctaLabel: "Resubscribe",
      ctaUrl: `${appUrl}/dashboard/billing`,
    }),
  });
}

/** Sent at most once per billing cycle (deduped via
 * subscriptions.low_credit_alert_sent_at, checked in spendCredits) when a
 * user's remaining balance drops under the warning threshold. */
export async function sendCreditsLowEmail(to: string, name: string, creditsRemaining: number, creditsAllowance: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://webma.app";
  await sendTrackedEmail({
    type: "credits_low",
    to,
    subject: "You're running low on webma credits",
    html: renderEmailLayout({
      heading: "Credits running low",
      bodyHtml: `<p style="margin:0 0 12px;">Hi ${name || "there"}, you have <strong>${creditsRemaining.toLocaleString()}</strong> of your <strong>${creditsAllowance.toLocaleString()}</strong> monthly credits left.</p>
                 <p style="margin:0;">Upgrade your plan for more credits, or they'll renew automatically at the start of your next billing cycle.</p>`,
      ctaLabel: "View plans",
      ctaUrl: `${appUrl}/dashboard/billing`,
    }),
  });
}

// ---------------------------------------------------------------------------
// Admin / owner notifications
// ---------------------------------------------------------------------------

/** Notifies the Webma owner/admin of an important platform event — new
 * signups, subscription changes, payments, and support feedback. Unlike
 * every user-facing email above, this NEVER throws: it's called from many
 * places as a side effect of a real user action, and an admin-notification
 * hiccup (or ADMIN_NOTIFICATION_EMAIL simply not being configured, which is
 * the default/optional state) must never surface as a failure of that
 * action. Deliberately a flat key/value details list rather than a bespoke
 * template per event type — this is an internal ops email, not a polished
 * customer-facing one, and a uniform shape is what keeps adding a new event
 * type a one-line call instead of a new template. */
export async function notifyAdmin(event: string, details: Record<string, string>): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return;

  const rows = Object.entries(details)
    .map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;color:#6b7280;">${k}</td><td style="padding:2px 0;color:#111827;">${v}</td></tr>`)
    .join("");

  try {
    await sendTrackedEmail({
      type: `admin.${event}`,
      to: adminEmail,
      subject: `[webma] ${event.replace(/_/g, " ")}`,
      html: renderEmailLayout({
        heading: event.replace(/_/g, " "),
        bodyHtml: `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:13px;">${rows}</table>`,
      }),
    });
  } catch (err) {
    console.error("admin notification failed", event, err instanceof Error ? err.message : err);
  }
}
