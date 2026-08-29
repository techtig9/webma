"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Heart, X } from "lucide-react";
import { TemplateCard } from "@/components/dashboard/TemplateCard";
import { TemplatePreviewModal } from "@/components/dashboard/TemplatePreviewModal";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TemplateSort, TemplateSummary } from "@/lib/templates";

type TemplateWithLock = TemplateSummary & { locked: boolean };

interface ListResponse {
  templates: TemplateWithLock[];
  facets: { categories: string[]; industries: string[]; styles: string[] };
}

const SORTS: { value: TemplateSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
];

export default function TemplatesPage() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [sort, setSort] = useState<TemplateSort>("featured");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Debounced so typing a search query doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedQuery.trim()) p.set("q", debouncedQuery.trim());
    if (category) p.set("category", category);
    if (industry) p.set("industry", industry);
    if (style) p.set("style", style);
    if (favoritesOnly) p.set("favoritesOnly", "true");
    p.set("sort", sort);
    return p.toString();
  }, [debouncedQuery, category, industry, style, favoritesOnly, sort]);

  function load() {
    setLoading(true);
    setError(false);
    fetch(`/api/templates/list?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((d: ListResponse) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function toggleFavorite(templateId: string) {
    // Optimistic update — flips the card's heart instantly, then
    // reconciles with the server's authoritative response; on failure it
    // reloads the real list rather than leaving a stale optimistic state.
    setData((prev) =>
      prev
        ? { ...prev, templates: prev.templates.map((t) => (t.id === templateId ? { ...t, isFavorited: !t.isFavorited } : t)) }
        : prev
    );
    try {
      const res = await fetch("/api/templates/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      toast.show("error", "Couldn't update favorites.");
      load();
    }
  }

  const hasActiveFilters = category || industry || style || favoritesOnly || debouncedQuery.trim();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Templates</h1>
          <p className="mt-1 text-sm text-ink/50">Start from a real, working site — locked templates unlock as you upgrade.</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="focus-ring w-full rounded-full border border-ink/15 py-2 pl-8 pr-3 text-sm"
          />
        </div>
      </div>

      {data?.facets && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <FilterChip label="Favorites" active={favoritesOnly} icon={<Heart size={11} fill={favoritesOnly ? "currentColor" : "none"} />} onClick={() => setFavoritesOnly((v) => !v)} />
          {data.facets.categories.map((c) => (
            <FilterChip key={c} label={c} active={category === c} onClick={() => setCategory((v) => (v === c ? null : c))} />
          ))}
          {data.facets.industries.map((i) => (
            <FilterChip key={i} label={i} active={industry === i} onClick={() => setIndustry((v) => (v === i ? null : i))} />
          ))}
          {data.facets.styles.map((s) => (
            <FilterChip key={s} label={s} active={style === s} onClick={() => setStyle((v) => (v === s ? null : s))} />
          ))}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setQuery("");
                setCategory(null);
                setIndustry(null);
                setStyle(null);
                setFavoritesOnly(false);
              }}
              className="focus-ring flex items-center gap-1 rounded-full px-2.5 py-1.5 font-mono text-[10px] text-ink/40 hover:text-ink"
            >
              <X size={11} /> Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-1 font-mono text-[10px] text-ink/40">
            {SORTS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSort(s.value)}
                className={`rounded-full px-2.5 py-1.5 ${sort === s.value ? "bg-signal text-paper" : "hover:text-ink"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3]" />
            ))}
          </div>
        ) : error ? (
          <div className="glass-panel flex flex-col items-center gap-3 rounded-xl py-16 text-center">
            <p className="text-sm text-ink/50">Couldn't load templates — check your connection and try again.</p>
            <button onClick={load} className="focus-ring rounded-full border border-ink/15 px-4 py-2 text-sm hover:border-ink">
              Retry
            </button>
          </div>
        ) : data && data.templates.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.templates.map((t) => (
              <TemplateCard
                key={t.id}
                id={t.id}
                name={t.name}
                description={t.description}
                tierRequired={t.tierRequired}
                thumbnail={t.thumbnail}
                locked={t.locked}
                isFavorited={t.isFavorited}
                onOpenPreview={setPreviewId}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel flex flex-col items-center gap-1 rounded-xl py-16 text-center">
            <p className="text-sm text-ink/50">
              {favoritesOnly ? "No favorited templates yet." : "No templates match those filters."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setQuery("");
                  setCategory(null);
                  setIndustry(null);
                  setStyle(null);
                  setFavoritesOnly(false);
                }}
                className="mt-2 text-xs text-signal hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {previewId && <TemplatePreviewModal templateId={previewId} onClose={() => setPreviewId(null)} />}
    </div>
  );
}

function FilterChip({
  label,
  active,
  icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 font-mono text-[10px] capitalize ${
        active ? "border-signal bg-signal text-paper" : "border-ink/15 text-ink/60 hover:border-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
