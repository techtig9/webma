"use client";

import { useEffect, useState } from "react";
import { Trash2, Flag } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  updated_at: string;
}

export default function AdminFeatureFlagsPage() {
  const toast = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  function load() {
    setLoading(true);
    setLoadFailed(false);
    fetch("/api/admin/feature-flags")
      .then((r) => {
        if (!r.ok) throw new Error("request failed");
        return r.json();
      })
      .then((data) => setFlags(data.flags ?? []))
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(flag: FeatureFlag) {
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: flag.key, enabled: !flag.enabled, description: flag.description }),
      });
      if (!res.ok) throw new Error("request failed");
      load();
    } catch {
      toast.show("error", "Couldn't update that flag — try again.");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim(), enabled: false, description: newDescription.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "request failed");
      setNewKey("");
      setNewDescription("");
      load();
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Couldn't create that flag.");
    } finally {
      setCreating(false);
    }
  }

  async function remove(key: string) {
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("request failed");
      load();
    } catch {
      toast.show("error", "Couldn't remove that flag — try again.");
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Feature Flags</h1>
      <p className="mt-1 text-sm text-ink/50">
        Checked by <code className="rounded bg-ink/[0.06] px-1 py-0.5 text-xs">isFeatureEnabled()</code>{" "}
        anywhere in the app that needs to keep an incomplete or risky feature hidden.
      </p>

      <form onSubmit={handleCreate} className="glass-panel mt-6 flex flex-wrap items-end gap-3 rounded-xl p-4">
        <div>
          <label htmlFor="flag-key" className="mb-1.5 block text-xs font-medium">Key</label>
          <input
            id="flag-key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="new_billing_flow"
            className="focus-ring rounded-md border border-ink/15 px-3 py-1.5 text-xs"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="flag-description" className="mb-1.5 block text-xs font-medium">Description</label>
          <input
            id="flag-description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="What this gates"
            className="focus-ring w-full rounded-md border border-ink/15 px-3 py-1.5 text-xs"
          />
        </div>
        <button
          type="submit"
          disabled={creating || !newKey.trim()}
          className="focus-ring flex items-center gap-1.5 rounded-full bg-signal px-4 py-1.5 text-xs font-medium text-paper disabled:opacity-40"
        >
          <Flag size={12} /> Add flag
        </button>
      </form>

      <div className="glass-panel mt-6 overflow-hidden rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink/[0.03] text-xs uppercase text-ink/40">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">Loading…</td>
              </tr>
            ) : loadFailed ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  Couldn&apos;t load flags.{" "}
                  <button onClick={load} className="font-medium text-signal hover:underline">Retry</button>
                </td>
              </tr>
            ) : flags.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">No feature flags yet.</td>
              </tr>
            ) : (
              flags.map((flag) => (
                <tr key={flag.key}>
                  <td className="px-4 py-3 font-mono text-xs">{flag.key}</td>
                  <td className="px-4 py-3 text-ink/60">{flag.description || "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      role="switch"
                      aria-checked={flag.enabled}
                      onClick={() => toggle(flag)}
                      className={`focus-ring rounded-full px-3 py-1 text-xs font-medium ${
                        flag.enabled ? "bg-signal2/20 text-signal2" : "bg-ink/10 text-ink/50"
                      }`}
                    >
                      {flag.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-ink/40">{new Date(flag.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => remove(flag.key)}
                      aria-label={`Delete ${flag.key}`}
                      className="focus-ring text-ink/40 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
