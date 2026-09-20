"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

/** The right-hand panel is a "canvas" that cycles through a handful of
 * generated-site previews — the webma design direction calls for this
 * specifically (indigo-to-sky palette, canvas-style hero cycling template
 * previews) in place of the single fixed typing-demo mockup this used to
 * be. Each frame is a distinct category/palette so the rotation itself
 * demonstrates "AI generates a real, different site per prompt" rather
 * than just replaying the same mockup. Built from divs/gradients like the
 * rest of the app's mockups (no image assets to source), and each frame's
 * palette is intentionally its own — not just the app's own indigo/sky —
 * since these represent OTHER people's generated sites, not webma's brand. */
interface PreviewFrame {
  category: string;
  siteName: string;
  headline: string;
  body: string;
  cta: string;
  bg: string;
  accent: string;
  ctaBg: string;
  ctaText: string;
}

const FRAMES: PreviewFrame[] = [
  {
    category: "Digital growth studio",
    siteName: "NOVA",
    headline: "We build brands that grow.",
    body: "A generated responsive website preview appears here before you publish.",
    cta: "Get started",
    bg: "from-slate-950 via-slate-900 to-indigo-950",
    accent: "text-indigo-300",
    ctaBg: "bg-indigo-600",
    ctaText: "text-white",
  },
  {
    category: "Neighborhood bakery",
    siteName: "FLOUR & CO",
    headline: "Baked fresh, ordered online.",
    body: "Same-day pickup, no app required — just a link your customers already trust.",
    cta: "Order now",
    // Uses the "orange" family, not "amber" — tailwind.config.ts overrides
    // `amber` with a single flat brand color (no shade scale), so classes
    // like `bg-amber-500`/`text-amber-300` silently generate no CSS at all
    // (this is exactly how the "Order now" button first shipped invisible).
    bg: "from-orange-900 via-orange-950 to-stone-950",
    accent: "text-orange-300",
    // A warm, light hue at any usable shade — white text on it fails
    // contrast (~1.9:1), so this frame's CTA needs dark text, unlike the
    // others.
    ctaBg: "bg-orange-400",
    ctaText: "text-stone-900",
  },
  {
    category: "Freelance architecture",
    siteName: "MERIDIAN",
    headline: "Structure, considered.",
    body: "A portfolio built to show the work — not the template it came from.",
    cta: "View projects",
    bg: "from-stone-100 via-neutral-200 to-stone-300",
    accent: "text-stone-600",
    ctaBg: "bg-stone-900",
    ctaText: "text-white",
    // light frame — text/border colors below are overridden per-frame
  },
  {
    category: "Boutique travel agency",
    siteName: "FARSTONE",
    headline: "Trips worth planning for.",
    body: "Curated itineraries, booked in minutes, backed by people who've actually been there.",
    cta: "Explore trips",
    bg: "from-sky-950 via-cyan-950 to-slate-950",
    accent: "text-sky-300",
    ctaBg: "bg-sky-600",
    ctaText: "text-white",
  },
];

const PROMPTS = FRAMES.map((f) => `A ${f.category.toLowerCase()} site called ${f.siteName.toLowerCase().replace(/\s+/g, " ")}`);
const BUILD_STEPS = ["Understanding your request", "Planning website structure", "Generating content", "Designing responsive pages", "Optimizing for devices"];
const FRAME_HOLD_MS = 2600;

