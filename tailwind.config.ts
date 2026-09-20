import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0E14",
        paper: "#F7F5F0",
        // Phase 3 design pass: webma's chosen direction is indigo -> sky
        // (was solid orange, itself a rebrand of the original blue-violet —
        // see git history). signal is still THE primary/CTA/brand token
        // used throughout buttons, focus rings, links and the AI accent, so
        // this one value change cascades the new identity everywhere it's
        // already wired, without touching each call site. signal2 is the
        // gradient's sky endpoint. violet/amber/coral are retuned to sit
        // inside or complement the same family rather than clash with it.
        signal: "#6366F1",
        signal2: "#38BDF8",
        amber: "#FBBF24",
        violet: "#818CF8",
        coral: "#FB7185",
        line: "#22283A",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        accent: ["var(--font-accent)", "Georgia", "serif"],
      },
      backgroundImage: {
        "grid-glow":
          "radial-gradient(circle at 20% 0%, rgba(99,102,241,0.25), transparent 40%), radial-gradient(circle at 80% 10%, rgba(56,189,248,0.18), transparent 45%)",
        "brand-gradient": "linear-gradient(135deg, #6366F1 0%, #38BDF8 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
