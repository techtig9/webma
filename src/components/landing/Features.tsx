import { Sparkles, Wand2, PackageOpen, MessageSquareText, Gem } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

// Rebuilt to match the reference's real 2x2 four-card structure (previously
// 9 sequential items in a 3-column grid — a genuine layout mismatch found
// while auditing color usage, not assumed upfront). Copy is adapted to
// webma's actual, already-built capabilities rather than the reference's
// own design-tool-specific language ("design concepts," "creative teams")
// — webma generates websites, not general design assets, so the four
// themes (speed, personalization, export flexibility, easy revision) carry
// over from the reference structure, but each card describes something
// genuinely real and shipped: prompt-to-site generation, the guided
// follow-up flow, ZIP/React/Next.js export plus one-click Vercel deploy,
// and the AI edit bar's plain-English revisions.
const CARDS = [
  {
    icon: Wand2,
    title: "Instant Generation",
    body: "Describe your site in a sentence or two and webma builds full sections — hero, services, footer, and everything your brief implies — in seconds, not a blank canvas.",
  },
  {
    icon: Sparkles,
    title: "Adapts to Your Vision",
    body: "A handful of guided follow-up questions — type, style, color — tailor every generation to you, with tap-to-pick options instead of blank text boxes.",
  },
  {
    icon: PackageOpen,
    title: "Export Anywhere",
    body: "Ship as a ZIP, a React project, or a Next.js project — or deploy straight to Vercel without leaving the dashboard, whenever you're ready.",
  },
  {
    icon: MessageSquareText,
    title: "Effortless Revisions",
    body: "\"Make the hero copy shorter\" or \"switch to a cooler palette\" — describe a change in plain English and watch it apply, file by file.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <div className="flex items-center gap-2.5">
          <Gem size={18} className="text-signal" />
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">How it works</p>
        </div>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-bold text-balance md:text-4xl">
          Built for everyone, <span className="text-signal">powered by AI</span>.
        </h2>
        <p className="mt-3 max-w-xl text-lg text-balance text-white/50">
          Every part of the loop — describing, refining, previewing, exporting — happens in one place.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {CARDS.map((c, i) => (
          <Reveal key={c.title} delay={(i % 2) * 100}>
            <div className="lift-on-hover glass-panel relative h-full rounded-2xl p-6">
              <span className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-signal/10 text-signal">
                <c.icon size={15} />
              </span>
              <p className="max-w-[85%] text-sm leading-relaxed text-white/60">{c.body}</p>
              <h3 className="mt-4 font-display text-lg font-bold text-white">{c.title}</h3>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
