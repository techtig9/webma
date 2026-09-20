"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Pencil, Trash2, Eye, EyeOff, Plus, Star } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Reveal } from "@/components/ui/Reveal";

interface AdminTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  tags: string[];
  style: string | null;
  industry: string | null;
  tier_required: string;
  thumbnail: string | null;
  is_featured: boolean;
  is_active: boolean;
  use_count: number;
  created_at: string;
}

interface TemplateDetail extends AdminTemplate {
  structure: { files?: Record<string, string>; pages?: unknown[] } | null;
}

const TIERS = ["free", "starter", "pro", "business"];

const EMPTY_STRUCTURE = JSON.stringify({ files: { "components/Hero.tsx": "export default function Hero() { return <div>Hero</div>; }" }, pages: [{ slug: "index", path: "/", name: "Home", sections: ["Hero"] }] }, null, 2);

interface FormState {
  category: string;
  name: string;
  description: string;
  tags: string;
  style: string;
  industry: string;
  tierRequired: string;
  thumbnail: string;
  isFeatured: boolean;
  structure: string;
}

function toFormState(t?: TemplateDetail): FormState {
  return {
    category: t?.category ?? "",
    name: t?.name ?? "",
    description: t?.description ?? "",
    tags: t?.tags?.join(", ") ?? "",
    style: t?.style ?? "",
    industry: t?.industry ?? "",
    tierRequired: t?.tier_required ?? "free",
    thumbnail: t?.thumbnail ?? "",
    isFeatured: t?.is_featured ?? false,
    structure: t?.structure ? JSON.stringify(t.structure, null, 2) : EMPTY_STRUCTURE,
  };
}

