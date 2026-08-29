import { NextResponse } from "next/server";
import { verifyPaddleWebhook, planForPriceId } from "@/lib/paddle";
import { PLAN_CREDITS } from "@/lib/credits";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import {
  sendPaymentFailedEmail,
  sendPaymentConfirmedEmail,
  sendSubscriptionConfirmedEmail,
  sendSubscriptionCanceledEmail,
  notifyAdmin,
} from "@/lib/email";

// Paddle webhooks must be verified from the RAW request body — never JSON.parse
// before checking the signature, or the HMAC will never match.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("Paddle-Signature");

  if (!verifyPaddleWebhook(rawBody, signature)) {
    return NextResponse.json({ message: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const supabase = createServiceRoleClient();

  // Paddle explicitly documents retrying a webhook delivery on any non-2xx
  // response, and doesn't guarantee exactly-once delivery even on success —
  // so the same event_id can legitimately arrive here more than once.
  // Recording it first and skipping on a duplicate (instead of, say,
  // re-running the subscription/credit logic a second time) is what makes
  // this idempotent. Still returns 200 on a duplicate — replying with an
  // error would just make Paddle retry it again forever. If event_id is
  // ever missing from the payload (unexpected shape), fail open rather than
  // silently dropping a real event: process it without a dedup record.
  let dedupeRecorded = false;
  if (typeof event.event_id === "string") {
    const { error: dedupeError } = await supabase
      .from("processed_webhook_events")
      .insert({ id: event.event_id, source: "paddle" });
    if (dedupeError) {
      // A unique-violation on the primary key means this exact event_id was
      // already recorded — anything else (a transient DB error) is logged
      // and processing still proceeds, since refusing to process a webhook
      // over a dedup-table hiccup would be worse than a rare double-process.
      if (dedupeError.code === "23505") {
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error("paddle webhook idempotency check failed, processing anyway", dedupeError);
    } else {
      dedupeRecorded = true;
    }
  } else {
    console.error("paddle webhook payload has no event_id — skipping idempotency check", event.event_type);
  }

  // Tracks whether an event that NEEDS a matching local `subscriptions` row
  // (matched by paddle_customer_id, set at checkout time — see
  // paddle-checkout/route.ts) couldn't find one. This is a real, if narrow,
  // race: Paddle can in principle deliver a webhook before that update has
  // committed. Silently no-op'ing here used to be a genuine data-loss bug —
  // the event_id was already recorded as "processed" above, so even if the
  // local row appeared moments later, Paddle's own retry of this exact
  // event would immediately hit the duplicate check and short-circuit
  // without ever re-running the subscription/payment logic. Fixed below:
  // when this happens, un-record the dedupe entry and return a non-2xx so
  // Paddle's documented retry behavior gets an actual chance to reprocess
  // it once the row exists.
  let targetNotFound = false;

  switch (event.event_type) {
    case "subscription.created":
    case "subscription.updated": {
      const sub = event.data;
      const priceId = sub.items?.[0]?.price?.id;
      const plan = priceId ? planForPriceId(priceId) : null;
      if (!plan) break;

      const { data: existing } = await supabase
        .from("subscriptions")
        .select("user_id, plan, renews_at")
        .eq("paddle_customer_id", sub.customer_id)
        .maybeSingle();

      if (existing) {
        // Paddle fires "subscription.updated" for far more than renewals —
        // proration, a payment-method change, a plan swap, cancellation
        // being reversed, etc. all send this same event type while status
        // stays "active", so the event type alone was resetting a user's
        // credit balance back to full on changes that have nothing to do
        // with a new billing cycle actually starting. The billing period's
        // own start date only advances on a genuine renewal — comparing it
        // against what's already stored is a signal Paddle can't send
        // spuriously, unlike the event type.
        const newPeriodStart = sub.current_billing_period?.starts_at;
        const isNewCycle =
          sub.status === "active" &&
          typeof newPeriodStart === "string" &&
          (!existing.renews_at || new Date(newPeriodStart) > new Date(existing.renews_at));
        // A "confirmation" email is for a genuinely new subscription or a
        // real plan change — not for every renewal (that's what the
        // separate payment-confirmed email from transaction.completed is
        // for) and not for the many non-renewal "updated" events Paddle
        // sends (see above) that leave the plan itself unchanged.
        const isNewOrChangedPlan = event.event_type === "subscription.created" || existing.plan !== plan;
        await supabase
          .from("subscriptions")
          .update({
            plan,
            status: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled",
            provider: "paddle",
            paddle_subscription_id: sub.id,
            renews_at: sub.next_billed_at ?? sub.current_billing_period?.ends_at,
            ...(isNewCycle
              ? { credits_remaining: PLAN_CREDITS[plan], credits_allowance: PLAN_CREDITS[plan], low_credit_alert_sent_at: null }
              : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", existing.user_id);

        await writeAuditLog({
          actorId: null,
          actorRole: "system",
          action: `paddle.${event.event_type}`,
          targetId: existing.user_id,
          metadata: { plan, status: sub.status, paddleSubscriptionId: sub.id },
        });

        if (isNewOrChangedPlan && sub.status === "active") {
          const { data: userRow } = await supabase.from("users").select("email, name").eq("id", existing.user_id).single();
          if (userRow) {
            sendSubscriptionConfirmedEmail(userRow.email, userRow.name, plan).catch((err) =>
              console.error("subscription confirmation email failed", err)
            );
          }
          notifyAdmin(event.event_type === "subscription.created" ? "new_subscription" : "subscription_plan_changed", {
            userId: existing.user_id,
            plan,
            paddleSubscriptionId: sub.id,
          });
        }
      } else {
        targetNotFound = true;
        console.warn(`paddle webhook: no subscriptions row for customer ${sub.customer_id} yet (${event.event_type})`);
      }
      break;
    }

    case "subscription.canceled": {
      const sub = event.data;
      const { data: canceledSub } = await supabase
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("paddle_subscription_id", sub.id)
        .select("user_id")
        .maybeSingle();

      if (canceledSub) {
        await writeAuditLog({
          actorId: null,
          actorRole: "system",
          action: "paddle.subscription.canceled",
          targetId: canceledSub.user_id,
          metadata: { paddleSubscriptionId: sub.id },
        });

        const { data: userRow } = await supabase.from("users").select("email, name").eq("id", canceledSub.user_id).single();
        if (userRow) {
          sendSubscriptionCanceledEmail(userRow.email, userRow.name).catch((err) =>
            console.error("cancellation email failed", err)
          );
        }
        notifyAdmin("subscription_canceled", { userId: canceledSub.user_id, paddleSubscriptionId: sub.id });
      } else {
        targetNotFound = true;
        console.warn(`paddle webhook: no subscriptions row for paddle_subscription_id ${sub.id} yet (subscription.canceled)`);
      }
      break;
    }

    case "transaction.completed": {
      const txn = event.data;
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("paddle_customer_id", txn.customer_id)
        .maybeSingle();
      if (existing) {
        await supabase.from("payments").upsert(
          {
            user_id: existing.user_id,
            paddle_transaction_id: txn.id,
            amount: Number(txn.details?.totals?.total ?? 0) / 100,
            currency: txn.currency_code ?? "USD",
            status: "completed",
          },
          { onConflict: "paddle_transaction_id" }
        );

        const amount = Number(txn.details?.totals?.total ?? 0) / 100;
        const currency = txn.currency_code ?? "USD";
        const { data: userRow } = await supabase.from("users").select("email, name").eq("id", existing.user_id).single();
        if (userRow) {
          sendPaymentConfirmedEmail(userRow.email, userRow.name, amount, currency).catch((err) =>
            console.error("payment confirmation email failed", err)
          );
        }
        notifyAdmin("payment_completed", {
          userId: existing.user_id,
          amount: `${amount} ${currency}`,
          paddleTransactionId: txn.id,
        });
      } else {
        targetNotFound = true;
        console.warn(`paddle webhook: no subscriptions row for customer ${txn.customer_id} yet (transaction.completed)`);
      }
      break;
    }

    case "transaction.payment_failed": {
      const txn = event.data;
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("paddle_customer_id", txn.customer_id)
        .maybeSingle();
      if (existing) {
        await supabase.from("payments").upsert(
          {
            user_id: existing.user_id,
            paddle_transaction_id: txn.id,
            amount: Number(txn.details?.totals?.total ?? 0) / 100,
            currency: txn.currency_code ?? "USD",
            status: "failed",
          },
          { onConflict: "paddle_transaction_id" }
        );
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("user_id", existing.user_id);

        const { data: userRow } = await supabase
          .from("users")
          .select("email, name")
          .eq("id", existing.user_id)
          .single();
        if (userRow) {
          await sendPaymentFailedEmail(userRow.email, userRow.name).catch((err) =>
            console.error("dunning email failed", err)
          );
        }
        notifyAdmin("payment_failed", { userId: existing.user_id, paddleTransactionId: txn.id });
      } else {
        targetNotFound = true;
        console.warn(`paddle webhook: no subscriptions row for customer ${txn.customer_id} yet (transaction.payment_failed)`);
      }
      break;
    }

    default:
      break; // Unhandled event types are safely ignored.
  }

  if (targetNotFound) {
    // Un-record the dedupe entry (if we recorded one this request) so a
    // genuine Paddle retry — or the same event redelivered — can actually
    // reprocess this once the local row exists, instead of hitting the
    // duplicate short-circuit above and silently no-op'ing forever. 404
    // (not 200) so Paddle's own documented retry-on-non-2xx behavior
    // triggers a redelivery.
    if (dedupeRecorded && typeof event.event_id === "string") {
      await supabase.from("processed_webhook_events").delete().eq("id", event.event_id);
    }
    return NextResponse.json(
      { received: false, message: "No matching local subscription yet — will retry." },
      { status: 404 }
    );
  }

  return NextResponse.json({ received: true });
}
