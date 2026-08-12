"use client";

import { useEffect, useState } from "react";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import { buildPreviewHtml, resolvePages, type Page } from "@/lib/preview";

const DEVICES = {
  desktop: { width: "100%", icon: Monitor },
  tablet: { width: "768px", icon: Tablet },
  mobile: { width: "390px", icon: Smartphone },
} as const;

type Device = keyof typeof DEVICES;

export function LivePreview({
  files,
  sections,
  pages,
}: {
  files: Record<string, string>;
  sections: string[];
  pages?: Page[];
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const hasContent = Object.keys(files).length > 0;

  const resolvedPages = resolvePages(files, pages && pages.length > 0 ? pages : null);
  const [activeSlug, setActiveSlug] = useState(resolvedPages[0]?.slug ?? "index");

  useEffect(() => {
    if (!resolvedPages.some((p) => p.slug === activeSlug)) {
      setActiveSlug(resolvedPages[0]?.slug ?? "index");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const activePage = resolvedPages.find((p) => p.slug === activeSlug) ?? resolvedPages[0];

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

      {hasContent && resolvedPages.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-ink/10 px-3 py-2">
          {resolvedPages.map((page) => (
            <button
              key={page.slug}
              onClick={() => setActiveSlug(page.slug)}
              className={`focus-ring shrink-0 rounded-full px-3 py-1 font-mono text-xs transition-colors ${
                activeSlug === page.slug
                  ? "bg-signal text-paper"
                  : "border border-ink/15 text-ink/50 hover:border-ink"
              }`}
            >
              {page.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 items-start justify-center overflow-auto bg-ink/[0.03] p-4">
        {hasContent ? (
          <iframe
            key={activeSlug}
            title="Generated site preview"
            className="h-full rounded-lg border border-ink/10 bg-white shadow-sm transition-all"
            style={{ width: DEVICES[device].width, minHeight: "600px" }}
            sandbox="allow-scripts"
            srcDoc={buildPreviewHtml(files, activePage?.sections ?? sections)}
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
