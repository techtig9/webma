import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0E14",
        paper: "#F7F5F0",
        // Consolidation pass (release/all): brought in from release/design's
        // Phase 3 rebrand — webma's chosen direction is indigo -> sky
        // (this token was previously solid orange, itself a rebrand of the
        // original blue-violet — see git history on either predecessor
        // branch). signal is still THE primary/CTA/brand token used
        // throughout buttons, focus rings, links and the AI accent, so this
        // one value change cascades the new identity everywhere it's
        // already wired. signal2 is the gradient's sky endpoint; amber
        // (used purely as this app's semantic "warning" color, not a brand
        // accent) is retuned to sit inside the same family rather than
        // clash with it. release/design's `violet` token is still NOT
        // ported — grepped across this branch's actual src/ and it's
        // referenced nowhere, so there's nothing for it to serve.
        signal: "#6366F1",
        signal2: "#38BDF8",
        amber: "#FBBF24",
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
        // Used by Hero.tsx's "with AI." gradient-text span, ported from
        // release/design's rebrand.
        "brand-gradient": "linear-gradient(135deg, #6366F1 0%, #38BDF8 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
