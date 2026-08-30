import { Reveal } from "@/components/ui/Reveal";

export function About() {
  return (
    <section id="about" className="mx-auto max-w-3xl px-6 py-24 text-center">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal mb-5">About webma</p>
        <blockquote className="font-accent italic text-2xl font-medium leading-snug text-balance md:text-3xl">
          webma turns a plain-language description into a real, working website — production
          React and Next.js code you can preview instantly, edit in plain English or by hand, and
          export or deploy the moment you&apos;re ready. No lock-in, no black box: everything it
          generates is yours to keep.
        </blockquote>
        <p className="mt-8 text-sm text-ink/50">
          webma is built and maintained by Techtig, an AI development studio specializing in
          AI-powered web products.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-xs text-ink/50">
          <span>Fiverr / Upwork / Freelancer: techtig</span>
          <span>Facebook: techtig</span>
          <span>Instagram: @techtig9</span>
        </div>
      </Reveal>
    </section>
  );
}
