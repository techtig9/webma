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
