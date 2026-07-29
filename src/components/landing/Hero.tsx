"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

const PROMPTS = [
  "A cozy neighborhood bakery in Lahore, warm and rustic",
  "A SaaS landing page for a project management tool",
  "A portfolio for a freelance architect, minimal and bold",
];

const BUILD_STEPS = ["Navbar", "Hero", "About", "Services", "Features", "Footer"];

export function Hero() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "building" | "done">("typing");
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [greeting, setGreeting] = useState("Hey there");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  useEffect(() => {
    const target = PROMPTS[promptIndex];
    if (phase !== "typing") return;

    if (typed.length < target.length) {
      const t = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), 28);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("building"), 500);
    return () => clearTimeout(t);
  }, [typed, phase, promptIndex]);

  useEffect(() => {
    if (phase !== "building") return;
    if (visibleSteps < BUILD_STEPS.length) {
      const t = setTimeout(() => setVisibleSteps((v) => v + 1), 260);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("done"), 1200);
    return () => clearTimeout(t);
  }, [phase, visibleSteps]);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => {
      setTyped("");
      setVisibleSteps(0);
      setPhase("typing");
      setPromptIndex((i) => (i + 1) % PROMPTS.length);
    }, 1400);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 md:grid-cols-2 md:items-center md:pt-24">
        <Reveal>
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-ink/[0.03] px-3 py-1 text-xs text-ink/60">
            👋 {greeting} — let&apos;s figure out what to build
          </span>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal mb-5">
            AI website builder · by Techtig
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] text-balance md:text-6xl">
            Describe it.
            <br />
            Watch it <span className="font-accent italic text-signal">build itself.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink/60">
            Type it, or just say it out loud. webma asks a handful of quick, tap-to-pick questions —
            theme, color, style — then generates a complete, responsive, ready-to-deploy website in
            React and Tailwind, live, in front of you. No blank canvas, no starting from scratch.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/signup" variant="primary">
              Generate your website
            </Button>
            <Button href="/login" variant="secondary">
              Login
            </Button>
          </div>
        </Reveal>

        {/* This mockup card stays dark-chrome by design, even on the light theme —
            like a terminal or code editor panel, it reads as "generator at work"
            and gives the hero a strong anchor point against the light page. */}
        <Reveal delay={150}>
          <div className="corner-frame lift-on-hover rounded-2xl bg-ink p-5 shadow-[0_30px_80px_-20px_rgba(11,14,20,0.25)]">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-signal2/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-signal/80" />
              <span className="ml-3 font-mono text-xs text-paper/40">webma — generator</span>
            </div>

            <div className="rounded-lg bg-paper/[0.06] p-4 font-mono text-sm text-paper/80 min-h-[52px]">
              {typed}
              <span className="animate-pulse text-signal">▍</span>
            </div>

            <div className="mt-4 space-y-2">
              {BUILD_STEPS.map((step, i) => (
                <div
                  key={step}
                  className={`rounded-md border px-3 py-2 font-mono text-xs transition-all duration-300 ${
                    i < visibleSteps
                      ? "border-signal2/40 bg-signal2/10 text-signal2 translate-x-0 opacity-100"
                      : "border-paper/5 text-paper/20 -translate-x-2 opacity-0"
                  }`}
                >
                  {step} generated
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
