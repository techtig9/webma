import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { priceIdFor, paddleApiBase, type BillingCycle } from "@/lib/paddle";
import type { PlanId } from "@/lib/credits";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/error-report";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  // No credit gate applies to billing itself, so nothing else stops this
  // from being called repeatedly — each call is a real request against
  // Paddle's API (creating a customer record on first call, a checkout
  // session every time), not free or contained to this app.
  const limit = await checkRateLimit(`${user!.id}:paddle-checkout`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many checkout attempts — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const { plan, cycle } = (await request.json()) as { plan: PlanId; cycle: BillingCycle };
  if (plan === "free") {
    return NextResponse.json({ message: "The Free plan doesn't require checkout." }, { status: 400 });
  }

  const priceId = priceIdFor(plan, cycle);
  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("paddle_customer_id")
    .eq("user_id", user!.id)
    .single();

  let customerId = existing?.paddle_customer_id ?? null;

  if (!customerId) {
    const res = await fetch(`${paddleApiBase()}/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: user!.email, custom_data: { supabase_user_id: user!.id } }),
    });
    const data = await res.json();
    if (!res.ok) {
      reportError("paddle create-customer error", data, { userId: user!.id });
      return NextResponse.json({ message: "Couldn't start checkout. Try again." }, { status: 500 });
    }
    customerId = data.data.id;
    await supabase.from("subscriptions").update({ paddle_customer_id: customerId }).eq("user_id", user!.id);
  }

  // The client opens the Paddle.js overlay with this priceId + customerId —
  // Paddle Billing handles the actual payment UI, we never touch card data.
  return NextResponse.json({
    priceId,
    customerId,
    clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
    environment: process.env.NEXT_PUBLIC_PADDLE_ENV ?? "sandbox",
  });
}
