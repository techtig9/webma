"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Lock } from "lucide-react";
import { LivePreview } from "@/components/generator/LivePreview";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Page } from "@/lib/preview";

interface TemplateDetail {
  id: string;
  name: string;
  description: string;
  tags: string[];
  style: string | null;
  industry: string | null;
  tierRequired: string;
  locked: boolean;
  files: Record<string, string>;
  pages: Page[];
}

/** The "professional preview" spec section 22 asks for — desktop/tablet/
 * mobile toggle, template info, pages included, and a "use template"
 * action. Deliberately reuses LivePreview (the exact same component the
 * real editor renders generated sites with) instead of a bespoke
 * screenshot or a second rendering implementation — this is a REAL live
 * preview of the template's actual files, not a static image that could
 * go stale or mislead. */
export function TemplatePreviewModal({ templateId, onClose }: { templateId: string; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string>("index");
  const [using, setUsing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/templates/detail?templateId=${templateId}`)
      .then((r) => r.json())
      .then((data: TemplateDetail) => {
        if (cancelled) return;
        setDetail(data);
        setActiveSlug(data.pages[0]?.slug ?? "index");
      })
      .catch(() => {
        if (!cancelled) toast.show("error", "Couldn't load that template's preview.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [templateId, toast]);

  async function handleUse() {
    if (!detail || detail.locked || using) return;
    setUsing(true);
    try {
      const res = await fetch("/api/templates/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't use that template.");
        setUsing(false);
        return;
      }
      router.push(`/dashboard/generator?project=${data.projectId}`);
    } catch {
      toast.show("error", "Network error — couldn't use that template.");
      setUsing(false);
    }
  }

  const activePage = detail?.pages.find((p) => p.slug === activeSlug) ?? detail?.pages[0];

  return (
    <Modal onClose={onClose} ariaLabel={detail ? `${detail.name} preview` : "Template preview"} className="h-full max-w-5xl">
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-6 py-4">
          <div className="min-w-0">
            {loading ? (
              <div className="h-6 w-40 animate-pulse rounded bg-ink/10" />
            ) : (
              <>
                <h2 className="truncate font-display text-lg font-bold">{detail?.name}</h2>
                <p className="mt-0.5 truncate text-xs text-ink/50">{detail?.description}</p>
              </>
            )}
          </div>
          <button onClick={onClose} aria-label="Close preview" className="focus-ring shrink-0 rounded-full p-1.5 text-ink/40 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {!loading && detail && (
          <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 px-6 py-3">
            {detail.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
            {detail.pages.length > 1 && (
              <div className="ml-auto flex items-center gap-1">
                {detail.pages.map((p) => (
                  <button
                    key={p.slug}
                    onClick={() => setActiveSlug(p.slug)}
                    className={`rounded-full px-2.5 py-1 font-mono text-[10px] ${
                      activeSlug === p.slug ? "bg-signal text-paper" : "border border-ink/15 text-ink/60 hover:border-ink"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="animate-spin text-ink/30" size={24} />
            </div>
          ) : detail ? (
            <LivePreview files={detail.files} sections={activePage?.sections ?? []} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink/40">Couldn't load this template.</div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-ink/10 px-6 py-4">
          <span className="font-mono text-[10px] uppercase text-ink/40">
            {detail?.pages.length ?? 0} page{(detail?.pages.length ?? 0) === 1 ? "" : "s"} · {detail?.tierRequired ?? ""} plan
          </span>
          {detail?.locked ? (
            <Button variant="secondary" onClick={() => router.push("/dashboard/billing")}>
              <Lock size={14} className="mr-1.5" /> Upgrade to use this template
            </Button>
          ) : (
            <Button onClick={handleUse} disabled={using || loading}>
              {using ? "Creating your project…" : "Use this template"}
            </Button>
          )}
        </div>
    </Modal>
  );
}
