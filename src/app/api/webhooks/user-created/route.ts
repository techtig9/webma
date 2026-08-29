import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendWelcomeEmail, notifyAdmin } from "@/lib/email";

/** Constant-time secret comparison — matches the standard this app already
 * holds its OTHER webhook (Paddle's, via verifyPaddleWebhook) to. A plain
 * `!==` leaks how many leading characters matched through response timing;
 * hashing both sides to a fixed-length digest first also sidesteps
 * crypto.timingSafeEqual's own requirement that both buffers be the same
 * length, which a raw compare of two different-length strings would violate. */
function secretsMatch(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  const expected = process.env.USER_EVENTS_WEBHOOK_SECRET;
  if (!expected || !secret || !secretsMatch(secret, expected)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const record = payload.record; // Supabase sends { type, table, record, ... }
  if (!record?.email) {
    return NextResponse.json({ message: "No email on record" }, { status: 400 });
  }

  try {
    await sendWelcomeEmail(record.email, record.name);
  } catch (err) {
    console.error("welcome email failed", err);
    // Don't fail the webhook response over an email hiccup — Supabase will retry otherwise.
  }

  // Fire-and-forget and self-contained (notifyAdmin never throws) — a
  // signup should never fail, or even slow down, over the owner's own
  // notification. No-ops entirely when ADMIN_NOTIFICATION_EMAIL isn't set.
  notifyAdmin("new_signup", { email: record.email, name: record.name ?? "" });

  return NextResponse.json({ received: true });
}
