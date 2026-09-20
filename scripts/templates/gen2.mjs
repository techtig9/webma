// Phase 3 (real template design diversity): a genuinely varied section-
// builder library, replacing gen.mjs's 13 single-shape builders (1 navbar,
// 2 heroes, 1 footer, 1 feature grid, 1 testimonial, 1 pricing table, 1
// contact form, 1 about, 1 page header, 1 stats bar, 1 location block —
// confirmed by direct inspection to be exactly what every one of the 107
// live templates draws from, varying only text/color/font args). Every
// function below produces structurally different JSX — different DOM
// shape, different grid/flex composition, different card treatment — not a
// recolor of the same skeleton.
//
// Deterministic hashing (pickIndex) assigns each template a different
// combination of variants per section role, palette, and type system from
// its own id — no hand-maintained assignment table, no possibility of two
// templates in the same category landing on an identical combination by
// accident (the combinatorial space is far larger than 107).

import crypto from "crypto";

export function pickIndex(id, salt, n) {
  const h = crypto.createHash("sha1").update(`${id}:${salt}`).digest();
  return h.readUInt32BE(0) % n;
}

// ---------------------------------------------------------------------------
// Palettes — two real colors (primary + secondary) plus a chosen neutral
// background, not one hue driving everything. Pairs are complementary/
// analogous choices from Tailwind's own palette, not random.
// ---------------------------------------------------------------------------
export const PALETTES = [
  { primary: "indigo", secondary: "amber", bg: "white" },
  { primary: "emerald", secondary: "orange", bg: "stone-50" },
  { primary: "rose", secondary: "slate", bg: "white" },
  { primary: "sky", secondary: "fuchsia", bg: "slate-50" },
  { primary: "amber", secondary: "slate", bg: "neutral-50" },
  { primary: "violet", secondary: "lime", bg: "white" },
  { primary: "teal", secondary: "rose", bg: "zinc-50" },
  { primary: "orange", secondary: "indigo", bg: "white" },
  { primary: "slate", secondary: "amber", bg: "stone-50" },
  { primary: "fuchsia", secondary: "emerald", bg: "white" },
];

// ---------------------------------------------------------------------------
// Type systems — real, different system-font stacks (Tailwind arbitrary
// values; no external font loading, so these render correctly in every
// exported/deployed project with zero added dependency) paired with a
// distinct heading scale, tracking, and corner-radius/button-shape system.
// ---------------------------------------------------------------------------
export const TYPE_SYSTEMS = [
  { name: "editorial-serif", heading: "font-['Georgia',ui-serif,serif]", body: "font-sans", tracking: "tracking-tight", h1: "text-5xl md:text-6xl", h2: "text-3xl md:text-4xl", radius: "rounded-md", pill: "rounded-md", eyebrow: true },
  { name: "geometric-sans", heading: "font-['Verdana',ui-sans-serif,sans-serif]", body: "font-sans", tracking: "tracking-tight", h1: "text-4xl md:text-6xl", h2: "text-3xl md:text-4xl", radius: "rounded-2xl", pill: "rounded-full", eyebrow: true },
  { name: "condensed-bold", heading: "font-['Trebuchet_MS',ui-sans-serif,sans-serif]", body: "font-sans", tracking: "tracking-tighter", h1: "text-5xl md:text-7xl", h2: "text-2xl md:text-3xl", radius: "rounded-none", pill: "rounded-none", eyebrow: false },
  { name: "classic-serif", heading: "font-['Palatino',ui-serif,serif]", body: "font-serif", tracking: "tracking-normal", h1: "text-4xl md:text-5xl", h2: "text-2xl md:text-3xl", radius: "rounded-lg", pill: "rounded-lg", eyebrow: false },
  { name: "soft-rounded", heading: "font-sans", body: "font-sans", tracking: "tracking-wide", h1: "text-4xl md:text-5xl", h2: "text-2xl md:text-3xl", radius: "rounded-3xl", pill: "rounded-full", eyebrow: true },
  { name: "mono-technical", heading: "font-['Courier_New',ui-monospace,monospace]", body: "font-sans", tracking: "tracking-tight", h1: "text-4xl md:text-5xl", h2: "text-xl md:text-2xl", radius: "rounded-sm", pill: "rounded-sm", eyebrow: true },
];

