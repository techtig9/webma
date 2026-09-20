"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface AdminFeedback {
  id: string;
  type: "bug" | "feature" | "other";
  message: string;
  status: "open" | "reviewed" | "closed";
  created_at: string;
  users: { name: string; email: string };
}

const STATUS_COLOR: Record<string, string> = {
  open: "text-amber",
  reviewed: "text-signal",
  closed: "text-ink/40",
};

const TYPE_LABEL: Record<string, string> = {
  bug: "Bug",
  feature: "Feature request",
  other: "Other",
};

export default function AdminFeedbackPage() {
  const toast = useToast();
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch("/api/admin/list-feedback");
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      setItems(data.feedback ?? []);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(feedbackId: string, status: string) {
    setUpdatingId(feedbackId);
    try {
      const res = await fetch("/api/admin/update-feedback-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, status }),
      });
      if (!res.ok) throw new Error("request failed");
      await load();
    } catch {
      toast.show("error", "Couldn't update that status — try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold">Feedback</h1>
        <p className="font-mono text-sm text-ink/50">
          Open: <span className="text-ink">{items.filter((i) => i.status === "open").length}</span>
        </p>
      </div>
      <div className="glass-panel mt-6 overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
          <thead className="bg-ink/[0.03] text-xs uppercase text-ink/40">
            <tr>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                  Loading…
                </td>
              </tr>
            ) : loadFailed ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                  Couldn&apos;t load feedback.{" "}
                  <button onClick={() => load()} className="font-medium text-signal hover:underline">
                    Retry
                  </button>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                  No feedback yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    {item.users?.name}
                    <p className="text-xs text-ink/40">{item.users?.email}</p>
                  </td>
                  <td className="px-4 py-3">{TYPE_LABEL[item.type]}</td>
                  <td className="max-w-xs px-4 py-3 text-ink/70">{item.message}</td>
                  <td className={`px-4 py-3 capitalize ${STATUS_COLOR[item.status] ?? ""}`}>{item.status}</td>
                  <td className="px-4 py-3 text-ink/40">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      disabled={updatingId === item.id}
                      onChange={(e) => updateStatus(item.id, e.target.value)}
                      className="focus-ring rounded-lg border border-ink/15 bg-transparent px-2 py-1 text-xs"
                    >
                      <option value="open">Open</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
