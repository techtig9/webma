import { NextResponse } from "next/server";
import { contactSchema, validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/visitor-tracking";
import { notifyAdmin } from "@/lib/email";

// Public, unauthenticated — webma's own "Contact us" page for visitors who
// aren't (yet) customers. Rate-limited by IP (no user identity to key on)
// and honeypot-protected, same pattern as /api/public/forms/submit.
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limitKey = ip ? `contact:${ip}` : "contact:unknown";
  const limit = await checkRateLimit(limitKey, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many messages — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(contactSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { name, email, message, website } = parsed.data;

  // Honeypot tripped — same response a genuine message gets, so a bot has
  // no signal to learn from, but never actually notify anyone.
  if (website) {
    return NextResponse.json({ ok: true });
  }

  // Reuses the existing generic admin-notification email (same one used
  // for new-signup/payment-failed/etc.) rather than adding a dedicated
  // template — a contact message is exactly that shape: one event, a
  // handful of fields, sent to ADMIN_NOTIFICATION_EMAIL. Never throws, so
  // a missing RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL degrades to a
  // silent no-op rather than a 500 — see notifyAdmin's own try/catch.
  await notifyAdmin("contact_form_submitted", { name, email, message: message.slice(0, 1000) });

  return NextResponse.json({ ok: true });
}