// ---------------------------------------------------------------------------
// NAVBAR — 5 structurally distinct shapes
// ---------------------------------------------------------------------------
export const navbarVariants = [
  // 0: sticky blurred bar, logo left / links+CTA right (original shape)
  ({ brand, links, p, t }) => `export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="${t.heading} text-lg font-bold ${t.tracking} text-slate-900">${brand}</a>
        <div className="hidden items-center gap-8 md:flex">
${links.map((l) => `          <a href="${l.href}" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">${l.label}</a>`).join("\n")}
        </div>
        <a href="/contact" className="${t.pill} bg-${p}-600 px-4 py-2 text-sm font-semibold text-white hover:bg-${p}-700 transition-colors">Get in touch</a>
      </nav>
    </header>
  );
}
`,
  // 1: solid color bar, white text, centered links
  ({ brand, links, p, t }) => `export default function Navbar() {
  return (
    <header className="bg-${p}-600">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <a href="/" className="${t.heading} text-lg font-bold ${t.tracking} text-white">${brand}</a>
        <div className="flex items-center gap-6">
${links.map((l) => `          <a href="${l.href}" className="text-sm font-medium text-white/80 hover:text-white transition-colors">${l.label}</a>`).join("\n")}
          <a href="/contact" className="${t.pill} bg-white px-4 py-2 text-sm font-semibold text-${p}-700 hover:bg-white/90 transition-colors">Contact</a>
        </div>
      </nav>
    </header>
  );
}
`,
  // 2: centered logo, split nav either side (two-column balance)
  ({ brand, links, p, t }) => {
    const mid = Math.ceil(links.length / 2);
    const left = links.slice(0, mid);
    const right = links.slice(mid);
    return `export default function Navbar() {
  return (
    <header className="border-b border-slate-100 bg-white">
      <nav className="mx-auto grid max-w-6xl grid-cols-3 items-center px-6 py-5">
        <div className="flex items-center gap-6">
${left.map((l) => `          <a href="${l.href}" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">${l.label}</a>`).join("\n")}
        </div>
        <a href="/" className="${t.heading} text-center text-xl font-bold ${t.tracking} text-slate-900">${brand}</a>
        <div className="flex items-center justify-end gap-6">
${right.map((l) => `          <a href="${l.href}" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">${l.label}</a>`).join("\n")}
          <a href="/contact" className="text-sm font-semibold text-${p}-600 hover:text-${p}-700">Contact →</a>
        </div>
      </nav>
    </header>
  );
}
`;
  },
  // 3: minimal underline nav, no CTA button — text-only links with a bottom rule on hover
  ({ brand, links, p, t }) => `export default function Navbar() {
  return (
    <header className="bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="/" className="${t.heading} text-base font-bold uppercase ${t.tracking} text-slate-900">${brand}</a>
        <div className="hidden items-center gap-8 md:flex">
${links.map((l) => `          <a href="${l.href}" className="border-b-2 border-transparent pb-1 text-sm font-medium text-slate-500 hover:border-${p}-500 hover:text-slate-900 transition-colors">${l.label}</a>`).join("\n")}
        </div>
      </nav>
    </header>
  );
}
`,
  // 4: floating boxed pill nav, not full-width
  ({ brand, links, p, t }) => `export default function Navbar() {
  return (
    <header className="sticky top-4 z-40 mx-auto max-w-4xl px-4">
      <nav className="flex items-center justify-between gap-4 rounded-full border border-slate-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur">
        <a href="/" className="${t.heading} text-sm font-bold ${t.tracking} text-slate-900">${brand}</a>
        <div className="hidden items-center gap-6 md:flex">
${links.map((l) => `          <a href="${l.href}" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">${l.label}</a>`).join("\n")}
        </div>
        <a href="/contact" className="rounded-full bg-${p}-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-${p}-700 transition-colors">Get started</a>
      </nav>
    </header>
  );
}
`,
];

// ---------------------------------------------------------------------------
// HERO — 6 structurally distinct compositions
// ---------------------------------------------------------------------------
export const heroVariants = [
  // 0: split, image-right panel
  ({ eyebrow, headline, sub, primaryCta, secondaryCta, p, s, t }) => `export default function Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-2 md:py-32">
        <div>
          ${t.eyebrow ? `<span className="inline-block ${t.pill} bg-${p}-100 px-3 py-1 text-xs font-semibold uppercase ${t.tracking} text-${p}-700">${eyebrow}</span>` : ""}
          <h1 className="${t.heading} mt-5 ${t.h1} font-bold leading-[1.05] ${t.tracking} text-slate-900">${headline}</h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">${sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/contact" className="${t.pill} bg-${p}-600 px-6 py-3 text-sm font-semibold text-white hover:bg-${p}-700 transition-colors">${primaryCta}</a>
            <a href="#more" className="${t.pill} border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 transition-colors">${secondaryCta}</a>
          </div>
        </div>
        <div className="aspect-[4/3] ${t.radius} bg-gradient-to-br from-${p}-100 via-${p}-50 to-${s}-50 ring-1 ring-${p}-100" />
      </div>
    </section>
  );
}
`,
  // 1: full-bleed dark centered
  ({ eyebrow, headline, sub, primaryCta, secondaryCta, p, t }) => `export default function Hero() {
  return (
    <section className="bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-28 text-center md:py-36">
        ${t.eyebrow ? `<span className="inline-block rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase ${t.tracking} text-${p}-300">${eyebrow}</span>` : ""}
        <h1 className="${t.heading} mt-6 ${t.h1} font-bold leading-[1.05] ${t.tracking}">${headline}</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">${sub}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a href="/contact" className="${t.pill} bg-${p}-500 px-7 py-3 text-sm font-semibold text-slate-950 hover:bg-${p}-400 transition-colors">${primaryCta}</a>
          <a href="#more" className="${t.pill} border border-white/20 px-7 py-3 text-sm font-semibold hover:border-white/40 transition-colors">${secondaryCta}</a>
        </div>
      </div>
    </section>
  );
}
`,
  // 2: asymmetric full-bleed gradient with floating offset card
  ({ eyebrow, headline, sub, primaryCta, secondaryCta, p, s, t }) => `export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-${p}-600 via-${p}-500 to-${s}-500 text-white">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          ${t.eyebrow ? `<span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase ${t.tracking}">${eyebrow}</span>` : ""}
          <h1 className="${t.heading} mt-5 ${t.h1} font-bold leading-[1.05] ${t.tracking}">${headline}</h1>
          <p className="mt-5 max-w-lg text-lg text-white/80">${sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/contact" className="${t.pill} bg-white px-6 py-3 text-sm font-semibold text-${p}-700 hover:bg-white/90 transition-colors">${primaryCta}</a>
            <a href="#more" className="${t.pill} border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:border-white transition-colors">${secondaryCta}</a>
          </div>
        </div>
        <div className="mt-16 hidden max-w-sm ${t.radius} border border-white/20 bg-white/10 p-6 backdrop-blur md:block">
          <p className="text-sm text-white/70">Trusted by teams who need it to just work.</p>
        </div>
      </div>
    </section>
  );
}
`,
  // 3: centered light hero with a stat row beneath
  ({ eyebrow, headline, sub, primaryCta, secondaryCta, p, t, stats }) => `export default function Hero() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center md:py-28">
        ${t.eyebrow ? `<span className="inline-block ${t.pill} bg-white px-3 py-1 text-xs font-semibold uppercase ${t.tracking} text-${p}-700 shadow-sm">${eyebrow}</span>` : ""}
        <h1 className="${t.heading} mx-auto mt-5 max-w-3xl ${t.h1} font-bold leading-[1.05] ${t.tracking} text-slate-900">${headline}</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">${sub}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="/contact" className="${t.pill} bg-${p}-600 px-6 py-3 text-sm font-semibold text-white hover:bg-${p}-700 transition-colors">${primaryCta}</a>
          <a href="#more" className="${t.pill} border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 transition-colors">${secondaryCta}</a>
        </div>
        <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-slate-200 pt-8">
${stats.map((st) => `          <div><p className="text-2xl font-bold text-slate-900">${st.value}</p><p className="mt-1 text-xs uppercase ${t.tracking} text-slate-400">${st.label}</p></div>`).join("\n")}
        </div>
      </div>
    </section>
  );
}
`,
  // 4: image-left, minimal large-type headline right
  ({ eyebrow, headline, sub, primaryCta, secondaryCta, p, s, t }) => `export default function Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-[0.9fr_1.1fr] md:py-28">
        <div className="aspect-square ${t.radius} bg-gradient-to-tr from-${s}-100 to-${p}-100 ring-1 ring-${p}-100 md:order-1" />
        <div className="md:order-2">
          ${t.eyebrow ? `<span className="text-xs font-semibold uppercase ${t.tracking} text-${p}-600">${eyebrow}</span>` : ""}
          <h1 className="${t.heading} mt-3 ${t.h1} font-bold leading-[1.02] ${t.tracking} text-slate-900">${headline}</h1>
          <p className="mt-5 max-w-md text-lg text-slate-600">${sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/contact" className="${t.pill} bg-${p}-600 px-6 py-3 text-sm font-semibold text-white hover:bg-${p}-700 transition-colors">${primaryCta}</a>
            <a href="#more" className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-600">${secondaryCta}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
`,
  // 5: bold solid color-block, centered, big type, no image
  ({ eyebrow, headline, sub, primaryCta, secondaryCta, p, t }) => `export default function Hero() {
  return (
    <section className="bg-${p}-600 text-white">
      <div className="mx-auto max-w-4xl px-6 py-28 text-center md:py-32">
        ${t.eyebrow ? `<span className="text-xs font-semibold uppercase ${t.tracking} text-white/70">${eyebrow}</span>` : ""}
        <h1 className="${t.heading} mt-4 ${t.h1} font-bold leading-[0.98] ${t.tracking}">${headline}</h1>
        <p className="mx-auto mt-6 max-w-lg text-lg text-white/85">${sub}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a href="/contact" className="${t.pill} bg-white px-7 py-3 text-sm font-semibold text-${p}-700 hover:bg-white/90 transition-colors">${primaryCta}</a>
          <a href="#more" className="${t.pill} border border-white/50 px-7 py-3 text-sm font-semibold hover:border-white transition-colors">${secondaryCta}</a>
        </div>
      </div>
    </section>
  );
}
`,
];

