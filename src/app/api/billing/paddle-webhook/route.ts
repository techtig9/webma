case "subscription.created":
    case "subscription.updated": {
      const sub = event.data;
      const priceId = sub.items?.[0]?.price?.id;
      const plan = priceId ? planForPriceId(priceId) : null;
      if (!plan) break;

      const { data: existing } = await supabase
        .from("subscriptions")
        .select("user_id, plan")
        .eq("paddle_customer_id", sub.customer_id)
        .maybeSingle();

      if (existing) {
        const isFirstPurchase = event.event_type === "subscription.created";
        const isPlanChange = existing.plan !== plan;
        const isRenewal = event.event_type === "subscription.updated" && sub.status === "active" && !isPlanChange;
        const shouldGrantCredits = isFirstPurchase || isPlanChange || isRenewal;

        await supabase
          .from("subscriptions")
          .update({
            plan,
            status: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled",
            provider: "paddle",
            paddle_subscription_id: sub.id,
            renews_at: sub.next_billed_at ?? sub.current_billing_period?.ends_at,
            ...(shouldGrantCredits ? { credits_remaining: PLAN_CREDITS[plan], credits_allowance: PLAN_CREDITS[plan] } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", existing.user_id);

        await writeAuditLog({
          actorId: null,
          actorRole: "system",
          action: `paddle.${event.event_type}`,
          targetId: existing.user_id,
          metadata: { plan, status: sub.status, paddleSubscriptionId: sub.id, creditsGranted: shouldGrantCredits },
        });
      }
      break;
                            }
