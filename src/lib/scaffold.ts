// Turns the flat `components/*.tsx` file map (what the AI actually generates) into
// a real, working project — for both live deploys and downloaded exports.
//
// This exists because neither deploy nor export previously assembled the pieces
// into an actual running app: the raw component files were shipped with no page
// that imports and renders them, and no Tailwind configuration to turn all those
// className strings into actual CSS. A deployed or exported site would build (or
// half-build) but show a blank, unstyled page — the generation/editing/preview
// pipeline worked, but the "ship it" step silently didn't.

function componentNamesFrom(files: Record<string, string>) {
  return Object.keys(files)
    .filter((f) => f.startsWith("components/"))
    .map((f) => f.replace(/^components\//, "").replace(/\.tsx?$/, ""));
}

/** app/page.tsx for a Next.js deploy or export — imports every generated
 * component and renders them in order, exactly like the preview does.
 * Used as the single-page fallback for projects without a pages structure. */
export function buildNextPage(files: Record<string, string>): string {
  const names = componentNamesFrom(files);
  return buildNextPageForSections(names, 1);
}

/** Same idea, but for one specific page's section list — the multi-page case,
 * where each page only renders its own sections (shared ones like Navbar/Footer
 * appear in more than one page's list, importing the same underlying file).
 *
 * `depth` is how many folders deep this page.tsx sits under the project root —
 * the home page lives at app/page.tsx (depth 1, so "../components/X"), but
 * every other page lives at app/{slug}/page.tsx (depth 2, so "../../components/X").
 * Getting this wrong doesn't fail loudly — it just makes the import unresolvable.
 *
 * `seo`, when given, adds a page-level `metadata` export — Next.js App Router
 * uses this to override the site-wide default from layout.tsx for just this one
 * page. Omit any field to fall back to the layout's default for that field. */
export function buildNextPageForSections(
  sectionNames: string[],
  depth: number,
  seo?: { title?: string; description?: string; ogImageUrl?: string }
): string {
  const prefix = "../".repeat(depth) + "components/";
  const imports = sectionNames.map((name) => `import ${name} from "${prefix}${name}";`).join("\n");
  const elements = sectionNames.map((name) => `      <${name} />`).join("\n");

  const hasSeo = seo && (seo.title || seo.description || seo.ogImageUrl);
  const metadataBlock = hasSeo
    ? `import type { Metadata } from "next";\n\nexport const metadata: Metadata = {\n${
        seo!.title ? `  title: ${JSON.stringify(seo!.title)},\n` : ""
      }${seo!.description ? `  description: ${JSON.stringify(seo!.description)},\n` : ""}${
        seo!.ogImageUrl ? `  openGraph: { images: [${JSON.stringify(seo!.ogImageUrl)}] },\n` : ""
      }};\n\n`
    : "";

  return `${metadataBlock}${imports}\n\nexport default function Page() {\n  return (\n    <>\n${elements}\n    </>\n  );\n}\n`;
}

export const NEXT_CONFIG = `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\n\nmodule.exports = nextConfig;\n`;

export const TAILWIND_CONFIG_NEXT = `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],\n  theme: { extend: {} },\n  plugins: [],\n};\n`;

export const TAILWIND_CONFIG_VITE = `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  content: ["./index.html", "./src/**/*.{ts,tsx}"],\n  theme: { extend: {} },\n  plugins: [],\n};\n`;

export const POSTCSS_CONFIG = `module.exports = {\n  plugins: { tailwindcss: {}, autoprefixer: {} },\n};\n`;

export const GLOBALS_CSS = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;

/** src/App.tsx for a Vite/React export — same idea as buildNextPage, different
 * import path and export shape (Vite doesn't use Next's app-router page convention). */
export function buildViteApp(files: Record<string, string>): string {
  const names = componentNamesFrom(files);
  const imports = names.map((name) => `import ${name} from "./components/${name}";`).join("\n");
  const elements = names.map((name) => `      <${name} />`).join("\n");
  return `${imports}\n\nexport default function App() {\n  return (\n    <>\n${elements}\n    </>\n  );\n}\n`;
}

export const VITE_MAIN_TSX = `import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`;

export const VITE_CONFIG = `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`;
