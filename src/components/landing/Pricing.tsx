"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { PLAN_PRICES, STANDARD_PLAN_PRICES, PLAN_CREDITS, type PlanId } from "@/lib/plan-pricing";

// Yearly billing = 10x the monthly rate for 12 months of access — 2 months
// free, the industry-standard "annual discount" framing. Both the founding
// and standard yearly totals derive from the same PLAN_PRICES /
// STANDARD_PLAN_PRICES single source of truth as the monthly figures, so
// there's no separate yearly price to keep in sync by hand.
const YEARLY_MONTHS_CHARGED = 10;

const PLANS: Array<{
  id: PlanId;
  name: string;
  blurb: string;
  features: string[];
  highlight?: boolean;
}> = [
  {
    id: "free",
    name: "Free",
    blurb: "Generate and export one real site, on us.",
    features: ["1 full website generation", "Real React + Tailwind code", "Live preview", "Code export"],
  },
  {
    id: "starter",
    name: "Starter",
    blurb: "For a first real project, full-stack.",
    features: ["Full-stack React/Next.js sites", "Generate from a URL", "AI editing + voice input", "SEO settings", "1 custom domain", "Deploy to Vercel"],
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "For freelancers shipping client sites.",
    features: ["Everything in Starter", "Priority generation", "5 custom domains", "Last 25 versions", "Two-factor authentication"],
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    blurb: "For agencies running multiple builds.",
    features: ["Everything in Pro", "Team collaboration", "Unlimited custom domains", "Unlimited version history", "24/7 priority support"],
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      <SectionHeading
        align="center"
        eyebrow="Founding member pricing — 20% off"
        title="Plans that scale with what you build"
        description="Join now and lock in 20% off every paid plan, for as long as you stay subscribed — prices go up once the founding window closes."
      />

      <div className="mt-8 flex justify-center">
        <div role="group" aria-label="Billing period" className="glass-panel inline-flex rounded-full p-1">
          {(["monthly", "yearly"] as const).map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={yearly === (period === "yearly")}
              onClick={() => setYearly(period === "yearly")}
              className={`focus-ring rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                yearly === (period === "yearly") ? "bg-signal text-white" : "text-ink/60 hover:text-ink"
              }`}
            >
              {period}
              {period === "yearly" && <span className="ml-1.5 font-mono text-xs">2 months free</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-4">
        {PLANS.map((p, i) => {
          const foundingMonthly = PLAN_PRICES[p.id];
          const standardMonthly = STANDARD_PLAN_PRICES[p.id];
          const displayMonthly = yearly ? (foundingMonthly * YEARLY_MONTHS_CHARGED) / 12 : foundingMonthly;
          const isFree = p.id === "free";

          return (
            <Reveal key={p.id} delay={i * 90}>
              <div
                className={`lift-on-hover shine-hover glass-panel flex h-full flex-col rounded-2xl p-6 ${
                  p.highlight ? "glow-pulse !border-signal/40 bg-signal/[0.06]" : ""
                }`}
              >
                <h3 className="font-display text-lg font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-ink/50">{p.blurb}</p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold">
                    ${displayMonthly % 1 === 0 ? displayMonthly : displayMonthly.toFixed(2)}
                  </span>
                  {!isFree && <span className="text-sm text-ink/55">/mo</span>}
                </div>
                {!isFree && (
                  <p className="font-mono text-xs text-signal2">
                    <span className="line-through text-ink/55">${standardMonthly}/mo</span> 20% off, locked in
                  </p>
                )}
                {!isFree && yearly && (
                  <p className="mt-1 font-mono text-xs text-ink/45">
                    ${(foundingMonthly * YEARLY_MONTHS_CHARGED).toFixed(2)} billed annually
                  </p>
                )}
                <p className="mt-1 font-mono text-xs text-ink/55">{PLAN_CREDITS[p.id].toLocaleString()} credits/mo</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-ink/70">
                      <span className="text-signal2">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  href="/signup"
                  variant={p.highlight ? "primary" : "secondary"}
                  className="mt-6 w-full"
                >
                  {isFree ? "Start free" : "Choose " + p.name}
                </Button>
              </div>
            </Reveal>
          );
        })}
      </div>
      <p className="mt-8 text-center text-xs text-ink/55">
        Extra credit top-ups can be purchased separately, anytime.
      </p>
    </section>
  );
}