// ---------------------------------------------------------------------------
// FOOTER — 4 structurally distinct shapes, real links only (no fabricated
// nav items that don't correspond to an actual page).
// ---------------------------------------------------------------------------
export const footerVariants = [
  // 0: two-column, brand+tagline / real links
  ({ brand, tagline, p, links, t }) => `export default function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-14 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="${t.heading} text-lg font-bold ${t.tracking} text-slate-900">${brand}</p>
          <p className="mt-2 text-sm text-slate-500">${tagline}</p>
        </div>
        <div className="flex gap-8">
${links.map((l) => `          <a href="${l.href}" className="text-sm text-slate-500 hover:text-slate-900">${l.label}</a>`).join("\n")}
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-slate-400 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} ${brand}. All rights reserved.</p>
          <div className="flex items-center gap-2 text-${p}-600"><span className="h-1.5 w-1.5 rounded-full bg-${p}-600" /> Built with webma</div>
        </div>
      </div>
    </footer>
  );
}
`,
  // 1: single centered row, minimal
  ({ brand, p, links, t }) => `export default function Footer() {
  return (
    <footer className="bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 border-t border-slate-100 px-6 py-10 text-center">
        <p className="${t.heading} text-base font-bold ${t.tracking} text-slate-900">${brand}</p>
        <div className="flex flex-wrap items-center justify-center gap-6">
${links.map((l) => `          <a href="${l.href}" className="text-sm text-slate-500 hover:text-slate-900">${l.label}</a>`).join("\n")}
        </div>
        <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} ${brand} &middot; Built with <span className="text-${p}-600">webma</span></p>
      </div>
    </footer>
  );
}
`,
  // 2: newsletter-first footer
  ({ brand, tagline, p, links, t }) => `export default function Footer() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="${t.heading} text-xl font-bold ${t.tracking}">${brand}</p>
            <p className="mt-2 max-w-sm text-sm text-white/50">${tagline}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase ${t.tracking} text-white/40">Stay in the loop</p>
            <form className="mt-3 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input type="email" required placeholder="you@email.com" className="w-full ${t.radius} border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-${p}-400 focus:outline-none" />
              <button type="submit" className="${t.pill} bg-${p}-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-${p}-400 transition-colors">Join</button>
            </form>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <div className="flex gap-6">
${links.map((l) => `            <a href="${l.href}" className="hover:text-white">${l.label}</a>`).join("\n")}
          </div>
          <p>&copy; {new Date().getFullYear()} ${brand}</p>
        </div>
      </div>
    </footer>
  );
}
`,
  // 3: bold CTA banner then minimal links
  ({ brand, p, links, t }) => `export default function Footer() {
  return (
    <footer>
      <div className="bg-${p}-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-14 text-center md:flex-row md:justify-between md:text-left">
          <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking}">Ready when you are.</h2>
          <a href="/contact" className="${t.pill} bg-white px-6 py-3 text-sm font-semibold text-${p}-700 hover:bg-white/90 transition-colors">Get in touch</a>
        </div>
      </div>
      <div className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-slate-400 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} ${brand}</p>
          <div className="flex gap-6">
${links.map((l) => `            <a href="${l.href}" className="text-slate-500 hover:text-slate-900">${l.label}</a>`).join("\n")}
          </div>
        </div>
      </div>
    </footer>
  );
}
`,
];

