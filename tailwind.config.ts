import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0E14",
        paper: "#F7F5F0",
        // Was #5B6CFF (blue-violet) — recolored to match the Figma reference's
        // "strong orange accent" (confirmed via the uploaded screenshot of the
        // actual homepage, not guessed from the document's prose description
        // alone). signal already functioned as THE primary/CTA/brand color
        // throughout the entire product before this change — buttons, focus
        // rings, links, the AI accent — so this one value change correctly
        // cascades the shift everywhere it's used, rather than needing a new
        // token threaded through every component individually.
        signal: "#FF5C28",
        signal2: "#00D4B8",
        amber: "#FF8A3D",
        coral: "#FB7185",
        line: "#22283A",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        accent: ["var(--font-accent)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
