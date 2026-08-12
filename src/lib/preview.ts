// Renders the generated site's files inside an iframe without a bundler, so the
// dashboard's Live Preview can update instantly as sections are generated/edited.
// Real export (ZIP / React / Next.js project) uses the ORIGINAL files with their
// imports/exports intact — this stripped-down version is preview-only.

/** Removes import/export syntax so each file becomes a plain global function
 * declaration that Babel Standalone can run directly in the browser, no bundler needed. */
function stripModuleSyntax(code: string): string {
  return code
    .replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, "")
    .replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, "")
    .replace(/export\s+default\s+function/g, "function")
    .replace(/export\s+default\s+/g, "")
    .replace(/export\s+(function|const|class)/g, "$1");
}

/** Derives the section render order directly from the generated file map, so
 * reloading a saved project (which only persists `files`) can rebuild the same
 * preview without depending on Gemini's separate `sections` list staying in sync. */
export function deriveSections(files: Record<string, string>): string[] {
  return Object.keys(files)
    .filter((f) => f.startsWith("components/"))
    .map((f) => f.replace(/^components\//, "").replace(/\.tsx?$/, ""));
}

export interface Page {
  slug: string;
  path: string;
  name: string;
  sections: string[];
  // Optional per-page overrides — when unset, export/deploy fall back to the
  // project's site-wide SEO settings (or just the page/site name) for that page.
  seoTitle?: string;
  seoDescription?: string;
  seoOgImageUrl?: string;
}

/** Falls back to one implicit "Home" page containing every section, for projects
 * generated before multi-page support existed (their stored `pages` is null) or
 * on the rare case the AI's page structure comes back malformed. Every existing
 * project keeps working exactly as it does today — this is purely additive. */
export function resolvePages(files: Record<string, string>, pages: Page[] | null | undefined): Page[] {
  if (pages && pages.length > 0) return pages;
  return [{ slug: "index", path: "/", name: "Home", sections: deriveSections(files) }];
}

export function buildPreviewHtml(files: Record<string, string>, sections: string[]): string {
  const componentNames = sections.map((s) => s.replace(/[^A-Za-z0-9]/g, ""));

  const body = Object.values(files).map(stripModuleSyntax).join("\n\n");

  const appSource = `
    function GeneratedApp() {
      return React.createElement(React.Fragment, null,
        ${componentNames.map((c) => `typeof ${c} !== "undefined" ? React.createElement(${c}) : null`).join(",\n        ")}
      );
    }
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(GeneratedApp));
  `;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.25.6/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Generated files import hooks by name ("import { useState } from 'react'"),
    but stripModuleSyntax below removes that whole import line — so those names
    need to exist as globals too, or every component using a hook throws
    "useState is not defined" the instant it renders. -->
    <script>
      window.useState = React.useState;
      window.useEffect = React.useEffect;
      window.useRef = React.useRef;
      window.useMemo = React.useMemo;
      window.useCallback = React.useCallback;
      window.useContext = React.useContext;
      window.useReducer = React.useReducer;
      window.useLayoutEffect = React.useLayoutEffect;
    </script>
    <!-- Generated components almost always use lucide-react icons (it's the icon
    library webma itself uses, so Gemini defaults to it too) — without this, every
    icon reference like <Cpu /> or <Menu /> is an undefined variable, which throws
    the instant React tries to render and blanks the whole preview, not just the icon.
    lucide-react's UMD build expects a lowercase "react" global (its factory function
    reads global.react, not global.React) — the bridge line below covers that. -->
    <script>window.react = window.React;</script>
    <script src="https://unpkg.com/lucide-react@0.417.0/dist/umd/lucide-react.min.js"></script>
    <script>
      // NOT Object.assign — lucide-react exports an icon literally named "Infinity",
      // and Object.assign throws outright the instant it can't overwrite a built-in
      // read-only global like window.Infinity, aborting every icon after it too.
      // Plain assignment just silently skips that one collision instead.
      for (var __iconName in window.LucideReact) {
        window[__iconName] = window.LucideReact[__iconName];
      }
    </script>
    <style>body { margin: 0; }</style>
  </head>
  <body>
    <div id="root">
      <div style="font-family: sans-serif; padding: 2rem; color: #999;">Generating preview…</div>
    </div>
    <script type="text/babel" data-presets="react">
      ${body}
      ${appSource}
    </script>
  </body>
</html>`;
}