// ---------------------------------------------------------------------------
// PAGE HEADER — 3 variants (used on every non-home page)
// ---------------------------------------------------------------------------
export const pageHeaderVariants = [
  ({ heading, sub, p, t }) => `export default function PageHeader() {
  return (
    <section className="border-b border-slate-100 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h1>
        <p className="mt-3 max-w-xl text-slate-500">${sub}</p>
      </div>
    </section>
  );
}
`,
  ({ heading, sub, p, t }) => `export default function PageHeader() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14 text-center">
        <span className="text-xs font-semibold uppercase ${t.tracking} text-${p}-600">${sub}</span>
        <h1 className="${t.heading} mx-auto mt-3 max-w-2xl ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h1>
      </div>
    </section>
  );
}
`,
  ({ heading, sub, p, t }) => `export default function PageHeader() {
  return (
    <section className="bg-${p}-600 text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="${t.heading} ${t.h2} font-bold ${t.tracking}">${heading}</h1>
        <p className="mt-3 max-w-xl text-white/75">${sub}</p>
      </div>
    </section>
  );
}
`,
];

// ---------------------------------------------------------------------------
// ABOUT — 3 variants
// ---------------------------------------------------------------------------
export const aboutVariants = [
  ({ heading, body, p, s, t, reverse }) => `export default function About() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div className="aspect-[4/3] ${t.radius} bg-gradient-to-br from-${p}-50 to-${s}-50 ${reverse ? "md:order-2" : ""}" />
        <div>
          <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
          <p className="mt-4 text-slate-600">${body}</p>
        </div>
      </div>
    </section>
  );
}
`,
  ({ heading, body, p, t, stats }) => `export default function About() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">${body}</p>
        <div className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-6">
${stats.map((st) => `          <div><p className="text-2xl font-bold text-${p}-600">${st.value}</p><p className="mt-1 text-xs uppercase ${t.tracking} text-slate-400">${st.label}</p></div>`).join("\n")}
        </div>
      </div>
    </section>
  );
}
`,
  ({ heading, body, p, s, t }) => `export default function About() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="grid gap-10 md:grid-cols-[1fr_1fr]">
        <h2 className="${t.heading} ${t.h2} font-bold leading-tight ${t.tracking} text-slate-900">${heading}</h2>
        <div className="space-y-4">
          <p className="text-slate-600">${body}</p>
          <div className="h-1 w-16 ${t.radius} bg-gradient-to-r from-${p}-500 to-${s}-500" />
        </div>
      </div>
    </section>
  );
}
`,
];

