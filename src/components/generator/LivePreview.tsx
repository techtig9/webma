"use client";

import { useState } from "react";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import { buildPreviewHtml } from "@/lib/preview";

const DEVICES = {
  desktop: { width: "100%", icon: Monitor },
  tablet: { width: "768px", icon: Tablet },
  mobile: { width: "390px", icon: Smartphone },
} as const;

type Device = keyof typeof DEVICES;

export function LivePreview({
  files,
  sections,
}: {
  files: Record<string, string>;
  sections: string[];
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const hasContent = Object.keys(files).length > 0;

  return (
    <div className="corner-frame glass-panel flex h-full flex-col rounded-xl">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-2.5">
        <span className="font-mono text-xs text-ink/40">Live preview</span>
        <div className="flex gap-1">
          {(Object.keys(DEVICES) as Device[]).map((d) => {
            const Icon = DEVICES[d].icon;
            return (
              <button
                key={d}
                onClick={() => setDevice(d)}
                aria-label={`Preview on ${d}`}
                className={`focus-ring rounded-md p-1.5 ${
                  device === d ? "bg-signal text-paper" : "text-ink/40 hover:text-ink"
                }`}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto bg-ink/[0.03] p-4">
        {hasContent ? (
          <iframe
            title="Generated site preview"
            className="h-full rounded-lg border border-ink/10 bg-white shadow-sm transition-all"
            style={{ width: DEVICES[device].width, minHeight: "600px" }}
            sandbox="allow-scripts"
            srcDoc={buildPreviewHtml(files, sections)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink/30">
            Your generated site will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
