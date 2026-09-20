"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Reveal } from "@/components/ui/Reveal";

interface SubStatus {
  plan: string;
  status: string;
  creditsRemaining: number | null;
  creditsAllowance: number | null;
  renews_at?: string;
  isAdmin: boolean;
  domainCount: number;
  domainLimit: number; // -1 = unlimited
}

const PLANS = [
  { id: "free", label: "Free", price: 0 },
  { id: "starter", label: "Starter", price: 9.6 },
  { id: "pro", label: "Pro", price: 19.2 },
  { id: "business", label: "Business", price: 39.2 },
] as const;

const PLAN_ORDER = ["free", "starter", "pro", "business"] as const;

export default function BillingPage() {
  const toast = useToast();
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [finalizingPlan, setFinalizingPlan] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingDowngrade, setPendingDowngrade] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load(): Promise<SubStatus | null> {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch("/api/billing/subscription-status");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setSub(data);
      return data;
    } catch {
      setLoadFailed(true);
      return null;
    } finally {
      setLoading(false);
    }
  }

  // The webhook that actually flips `plan`/`credits_*` in the database can
  // land a few seconds after Paddle reports the checkout as complete, so we
  // poll briefly instead of assuming a single refetch will show the new plan.
  async function pollForPlanChange(targetPlan: string) {
    setFinalizingPlan(targetPlan);
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const latest = await load();
      if (latest?.plan === targetPlan) {
        setFinalizingPlan(null);
        toast.show("success", `You're now on the ${targetPlan} plan.`);
        return;
      }
    }
    setFinalizingPlan(null);
    toast.show(
      "success",
      "Payment received — your plan will update within a minute. Refresh if it doesn't appear."
    );
  }

  async function upgrade(plan: string) {
    setCheckingOut(plan);
    try {
      const res = await fetch("/api/billing/paddle-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cycle: "month" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show("error", data.message ?? "Couldn't start checkout.");
        return;
      }
      // @ts-expect-error Paddle is attached to window by the script below
      const paddle = window.Paddle;
      // Previously used optional chaining here (window.Paddle?.Initialize?.(...)),
      // which meant that if paddle.js hadn't finished loading yet — a real,
      // plausible race even with strategy="afterInteractive", since that
      // only guarantees the script starts loading after hydration, not that
      // it's finished by the time someone clicks Subscribe — this entire
      // block would silently do nothing. The checkout call above already
      // succeeded, credits/plan state may already reflect it server-side,
      // but no checkout UI would ever appear and nothing would tell the
      // person why. This is that missing feedback.
      if (!paddle) {
        toast.show("error", "Checkout is still loading — wait a moment and try again.");
        return;
      }
      paddle.Initialize?.({
        token: data.clientToken,
        eventCallback: (event: { name?: string }) => {
          if (event?.name === "checkout.completed") {
            pollForPlanChange(plan);
          } else if (event?.name === "checkout.error" || event?.name === "checkout.payment.failed") {
            toast.show("error", "Payment didn't go through — no charge was made. Try again or use a different card.");
          }
        },
      });
      paddle.Checkout.open({
        items: [{ priceId: data.priceId, quantity: 1 }],
        customer: { id: data.customerId },
      });
    } catch {
      toast.show("error", "Network error — checkout didn't open.");
    } finally {
      setCheckingOut(null);
    }
  }

  async function confirmCancel() {
    setShowCancelConfirm(false);
    setCanceling(true);
    try {
      const res = await fetch("/api/billing/cancel-subscription", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't cancel — try again.");
        return;
      }
      toast.show("success", data.message ?? "Subscription canceled.");
    } catch {
      toast.show("error", "Network error — cancellation didn't complete.");
    } finally {
      setCanceling(false);
    }
  }

  // Choosing a plan needs three different responses depending on direction:
  // the current plan (no-op), Free (that's a cancellation, not a checkout —
  // paddle-checkout rejects "free"), or a lower paid tier (send to checkout
  // like an upgrade, but only after the person has seen what they'd lose).
  function choosePlan(planId: string) {
    if (!sub || planId === sub.plan) return;
    if (planId === "free") {
      setShowCancelConfirm(true);
      return;
    }
    const isDowngrade = PLAN_ORDER.indexOf(planId as (typeof PLAN_ORDER)[number]) < PLAN_ORDER.indexOf(sub.plan as (typeof PLAN_ORDER)[number]);
    if (isDowngrade) {
      setPendingDowngrade(planId);
      return;
    }
    upgrade(planId);
  }

  function confirmDowngrade() {
    const plan = pendingDowngrade;
    setPendingDowngrade(null);
    if (plan) upgrade(plan);
  }

  return (
    <div className="max-w-2xl">
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" />
      <h1 className="font-display text-2xl font-bold">Billing</h1>

      {loading ? (
        <div className="glass-panel mt-6 rounded-2xl p-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-6 w-32" />
          <Skeleton className="mt-3 h-4 w-48" />
        </div>
      ) : loadFailed ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink/15 p-10 text-center">
          <p className="text-sm text-ink/50">Couldn't load your billing details — check your connection and try again.</p>
          <button onClick={load} className="focus-ring rounded-full border border-ink/15 px-4 py-2 text-sm hover:border-ink">
            Retry
          </button>
        </div>
      ) : (
        sub && (
          <div className="glass-panel reveal-in mt-6 rounded-2xl p-6">
            {finalizingPlan && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-signal/10 px-3 py-2 text-sm text-signal">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-signal border-t-transparent" />
                Finalizing your upgrade to {finalizingPlan}…
              </div>
            )}
            {!sub.isAdmin && sub.status === "past_due" && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
                Your last payment didn't go through. Update your payment method to keep your plan active — access
                may be interrupted otherwise.
              </div>
            )}
            {!sub.isAdmin && sub.domainLimit !== -1 && sub.domainCount > sub.domainLimit && (
              <div className="mb-4 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-amber">
                You have {sub.domainCount} custom domains connected, but your plan allows {sub.domainLimit}. Existing
                domains keep working, but remove some or upgrade before adding more.
              </div>
            )}
            <p className="font-mono text-xs uppercase text-ink/40">Current plan</p>
            <p className="mt-1 font-display text-xl font-bold capitalize">
              {sub.isAdmin ? "Admin (unlimited)" : sub.plan}
            </p>
            {!sub.isAdmin && (
              <>
                <p className="mt-1 text-sm text-ink/50">
                  {sub.creditsRemaining?.toLocaleString()} / {sub.creditsAllowance?.toLocaleString()} credits
                  remaining this cycle
                </p>
                {sub.plan !== "free" && sub.status === "active" && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={canceling}
                    className="focus-ring mt-3 text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    {canceling ? "Canceling…" : "Cancel subscription"}
                  </button>
                )}
              </>
            )}
          </div>
        )
      )}

      {!loading && !loadFailed && !sub?.isAdmin && (
        <div className="mt-8">
          <h2 className="h2 mb-3">Change plan</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p, i) => (
              <Reveal key={p.id} delay={i * 60} className="glass-panel rounded-xl p-5">
                <p className="font-medium">{p.label}</p>
                <p className="mt-1 font-display text-2xl font-bold">${p.price.toFixed(2)}/mo</p>
                <button
                  onClick={() => choosePlan(p.id)}
                  disabled={checkingOut !== null || canceling || sub?.plan === p.id}
                  className="focus-ring mt-4 w-full rounded-full bg-signal py-2 text-sm text-paper hover:bg-signal2 disabled:opacity-40"
                >
                  {sub?.plan === p.id ? "Current plan" : checkingOut === p.id ? "Opening checkout…" : "Choose"}
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {showCancelConfirm && sub && (
        <Modal onClose={() => setShowCancelConfirm(false)} ariaLabel="Cancel subscription" className="max-w-sm">
          <div className="p-6">
            <h3 className="font-display text-lg font-bold">Cancel your subscription?</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink/60">
              <li>You'll keep {sub.plan} access until the end of this billing period.</li>
              <li>After that, your plan drops to Free (3,000 credits/mo).</li>
              {sub.domainCount > 0 && (
                <li>Custom domains aren't included in the Free plan — yours will stop working once it takes effect.</li>
              )}
            </ul>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="focus-ring rounded-full border border-ink/15 px-4 py-2 text-sm hover:border-ink"
              >
                Keep subscription
              </button>
              <button
                onClick={confirmCancel}
                className="focus-ring rounded-full bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
              >
                Cancel subscription
              </button>
            </div>
          </div>
        </Modal>
      )}

      {pendingDowngrade && sub && (
        <Modal onClose={() => setPendingDowngrade(null)} ariaLabel="Confirm plan downgrade" className="max-w-sm">
          <div className="p-6">
            <h3 className="font-display text-lg font-bold capitalize">Switch to {pendingDowngrade}?</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink/60">
              <li>Your monthly credit allowance will drop to match the {pendingDowngrade} plan.</li>
              <li>Any features exclusive to {sub.plan} won't be available anymore.</li>
              <li>If you have more custom domains than {pendingDowngrade} allows, the extras will stop working.</li>
            </ul>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setPendingDowngrade(null)}
                className="focus-ring rounded-full border border-ink/15 px-4 py-2 text-sm hover:border-ink"
              >
                Stay on {sub.plan}
              </button>
              <button
                onClick={confirmDowngrade}
                className="focus-ring rounded-full bg-signal px-4 py-2 text-sm text-paper hover:bg-signal2"
              >
                Confirm switch
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