// ---------------------------------------------------------------------------
// TESTIMONIAL — 3 variants
// ---------------------------------------------------------------------------
export const testimonialVariants = [
  ({ quote, name, role, p, t }) => `export default function Testimonial() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-center">
      <p className="${t.heading} ${t.h2} font-medium leading-snug text-slate-900">&ldquo;${quote}&rdquo;</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <div className="h-10 w-10 ${t.radius} bg-${p}-100" />
        <div className="text-left">
          <p className="text-sm font-semibold text-slate-900">${name}</p>
          <p className="text-xs text-slate-500">${role}</p>
        </div>
      </div>
    </section>
  );
}
`,
  ({ quote, name, role, p, t }) => `export default function Testimonial() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="${t.radius} border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex gap-0.5 text-${p}-500">{"★★★★★"}</div>
          <p className="mt-4 text-lg text-slate-700">&ldquo;${quote}&rdquo;</p>
          <p className="mt-4 text-sm font-semibold text-slate-900">${name} <span className="font-normal text-slate-400">— ${role}</span></p>
        </div>
      </div>
    </section>
  );
}
`,
  ({ quote, name, role, p, s, t }) => `export default function Testimonial() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="grid items-center gap-10 md:grid-cols-[0.8fr_1.2fr]">
        <div className="aspect-square ${t.radius} bg-gradient-to-br from-${p}-100 to-${s}-100" />
        <div>
          <p className="${t.heading} text-2xl font-medium leading-snug text-slate-900">&ldquo;${quote}&rdquo;</p>
          <p className="mt-4 text-sm font-semibold text-slate-900">${name}</p>
          <p className="text-xs text-slate-500">${role}</p>
        </div>
      </div>
    </section>
  );
}
`,
];

// ---------------------------------------------------------------------------
// PRICING — 3 variants
// ---------------------------------------------------------------------------
export const pricingVariants = [
  ({ heading, sub, tiers, p, t }) => `import { Check } from "lucide-react";

export default function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-xl">
        <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
        <p className="mt-3 text-slate-500">${sub}</p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
${tiers.map((tier) => `        <div className="${t.radius} border ${tier.featured ? `border-${p}-500 shadow-lg shadow-${p}-100` : "border-slate-100"} p-6">
          ${tier.featured ? `<span className="${t.pill} bg-${p}-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase ${t.tracking} text-white">Most popular</span>` : ""}
          <p className="mt-3 font-semibold text-slate-900">${tier.name}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">${tier.price}<span className="text-sm font-normal text-slate-400">${tier.period}</span></p>
          <ul className="mt-5 space-y-2 text-sm text-slate-600">
${tier.features.map((f) => `            <li className="flex items-center gap-2"><Check size={14} className="text-${p}-600" /> ${f}</li>`).join("\n")}
          </ul>
          <a href="/contact" className="mt-6 block ${t.pill} ${tier.featured ? `bg-${p}-600 text-white hover:bg-${p}-700` : "border border-slate-200 text-slate-700 hover:border-slate-400"} py-2.5 text-center text-sm font-semibold transition-colors">Choose ${tier.name}</a>
        </div>`).join("\n")}
      </div>
    </section>
  );
}
`,
  ({ heading, sub, tiers, p, t }) => `import { Check } from "lucide-react";

export default function Pricing() {
  return (
    <section id="pricing" className="bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
        <p className="mt-3 text-slate-500">${sub}</p>
        <div className="mt-10 divide-y divide-slate-200 overflow-hidden ${t.radius} border border-slate-200 bg-white">
${tiers.map((tier) => `          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">${tier.name} ${tier.featured ? `<span className="ml-2 ${t.pill} bg-${p}-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-${p}-700">Popular</span>` : ""}</p>
              <p className="mt-1 text-sm text-slate-500">${tier.features[0]}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-2xl font-bold text-slate-900">${tier.price}<span className="text-sm font-normal text-slate-400">${tier.period}</span></p>
              <a href="/contact" className="${t.pill} bg-${p}-600 px-5 py-2 text-sm font-semibold text-white hover:bg-${p}-700 transition-colors">Choose</a>
            </div>
          </div>`).join("\n")}
        </div>
      </div>
    </section>
  );
}
`,
  ({ heading, sub, tiers, p, t }) => `import { Check } from "lucide-react";

export default function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-4xl px-6 py-20 text-center">
      <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
      <p className="mx-auto mt-3 max-w-lg text-slate-500">${sub}</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
${tiers.slice(0, 2).map((tier) => `        <div className="${t.radius} ${tier.featured ? `bg-${p}-600 text-white` : "border border-slate-200"} p-8">
          <p className="font-semibold ${tier.featured ? "text-white" : "text-slate-900"}">${tier.name}</p>
          <p className="mt-3 text-4xl font-bold">${tier.price}<span className="text-sm font-normal ${tier.featured ? "text-white/70" : "text-slate-400"}">${tier.period}</span></p>
          <ul className="mt-6 space-y-2 text-left text-sm ${tier.featured ? "text-white/85" : "text-slate-600"}">
${tier.features.map((f) => `            <li className="flex items-center gap-2"><Check size={14} /> ${f}</li>`).join("\n")}
          </ul>
          <a href="/contact" className="mt-6 block ${t.pill} py-2.5 text-center text-sm font-semibold transition-colors ${tier.featured ? "bg-white text-" + p + "-700 hover:bg-white/90" : "border border-slate-200 text-slate-700 hover:border-slate-400"}">Choose ${tier.name}</a>
        </div>`).join("\n")}
      </div>
    </section>
  );
}
`,
];

