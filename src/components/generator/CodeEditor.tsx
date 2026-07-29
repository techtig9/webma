"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

// Monaco is client-only and fairly heavy — load it lazily so it never blocks the
// initial dashboard render, per the spec's "dynamic imports, code splitting" requirement.
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="p-4 text-sm text-ink/40">Loading editor…</div>,
});

export function CodeEditor({
  files,
  onChange,
  active,
  onActiveChange,
}: {
  files: Record<string, string>;
  onChange: (path: string, value: string) => void;
  active: string;
  onActiveChange: (path: string) => void;
}) {
  const paths = Object.keys(files);

  // Keep the active tab valid if the file map changes (e.g. an AI edit lands, or a
  // project with a different file set loads) — default to the first file.
  useEffect(() => {
    if (paths.length && !paths.includes(active)) onActiveChange(paths[0]);
  }, [paths, active, onActiveChange]);

  if (!paths.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-ink/10 text-sm text-ink/30">
        Generate a site to start editing its code.
      </div>
    );
  }

  return (
    <div className="glass-panel flex h-full flex-col overflow-hidden rounded-xl">
      <div className="flex gap-1 overflow-x-auto border-b border-ink/10 bg-ink/[0.03] px-2 py-1.5">
        {paths.map((p) => (
          <button
            key={p}
            onClick={() => onActiveChange(p)}
            className={`focus-ring whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-xs ${
              active === p ? "bg-signal text-paper" : "text-ink/50 hover:bg-ink/5"
            }`}
          >
            {p.split("/").pop()}
          </button>
        ))}
      </div>
      <div className="flex-1">
        <Editor
          key={active}
          height="100%"
          language="typescript"
          theme="vs-dark"
          value={files[active]}
          onChange={(value) => onChange(active, value ?? "")}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            automaticLayout: true,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}
