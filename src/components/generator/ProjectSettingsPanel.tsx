"use client";

import { useEffect, useState } from "react";
import { Globe, Trash2, RefreshCw, History } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { Page } from "@/lib/preview";

interface Domain {
  id: string;
  domain: string;
  status: "pending" | "verifying" | "active" | "failed";
  created_at: string;
}

interface VersionEntry {
  version: number;
  created_at: string;
}

const statusColor: Record<Domain["status"], string> = {
  pending: "text-ink/40",
  verifying: "text-amber",
  active: "text-signal2",
  failed: "text-red-500",
};

export function ProjectSettingsPanel({
  projectId,
  pages,
  onLockedAction,
  onVersionRestored,
  onPagesChange,
}: {
  projectId: string;
  pages: Page[];
  onLockedAction: (message: string) => void;
  onVersionRestored: (files: Record<string, string>, pages?: Page[]) => void;
  onPagesChange: (pages: Page[]) => void;
}) {
  const toast = useToast();

  // SEO — "" means the site-wide default; any other value is a page slug,
  // editing that one page's override instead.
  const [selectedPageSlug, setSelectedPageSlug] = useState<string>("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoOgImageUrl, setSeoOgImageUrl] = useState("");
  const [savingSeo, setSavingSeo] = useState(false);

  // Domains
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Version history
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/domains/list?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setDomains(data.domains ?? []))
      .catch(() => {});
    fetch(`/api/projects/versions?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setVersions(data.versions ?? []))
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    const page = pages.find((p) => p.slug === selectedPageSlug);
    setSeoTitle(page?.seoTitle ?? "");
    setSeoDescription(page?.seoDescription ?? "");
    setSeoOgImageUrl(page?.seoOgImageUrl ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPageSlug]);

  async function saveSeo() {
    setSavingSeo(true);
    try {
      if (selectedPageSlug) {
        const res = await fetch("/api/projects/update-page-seo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, slug: selectedPageSlug, seoTitle, seoDescription, seoOgImageUrl }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          toast.show("error", data?.message ?? "Couldn't save that page's SEO settings.");
          return;
        }
        onPagesChange(data.pages);
        toast.show("success", "Page SEO settings saved.");
      } else {
        const res = await fetch("/api/projects/seo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, seoTitle, seoDescription, seoOgImageUrl }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          toast.show("error", data?.message ?? "Couldn't save SEO settings.");
          return;
        }
        toast.show("success", "SEO settings saved.");
      }
    } catch {
      toast.show("error", "Network error — SEO settings didn't save.");
    } finally {
      setSavingSeo(false);
    }
  }

  async function addDomain() {
    if (!newDomain.trim()) return;
    setAddingDomain(true);
    try {
      const res = await fetch("/api/domains/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, domain: newDomain.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 403) {
        onLockedAction(data?.message ?? "Upgrade your plan to add a custom domain.");
        return;
      }
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't add domain.");
        return;
      }
      setDomains((prev) => [
        { id: data.id, domain: newDomain.trim(), status: data.verified ? "active" : "verifying", created_at: new Date().toISOString() },
        ...prev,
      ]);
      setNewDomain("");
      toast.show(
        data.verified ? "success" : "success",
        data.verified ? "Domain connected." : "Domain added — add the DNS records shown to finish verification."
      );
    } catch {
      toast.show("error", "Network error — domain wasn't added.");
    } finally {
      setAddingDomain(false);
    }
  }

  async function recheckDomain(domainId: string) {
    setVerifyingId(domainId);
    try {
      const res = await fetch("/api/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });
      const data = await res.json().catch(() => null);
      setDomains((prev) => prev.map((d) => (d.id === domainId ? { ...d, status: data?.status ?? d.status } : d)));
    } catch {
      toast.show("error", "Network error — couldn't recheck domain.");
    } finally {
      setVerifyingId(null);
    }
  }

  async function removeDomain(domainId: string) {
    setDomains((prev) => prev.filter((d) => d.id !== domainId));
    try {
      await fetch("/api/domains/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });
    } catch {
      toast.show("error", "Network error — domain removal may not have completed.");
    }
  }

  async function restoreVersion(version: number) {
    setRestoringVersion(version);
    try {
      const res = await fetch("/api/projects/restore-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, version }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 403) {
        onLockedAction(data?.message ?? "Upgrade your plan to restore this version.");
        return;
      }
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't restore that version.");
        return;
      }
      onVersionRestored(data.files, data.pages ?? undefined);
      setVersions((prev) => [{ version: data.newVersion, created_at: new Date().toISOString() }, ...prev]);
      toast.show("success", `Restored version ${version}.`);
    } catch {
      toast.show("error", "Network error — restore didn't complete.");
    } finally {
      setRestoringVersion(null);
    }
  }

  return (
    <div className="glass-panel grid gap-6 rounded-xl p-5 md:grid-cols-3">
      <div>
        <h3 className="font-display text-sm font-bold">SEO</h3>
        <p className="mt-1 text-xs text-ink/50">Controls how this site appears in search results and link previews.</p>
        {pages.length > 1 && (
          <select
            value={selectedPageSlug}
            onChange={(e) => setSelectedPageSlug(e.target.value)}
            className="focus-ring mt-3 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
          >
            <option value="">Site-wide default</option>
            {pages.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name} page
              </option>
            ))}
          </select>
        )}
        <div className="mt-3 space-y-2.5">
          <input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder={selectedPageSlug ? "Title (blank = use site-wide default)" : "Page title (defaults to website name)"}
            maxLength={60}
            className="focus-ring w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
          />
          <textarea
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            placeholder={
              selectedPageSlug ? "Description (blank = use site-wide default)" : "Meta description (under 160 characters)"
            }
            maxLength={160}
            rows={2}
            className="focus-ring w-full resize-none rounded-lg border border-ink/15 px-3 py-2 text-sm"
          />
          <input
            value={seoOgImageUrl}
            onChange={(e) => setSeoOgImageUrl(e.target.value)}
            placeholder="Social preview image URL (optional)"
            className="focus-ring w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
          />
          <button
            onClick={saveSeo}
            disabled={savingSeo}
            className="focus-ring rounded-full bg-signal px-4 py-1.5 text-xs font-medium text-paper hover:bg-signal2 disabled:opacity-50"
          >
            {savingSeo ? "Saving…" : selectedPageSlug ? "Save page SEO" : "Save SEO settings"}
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-display text-sm font-bold">Custom domains</h3>
        <p className="mt-1 text-xs text-ink/50">Connect your own domain once the site is deployed to Vercel.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !addingDomain && addDomain()}
            placeholder="yourdomain.com"
            className="focus-ring flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm"
          />
          <button
            onClick={addDomain}
            disabled={addingDomain || !newDomain.trim()}
            className="focus-ring shrink-0 rounded-full bg-signal px-4 py-2 text-xs font-medium text-paper hover:bg-signal2 disabled:opacity-50"
          >
            {addingDomain ? "Adding…" : "Add"}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {domains.length === 0 && <p className="text-xs text-ink/35">No domains connected yet.</p>}
          {domains.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-ink/10 px-3 py-2">
              <div className="flex items-center gap-2">
                <Globe size={13} className="text-ink/40" />
                <span className="text-sm">{d.domain}</span>
                <span className={`font-mono text-[11px] uppercase ${statusColor[d.status]}`}>{d.status}</span>
              </div>
              <div className="flex items-center gap-1">
                {d.status === "verifying" && (
                  <button
                    onClick={() => recheckDomain(d.id)}
                    disabled={verifyingId === d.id}
                    className="focus-ring rounded-md p-1.5 text-ink/40 hover:text-ink"
                    aria-label="Recheck verification"
                  >
                    <RefreshCw size={13} className={verifyingId === d.id ? "animate-spin" : ""} />
                  </button>
                )}
                <button
                  onClick={() => removeDomain(d.id)}
                  className="focus-ring rounded-md p-1.5 text-ink/40 hover:text-red-500"
                  aria-label="Remove domain"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-sm font-bold">Version history</h3>
        <p className="mt-1 text-xs text-ink/50">Restore an earlier version — this adds a new version, it never deletes history.</p>
        <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
          {versions.length === 0 && <p className="text-xs text-ink/35">No versions yet.</p>}
          {versions.map((v, i) => (
            <div key={v.version} className="flex items-center justify-between rounded-lg border border-ink/10 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <History size={13} className="text-ink/40" />
                <span>Version {v.version}</span>
                {i === 0 && <span className="font-mono text-[11px] text-signal2">current</span>}
              </div>
              {i !== 0 && (
                <button
                  onClick={() => restoreVersion(v.version)}
                  disabled={restoringVersion !== null}
                  className="focus-ring font-mono text-[11px] text-signal hover:underline disabled:opacity-50"
                >
                  {restoringVersion === v.version ? "Restoring…" : "Restore"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
            }