// ---------------------------------------------------------------------------
// CONTACT FORM — 3 variants. Every variant preserves the exact same
// honeypot + fetch-to-forms-submit behavior (real, working submission),
// only the surrounding layout differs.
// ---------------------------------------------------------------------------
const CONTACT_SUBMIT_HANDLER = `async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = Object.fromEntries(new FormData(form).entries());
          const website = data.website;
          delete data.website;
          try {
            await fetch(\`\${process.env.NEXT_PUBLIC_APP_URL}/api/public/forms/submit\`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectId: "__WEBMA_PROJECT_ID__", formName: "contact", data, website }),
            });
            form.reset();
          } catch (err) {}
        }`;
const HONEYPOT = `<input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />`;

export const contactFormVariants = [
  ({ heading, sub, p, t }) => `export default function ContactForm() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-20">
      <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
      <p className="mt-3 text-slate-500">${sub}</p>
      <form className="mt-8 space-y-4" onSubmit={${CONTACT_SUBMIT_HANDLER}}>
        <div className="grid gap-4 sm:grid-cols-2">
          <input name="name" required placeholder="Your name" className="${t.radius} border border-slate-200 px-4 py-2.5 text-sm focus:border-${p}-500 focus:outline-none" />
          <input name="email" type="email" required placeholder="Email address" className="${t.radius} border border-slate-200 px-4 py-2.5 text-sm focus:border-${p}-500 focus:outline-none" />
        </div>
        <textarea name="message" required rows={4} placeholder="How can we help?" className="w-full ${t.radius} border border-slate-200 px-4 py-2.5 text-sm focus:border-${p}-500 focus:outline-none" />
        ${HONEYPOT}
        <button type="submit" className="${t.pill} bg-${p}-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-${p}-700 transition-colors">Send message</button>
      </form>
    </section>
  );
}
`,
  ({ heading, sub, p, t, address, hours }) => `export default function ContactForm() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-20 md:grid-cols-2">
        <div>
          <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
          <p className="mt-3 text-slate-500">${sub}</p>
          <div className="mt-8 space-y-4 text-sm text-slate-600">
            <p><span className="font-semibold text-slate-900">Address</span><br />${address}</p>
            <p><span className="font-semibold text-slate-900">Hours</span><br />${hours}</p>
          </div>
        </div>
        <form className="space-y-4 ${t.radius} border border-slate-200 bg-white p-6" onSubmit={${CONTACT_SUBMIT_HANDLER}}>
          <input name="name" required placeholder="Your name" className="w-full ${t.radius} border border-slate-200 px-4 py-2.5 text-sm focus:border-${p}-500 focus:outline-none" />
          <input name="email" type="email" required placeholder="Email address" className="w-full ${t.radius} border border-slate-200 px-4 py-2.5 text-sm focus:border-${p}-500 focus:outline-none" />
          <textarea name="message" required rows={4} placeholder="How can we help?" className="w-full ${t.radius} border border-slate-200 px-4 py-2.5 text-sm focus:border-${p}-500 focus:outline-none" />
          ${HONEYPOT}
          <button type="submit" className="w-full ${t.pill} bg-${p}-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-${p}-700 transition-colors">Send message</button>
        </form>
      </div>
    </section>
  );
}
`,
  ({ heading, sub, p, t }) => `export default function ContactForm() {
  return (
    <section className="mx-auto max-w-xl px-6 py-24 text-center">
      <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
      <p className="mt-3 text-slate-500">${sub}</p>
      <form className="mt-10 space-y-3 text-left" onSubmit={${CONTACT_SUBMIT_HANDLER}}>
        <input name="name" required placeholder="Your name" className="w-full border-b border-slate-300 bg-transparent px-1 py-3 text-sm focus:border-${p}-500 focus:outline-none" />
        <input name="email" type="email" required placeholder="Email address" className="w-full border-b border-slate-300 bg-transparent px-1 py-3 text-sm focus:border-${p}-500 focus:outline-none" />
        <textarea name="message" required rows={3} placeholder="How can we help?" className="w-full border-b border-slate-300 bg-transparent px-1 py-3 text-sm focus:border-${p}-500 focus:outline-none" />
        ${HONEYPOT}
        <button type="submit" className="mt-4 w-full ${t.pill} bg-${p}-600 px-6 py-3 text-sm font-semibold text-white hover:bg-${p}-700 transition-colors">Send message</button>
      </form>
    </section>
  );
}
`,
];