export function Hero() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [step, setStep] = useState(0);
  // A hero that auto-plays a typing effect and cycles frames forever is
  // exactly the kind of motion prefers-reduced-motion asks sites to drop —
  // reduced-motion visitors get the finished first frame, static, instead.
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  // Typing + build-step animation for the LEFT rail inside the canvas —
  // unchanged behavior from before, just now driving which of the 4 preview
  // frames is showing rather than a single fixed mockup.
  useEffect(() => {
    if (reducedMotion) return;
    const prompt = PROMPTS[frameIndex];
    if (typed.length < prompt.length) {
      const t = setTimeout(() => setTyped(prompt.slice(0, typed.length + 1)), 22);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(1), 400);
    return () => clearTimeout(t);
  }, [typed, frameIndex, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    if (step > 0 && step < BUILD_STEPS.length) {
      const t = setTimeout(() => setStep((s) => s + 1), 300);
      return () => clearTimeout(t);
    }
    if (step === BUILD_STEPS.length) {
      const t = setTimeout(() => {
        setTyped("");
        setStep(0);
        setFrameIndex((i) => (i + 1) % FRAMES.length);
      }, FRAME_HOLD_MS);
      return () => clearTimeout(t);
    }
  }, [step, reducedMotion]);

  const displayTyped = reducedMotion ? PROMPTS[0] : typed;
  const displayStep = reducedMotion ? BUILD_STEPS.length : step;
  const displayFrameIndex = reducedMotion ? 0 : frameIndex;

  const isLight = displayFrameIndex === 2;

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-signal/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-28">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-signal/20 bg-signal/10 px-3 py-1.5 text-xs font-medium text-signal">
            <Sparkles size={12} /> AI website builder for everyone
          </div>
          <h1 className="mt-6 max-w-2xl font-display text-5xl font-bold leading-[.98] tracking-[-.04em] text-white md:text-7xl">
            Create a website <span className="bg-brand-gradient bg-clip-text text-transparent">with AI.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/50">
            Describe your idea and Webma designs, generates and helps you publish a professional website — without
            starting from a blank canvas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/signup">
              Create your website <ArrowRight size={16} />
            </Button>
            <Button href="#features" variant="secondary">
              <Eye size={16} /> See how it works
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/55">
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-signal2" /> AI-powered
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-signal2" /> Visual editing
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-signal2" /> Responsive preview
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-signal2" /> Publish when ready
            </span>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div className="relative rounded-[26px] border border-white/10 bg-[#0b0f1c] p-3 shadow-2xl shadow-signal/10">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-3">
              <div className="flex gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <i className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <i className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </div>
              <span className="font-mono text-[10px] text-white/45">webma / builder</span>
              <span className="rounded-md bg-signal px-2 py-1 text-[9px] font-semibold">Live</span>
            </div>
            <div className="grid gap-3 p-3 md:grid-cols-[.7fr_1.3fr]">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-signal">Your prompt</p>
                <div className="mt-3 min-h-[100px] text-sm leading-6 text-white/70">
                  {displayTyped}
                  {!reducedMotion && <span className="animate-pulse text-signal">▍</span>}
                </div>
                <div className="mt-5 space-y-2">
                  {BUILD_STEPS.map((s, i) => (
                    <div
                      key={s}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] transition ${
                        i < displayStep ? "bg-signal2/10 text-signal2" : "text-white/20"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${i < displayStep ? "bg-signal2" : "bg-white/15"}`} />
                      {s}
                      {i < displayStep && <Check size={11} className="ml-auto" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* The cycling canvas: one generated-site preview frame at a
                  time, crossfading on change. aria-live="off" + the dot
                  rail below is decorative/ambient, not information a
                  screen-reader user needs announced on every rotation. */}
              <div
                className="relative overflow-hidden rounded-xl border border-white/[0.07]"
                role="group"
                aria-label="Example websites webma can generate"
              >
                {FRAMES.map((f, i) => (
                  <div
                    key={f.siteName}
                    aria-hidden={i !== displayFrameIndex}
                    className={`${i === displayFrameIndex ? "relative opacity-100" : "absolute inset-0 opacity-0"} transition-opacity duration-700 ease-out`}
                  >
                    <div className={`flex h-7 items-center border-b px-3 ${isLight && i === displayFrameIndex ? "border-black/10 bg-white" : "border-black/5 bg-white"}`}>
                      <span className="text-[8px] font-semibold text-black/40">{f.siteName}</span>
                      <span className="ml-auto text-[7px] text-black/30">Home · Services · About · Contact</span>
                    </div>
                    <div
                      className={`relative min-h-[360px] bg-gradient-to-br p-7 ${f.bg} ${
                        f.siteName === "MERIDIAN" ? "text-stone-800" : "text-white"
                      }`}
                    >
                      <span className={`text-[9px] uppercase tracking-[.25em] ${f.accent}`}>{f.category}</span>
                      <h2 className="mt-8 max-w-xs text-4xl font-bold leading-none">{f.headline}</h2>
                      <p className={`mt-4 max-w-xs text-xs leading-5 ${f.siteName === "MERIDIAN" ? "text-stone-600" : "text-white/55"}`}>
                        {f.body}
                      </p>
                      <button className={`mt-6 rounded-md px-4 py-2 text-[10px] font-semibold ${f.ctaBg} ${f.ctaText}`}>
                        {f.cta}
                      </button>
                      <div className="pointer-events-none absolute bottom-0 right-0 h-2/3 w-1/2 bg-gradient-to-t from-white/10 to-transparent" />
                    </div>
                  </div>
                ))}

                <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                  {FRAMES.map((f, i) => (
                    <span
                      key={f.siteName}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === displayFrameIndex ? "w-4 bg-white" : "w-1.5 bg-white/35"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
