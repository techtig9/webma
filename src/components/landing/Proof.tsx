import { LayoutTemplate, Code2, Rocket, BadgePercent } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

// This product is pre-launch (see Pricing's "founding member" framing) — there
// are no real customers yet to quote, and inventing testimonials would be
// fabricated social proof. This section builds trust honestly instead, with
// facts that are true today: the actual template count/category spread
// (Phase 3's 107-template/30-category library), the real export/deploy
// mechanics, and the founding-pricing terms already stated in Pricing.tsx.
const POINTS = [
  {
    icon: LayoutTemplate,
    title: "100+ real starter templates",
    body: "Every category from portfolios to SaaS landing pages, each with its own layout and copy — pick one or generate from scratch.",
  },
  {
    icon: Code2,
    title: "Real code, zero lock-in",
    body: "React, Tailwind, and Next.js you can read, edit, and export any time you want — not a black-box builder holding your site hostage.",
  },
  {
    icon: Rocket,
    title: "Deploy in one click",
    body: "Connect your own Vercel account in Settings and publish the moment you're happy with it — sites deploy under your account, not ours.",
  },
  {
    icon: BadgePercent,
    title: "Founding member pricing",
    body: "20% off every paid plan, locked in for as long as you stay subscribed — the price only goes up once the founding window closes.",
  },
];

export function Proof() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal mb-3">Why webma</p>
        <h2 className="max-w-xl font-display text-3xl font-bold text-balance md:text-4xl">
          No vaporware, no waitlist — everything here is real.
        </h2>
      </Reveal>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map((p, i) => (
          <Reveal key={p.title} delay={i * 90}>
            <div className="lift-on-hover shine-hover glass-panel h-full rounded-2xl p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal/10 text-signal">
                <p.icon size={16} />
              </span>
              <h3 className="mt-4 font-display font-bold text-white">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