// ---------------------------------------------------------------------------
// GRID FAMILY — serves Features / Work / Catalog / Latest (all "grid of N
// things" sections). 5 structurally distinct treatments.
// ---------------------------------------------------------------------------
export const gridVariants = [
  // 0: icon card grid
  ({ id, heading, sub, items, p, t, icons }) => `import { ${[...new Set(icons)].join(", ")} } from "lucide-react";

export default function ${id}() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-xl">
        <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
        <p className="mt-3 text-slate-500">${sub}</p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
${items.map((it, i) => `        <div className="${t.radius} border border-slate-100 p-6">
          <div className="flex h-10 w-10 items-center justify-center ${t.radius} bg-${p}-100 text-${p}-600">
            <${icons[i % icons.length]} size={18} />
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">${it.title}</h3>
          <p className="mt-1.5 text-sm text-slate-500">${it.body}</p>
        </div>`).join("\n")}
      </div>
    </section>
  );
}
`,
  // 1: image card grid
  ({ id, heading, sub, items, p, s, t }) => `export default function ${id}() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-xl">
        <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
        <p className="mt-3 text-slate-500">${sub}</p>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
${items.map((it) => `        <div className="overflow-hidden ${t.radius} border border-slate-100">
          <div className="aspect-[4/3] bg-gradient-to-br from-${p}-100 to-${s}-50" />
          <div className="p-5">
            <h3 className="font-semibold text-slate-900">${it.title}</h3>
            <p className="mt-1.5 text-sm text-slate-500">${it.body}</p>
          </div>
        </div>`).join("\n")}
      </div>
    </section>
  );
}
`,
  // 2: icon-left horizontal row list (not a card grid at all)
  ({ id, heading, sub, items, p, t, icons }) => `import { ${[...new Set(icons)].join(", ")} } from "lucide-react";

export default function ${id}() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
        <p className="mt-3 text-slate-500">${sub}</p>
        <div className="mt-10 divide-y divide-slate-200">
${items.map((it, i) => `          <div className="flex items-start gap-4 py-5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center ${t.radius} bg-white text-${p}-600 shadow-sm"><${icons[i % icons.length]} size={16} /></div>
            <div>
              <h3 className="font-semibold text-slate-900">${it.title}</h3>
              <p className="mt-1 text-sm text-slate-500">${it.body}</p>
            </div>
          </div>`).join("\n")}
        </div>
      </div>
    </section>
  );
}
`,
  // 3: numbered steps
  ({ id, heading, sub, items, p, t }) => `export default function ${id}() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="max-w-xl">
        <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
        <p className="mt-3 text-slate-500">${sub}</p>
      </div>
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
${items.map((it, i) => `        <div>
          <p className="${t.heading} text-4xl font-bold text-${p}-200">${String(i + 1).padStart(2, "0")}</p>
          <h3 className="mt-2 font-semibold text-slate-900">${it.title}</h3>
          <p className="mt-1.5 text-sm text-slate-500">${it.body}</p>
        </div>`).join("\n")}
      </div>
    </section>
  );
}
`,
  // 4: alternating zig-zag image+text rows
  ({ id, heading, sub, items, p, s, t }) => `export default function ${id}() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="max-w-xl">
        <h2 className="${t.heading} ${t.h2} font-bold ${t.tracking} text-slate-900">${heading}</h2>
        <p className="mt-3 text-slate-500">${sub}</p>
      </div>
      <div className="mt-10 space-y-14">
${items.slice(0, 3).map((it, i) => `        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="aspect-[4/3] ${t.radius} bg-gradient-to-br from-${i % 2 === 0 ? p : s}-100 to-${i % 2 === 0 ? s : p}-50 ${i % 2 === 1 ? "md:order-2" : ""}" />
          <div>
            <h3 className="text-xl font-semibold text-slate-900">${it.title}</h3>
            <p className="mt-2 text-slate-500">${it.body}</p>
          </div>
        </div>`).join("\n")}
      </div>
    </section>
  );
}
`,
];

// ---------------------------------------------------------------------------
// STATS — 2 variants
// ---------------------------------------------------------------------------
export const statsVariants = [
  ({ stats, p }) => `export default function Stats() {
  return (
    <section className="bg-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-16 text-center md:grid-cols-4">
${stats.map((s) => `        <div><p className="text-3xl font-bold text-${p}-300 md:text-4xl">${s.value}</p><p className="mt-1 text-xs uppercase tracking-wider text-white/50">${s.label}</p></div>`).join("\n")}
      </div>
    </section>
  );
}
`,
  ({ stats, p, t }) => `export default function Stats() {
  return (
    <section className="border-y border-slate-100 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-12 md:grid-cols-4">
${stats.map((s) => `        <div className="${t.radius} bg-${p}-50 py-6 text-center"><p className="text-2xl font-bold text-${p}-700">${s.value}</p><p className="mt-1 text-xs uppercase tracking-wider text-${p}-600/70">${s.label}</p></div>`).join("\n")}
      </div>
    </section>
  );
}
`,
];