export default function AdminTemplatesPage() {
  const toast = useToast();
  const [items, setItems] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(toFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch("/api/admin/templates/list");
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      setItems(data.templates ?? []);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(toFormState());
    setFormError(null);
    setFormOpen(true);
  }

  async function openEdit(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/templates/detail?templateId=${id}`);
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      setEditingId(id);
      setForm(toFormState(data.template));
      setFormError(null);
      setFormOpen(true);
    } catch {
      toast.show("error", "Couldn't load that template.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(t: AdminTemplate) {
    setBusyId(t.id);
    try {
      const res = await fetch("/api/admin/templates/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: t.id, isActive: !t.is_active }),
      });
      if (!res.ok) throw new Error("request failed");
      toast.show("success", t.is_active ? "Template deactivated." : "Template activated.");
      await load();
    } catch {
      toast.show("error", "Couldn't update that template.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(t: AdminTemplate) {
    if (!window.confirm(`Delete "${t.name}"? This can't be undone.`)) return;
    setBusyId(t.id);
    try {
      const res = await fetch("/api/admin/templates/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: t.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't delete that template.");
        return;
      }
      toast.show("success", "Template deleted.");
      await load();
    } catch {
      toast.show("error", "Network error — couldn't delete that template.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmit() {
    setFormError(null);

    let structure: unknown;
    try {
      structure = JSON.parse(form.structure);
    } catch {
      setFormError("Template files must be valid JSON.");
      return;
    }
    if (!structure || typeof structure !== "object" || !("files" in structure)) {
      setFormError('Template files JSON must include a "files" object.');
      return;
    }

    const payload = {
      category: form.category.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      style: form.style.trim() || null,
      industry: form.industry.trim() || null,
      tierRequired: form.tierRequired,
      thumbnail: form.thumbnail.trim() || null,
      isFeatured: form.isFeatured,
      structure,
    };

    setSaving(true);
    try {
      const res = await fetch(editingId ? "/api/admin/templates/update" : "/api/admin/templates/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { templateId: editingId, ...payload } : payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(data?.message ?? "Couldn't save that template.");
        return;
      }
      toast.show("success", editingId ? "Template updated." : "Template created.");
      setFormOpen(false);
      await load();
    } catch {
      setFormError("Network error — couldn't save that template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold">Templates</h1>
        <Button onClick={openCreate}><Plus size={15} />Add template</Button>
      </div>

      <Reveal className="glass-panel mt-6 overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink/[0.03] text-xs uppercase text-ink/40">
              <tr>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-ink/40">Loading…</td></tr>
              ) : loadFailed ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                    Couldn&apos;t load templates.{" "}
                    <button onClick={() => load()} className="font-medium text-signal hover:underline">Retry</button>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-ink/40">No templates yet.</td></tr>
              ) : (
                items.map((t) => (
                  <tr key={t.id} className={t.is_active ? "" : "opacity-50"}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-8 w-11 flex-shrink-0 overflow-hidden rounded-md bg-ink/[0.04]">
                          {t.thumbnail && (
                            // unoptimized, same reasoning as TemplateCard: thumbnails aren't
                            // guaranteed to come from an allowlisted host.
                            <Image src={t.thumbnail} alt="" fill unoptimized sizes="44px" className="object-cover" />
                          )}
                        </div>
                        <div>
                          <p className="flex items-center gap-1.5 font-medium">
                            {t.name}
                            {t.is_featured && <Star size={11} className="fill-amber text-amber" />}
                          </p>
                          <p className="text-xs text-ink/40">{t.style ?? "—"}{t.industry ? ` · ${t.industry}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink/70">{t.category}</td>
                    <td className="px-4 py-3 capitalize"><Badge variant={t.tier_required === "free" ? "neutral" : "accent"}>{t.tier_required}</Badge></td>
                    <td className="px-4 py-3 text-ink/50">{t.use_count}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.is_active ? "success" : "warning"}>{t.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(t.id)}
                          disabled={busyId === t.id}
                          className="focus-ring rounded-md p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
                          aria-label={`Edit ${t.name}`}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => toggleActive(t)}
                          disabled={busyId === t.id}
                          className="focus-ring rounded-md p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
                          aria-label={t.is_active ? `Deactivate ${t.name}` : `Activate ${t.name}`}
                          title={t.is_active ? "Deactivate" : "Activate"}
                        >
                          {t.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          disabled={busyId === t.id}
                          className="focus-ring rounded-md p-1.5 text-ink/40 hover:bg-red-500/10 hover:text-red-500"
                          aria-label={`Delete ${t.name}`}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Reveal>

      {formOpen && (
        <Modal onClose={() => setFormOpen(false)} ariaLabel={editingId ? "Edit template" : "Add template"} className="max-w-2xl">
          <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
            <h2 className="font-display text-lg font-semibold">{editingId ? "Edit template" : "Add template"}</h2>
          </div>
          <div className="space-y-4 overflow-y-auto px-5 py-4">
            {formError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{formError}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-ink/60">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="saas-input mt-1.5" /></label>
              <label className="text-xs font-medium text-ink/60">Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Restaurant" className="saas-input mt-1.5" /></label>
            </div>
            <label className="block text-xs font-medium text-ink/60">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="saas-input mt-1.5 resize-none" /></label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-xs font-medium text-ink/60">Style<input value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} placeholder="e.g. modern" className="saas-input mt-1.5" /></label>
              <label className="text-xs font-medium text-ink/60">Industry<input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. hospitality" className="saas-input mt-1.5" /></label>
              <label className="text-xs font-medium text-ink/60">Tier required
                <select value={form.tierRequired} onChange={(e) => setForm({ ...form, tierRequired: e.target.value })} className="saas-input mt-1.5">
                  {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-xs font-medium text-ink/60">Tags (comma-separated)<input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="modern, dark, minimal" className="saas-input mt-1.5" /></label>
            <label className="block text-xs font-medium text-ink/60">Thumbnail URL or data URI<input value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://... or data:image/jpeg;base64,..." className="saas-input mt-1.5" /></label>
            <label className="flex items-center gap-2 text-xs font-medium text-ink/60">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="h-4 w-4 rounded border-ink/20" />
              Featured (shown on the public landing page)
            </label>
            <label className="block text-xs font-medium text-ink/60">
              Template files (JSON — {"{"}files, pages{"}"}, same shape a project's own files use)
              <textarea value={form.structure} onChange={(e) => setForm({ ...form, structure: e.target.value })} rows={10} className="saas-input mt-1.5 resize-none font-mono text-xs" spellCheck={false} />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-ink/10 px-5 py-4">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.name.trim() || !form.category.trim()}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create template"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
