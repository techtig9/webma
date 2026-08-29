"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Copy, Trash2, Loader2, Search } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Asset {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string;
  created_at: string;
  url: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetsPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingAltId, setEditingAltId] = useState<string | null>(null);
  const [altDraft, setAltDraft] = useState("");
  const [query, setQuery] = useState("");

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => a.file_name.toLowerCase().includes(q) || a.alt_text.toLowerCase().includes(q));
  }, [assets, query]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch("/api/assets/list");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setAssets(data.assets ?? []);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  async function saveAltText(assetId: string) {
    const altText = altDraft.trim();
    setEditingAltId(null);
    setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, alt_text: altText } : a)));
    try {
      const res = await fetch("/api/assets/update-alt-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, altText }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      toast.show("error", "Couldn't save alt text — try again.");
      load();
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/assets/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.show("error", data.message ?? "Upload failed.");
        return;
      }
      toast.show("success", "Uploaded.");
      await load();
    } catch {
      toast.show("error", "Network error — try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(assetId: string) {
    if (!window.confirm("Delete this image? This can't be undone.")) return;
    const res = await fetch("/api/assets/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.show("error", data.message ?? "Couldn't delete that asset.");
      return;
    }
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    toast.show("success", "Image URL copied — paste it into an AI edit instruction to use it.");
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Assets</h1>
          <p className="mt-1 text-sm text-ink/50">
            Upload images to use in your generated websites — logos, photos, anything you want on a page.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="focus-ring flex items-center gap-2 rounded-lg bg-signal px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? "Uploading…" : "Upload image"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileSelect} className="hidden" />
      </div>

      {!loading && !loadFailed && assets.length > 0 && (
        <div className="relative mt-6 max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by filename or alt text…"
            className="focus-ring w-full rounded-full border border-ink/15 py-2 pl-8 pr-3 text-sm"
          />
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-ink/[0.04]" />
          ))}
        </div>
      ) : loadFailed ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink/15 p-10 text-center">
          <p className="text-sm text-ink/50">Couldn't load your assets — check your connection and try again.</p>
          <button onClick={load} className="focus-ring rounded-full border border-ink/15 px-4 py-2 text-sm hover:border-ink">
            Retry
          </button>
        </div>
      ) : assets.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 p-10 text-center">
          <p className="text-sm text-ink/50">No images yet — upload one to use it in your websites.</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 p-10 text-center">
          <p className="text-sm text-ink/50">No images match "{query}".</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="glass-panel overflow-hidden rounded-xl">
              <div className="aspect-square bg-ink/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt={asset.alt_text || asset.file_name} className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{asset.file_name}</p>
                <p className="text-xs text-ink/40">{formatSize(asset.size_bytes)}</p>

                {editingAltId === asset.id ? (
                  <input
                    autoFocus
                    value={altDraft}
                    onChange={(e) => setAltDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveAltText(asset.id)}
                    onBlur={() => saveAltText(asset.id)}
                    placeholder="Describe this image…"
                    maxLength={250}
                    className="focus-ring mt-1.5 w-full rounded-md border border-ink/15 px-2 py-1 text-xs"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingAltId(asset.id);
                      setAltDraft(asset.alt_text ?? "");
                    }}
                    className="focus-ring mt-1.5 block w-full truncate rounded-md px-0.5 text-left text-xs text-ink/40 hover:bg-ink/5 hover:text-ink/70"
                  >
                    {asset.alt_text ? asset.alt_text : "+ Add alt text"}
                  </button>
                )}

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleCopy(asset.url)}
                    className="focus-ring flex flex-1 items-center justify-center gap-1 rounded-md border border-ink/15 py-1.5 text-xs hover:bg-ink/5"
                  >
                    <Copy size={12} /> Copy URL
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="focus-ring flex items-center justify-center rounded-md border border-ink/15 px-2 py-1.5 text-red-500 hover:bg-red-500/10"
                    aria-label="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