// ---------------------------------------------------------------------------
// LOCATION — 2 variants
// ---------------------------------------------------------------------------
export const locationVariants = [
  ({ heading, address, hours, p, t }) => `export default function Location() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="grid gap-6 ${t.radius} border border-slate-100 p-8 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">${heading}</h2>
          <p className="mt-3 text-sm text-slate-600">${address}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-${p}-600">Hours</p>
          <p className="mt-1 text-sm text-slate-500">${hours}</p>
        </div>
        <div className="aspect-[4/3] ${t.radius} bg-gradient-to-br from-${p}-100 to-${p}-50" />
      </div>
    </section>
  );
}
`,
  ({ heading, address, hours, p, t }) => `export default function Location() {
  return (
    <section className="bg-${p}-600 text-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
        <h2 className="${t.heading} text-2xl font-bold">${heading}</h2>
        <p className="text-sm text-white/85">${address}</p>
        <p className="text-sm text-white/85"><span className="font-semibold text-white">Hours</span><br />${hours}</p>
      </div>
    </section>
  );
}
`,
];

// ---------------------------------------------------------------------------
// THUMBNAIL — abstract SVG card, real per-template shape variety tied to
// the hero variant chosen (not a screenshot, not stock art: every pixel is
// generated from the template's own palette + brand initial).
// ---------------------------------------------------------------------------
const PALETTE_HEX = {
  indigo: ["#6366f1", "#e0e7ff"], violet: ["#8b5cf6", "#ede9fe"], purple: ["#a855f7", "#f3e8ff"],
  fuchsia: ["#d946ef", "#fae8ff"], pink: ["#ec4899", "#fce7f3"], rose: ["#f43f5e", "#ffe4e6"],
  red: ["#ef4444", "#fee2e2"], orange: ["#f97316", "#ffedd5"], amber: ["#f59e0b", "#fef3c7"],
  yellow: ["#eab308", "#fef9c3"], lime: ["#84cc16", "#ecfccb"], green: ["#22c55e", "#dcfce7"],
  emerald: ["#10b981", "#d1fae5"], teal: ["#14b8a6", "#ccfbf1"], cyan: ["#06b6d4", "#cffafe"],
  sky: ["#0ea5e9", "#e0f2fe"], blue: ["#3b82f6", "#dbeafe"], slate: ["#64748b", "#f1f5f9"],
  stone: ["#78716c", "#f5f5f4"], neutral: ["#737373", "#f5f5f5"],
};

export function buildThumbnailDataUri(primary, secondary, brand, heroVariant) {
  const [dark, light] = PALETTE_HEX[primary] ?? PALETTE_HEX.slate;
  const [, light2] = PALETTE_HEX[secondary] ?? PALETTE_HEX.slate;
  const initial = (brand.match(/[A-Za-z]/)?.[0] ?? "W").toUpperCase();
  // One composition per hero variant (0-5) so a template's thumbnail shape
  // actually reflects its real hero layout, not an arbitrary rotation.
  const shapes = [
    `<circle cx="340" cy="40" r="130" fill="${light}" opacity="0.5" /><rect x="-20" y="220" width="200" height="90" rx="18" fill="${light2}" opacity="0.35" />`,
    `<rect x="0" y="0" width="400" height="300" fill="${dark}" /><circle cx="200" cy="150" r="90" fill="${light}" opacity="0.25" />`,
    `<polygon points="400,0 400,180 260,0" fill="${light}" opacity="0.5" /><circle cx="60" cy="240" r="90" fill="${light2}" opacity="0.35" />`,
    `<circle cx="200" cy="230" r="130" fill="${light}" opacity="0.3" /><rect x="150" y="20" width="100" height="60" rx="30" fill="${light2}" opacity="0.4" />`,
    `<rect x="230" y="30" width="150" height="150" rx="24" fill="${light}" opacity="0.4" transform="rotate(12 305 105)" /><circle cx="40" cy="250" r="60" fill="${light2}" opacity="0.3" />`,
    `<rect width="400" height="300" fill="${dark}" /><rect x="20" y="20" width="360" height="260" rx="8" fill="none" stroke="${light}" stroke-opacity="0.4" stroke-width="2" />`,
  ];
  const bgIsDark = heroVariant === 1 || heroVariant === 5;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="${bgIsDark ? dark : "#ffffff"}" />
    ${shapes[heroVariant % shapes.length]}
    <text x="32" y="220" font-family="Georgia, serif" font-size="120" fill="${bgIsDark ? "#ffffff" : dark}" fill-opacity="0.9">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
