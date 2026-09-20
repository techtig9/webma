"use client";

import { useEffect, useState } from "react";

interface AiUsageResponse {
  windowDays: number;
  totalCalls: number;
  cacheHitRate: number;
  totalCostUsd: number;
  byProvider: Record<string, { calls: number; costUsd: number }>;
  byTask: Record<string, { calls: number; costUsd: number }>;
  topUsers: Array<{ userId: string; calls: number; costUsd: number }>;
}

function formatUsd(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

export default function AdminAiUsagePage() {
  const [data, setData] = useState<AiUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  function load() {
    setLoading(true);
    setLoadFailed(false);
    fetch("/api/admin/ai-usage")
      .then((r) => {
        if (!r.ok) throw new Error("request failed");
        return r.json();
      })
      .then(setData)
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <p className="text-ink/40">Loading…</p>;
  }

  if (loadFailed || !data) {
    return (
      <p className="text-ink/40">
        Couldn&apos;t load AI usage.{" "}
        <button onClick={load} className="font-medium text-signal hover:underline">
          Retry
        </button>
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">AI Usage</h1>
        <p className="font-mono text-xs text-ink/40">Last {data.windowDays} days, up to 5,000 calls</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="glass-panel rounded-xl p-4">
          <p className="font-mono text-xs uppercase text-ink/40">Total calls</p>
          <p className="mt-1 font-display text-2xl font-bold">{data.totalCalls.toLocaleString()}</p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="font-mono text-xs uppercase text-ink/40">Cache hit rate</p>
          <p className="mt-1 font-display text-2xl font-bold">{Math.round(data.cacheHitRate * 100)}%</p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="font-mono text-xs uppercase text-ink/40">Estimated cost</p>
          <p className="mt-1 font-display text-2xl font-bold">{formatUsd(data.totalCostUsd)}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-sm font-bold uppercase text-ink/50">By provider</h2>
          <div className="glass-panel mt-3 overflow-hidden rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink/[0.03] text-xs uppercase text-ink/40">
                <tr>
                  <th className="px-4 py-2">Provider</th>
                  <th className="px-4 py-2">Calls</th>
                  <th className="px-4 py-2">Est. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {Object.entries(data.byProvider).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-ink/40">
                      No AI calls logged yet.
                    </td>
                  </tr>
                ) : (
                  Object.entries(data.byProvider).map(([provider, v]) => (
                    <tr key={provider}>
                      <td className="px-4 py-2">{provider}</td>
                      <td className="px-4 py-2 font-mono text-xs">{v.calls}</td>
                      <td className="px-4 py-2 font-mono text-xs">{formatUsd(v.costUsd)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="font-display text-sm font-bold uppercase text-ink/50">By task</h2>
          <div className="glass-panel mt-3 overflow-hidden rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink/[0.03] text-xs uppercase text-ink/40">
                <tr>
                  <th className="px-4 py-2">Task</th>
                  <th className="px-4 py-2">Calls</th>
                  <th className="px-4 py-2">Est. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {Object.entries(data.byTask).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-ink/40">
                      No AI calls logged yet.
                    </td>
                  </tr>
                ) : (
                  Object.entries(data.byTask).map(([task, v]) => (
                    <tr key={task}>
                      <td className="px-4 py-2 font-mono text-xs">{task}</td>
                      <td className="px-4 py-2 font-mono text-xs">{v.calls}</td>
                      <td className="px-4 py-2 font-mono text-xs">{formatUsd(v.costUsd)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-sm font-bold uppercase text-ink/50">Top users by estimated cost</h2>
        <div className="glass-panel mt-3 overflow-hidden rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink/[0.03] text-xs uppercase text-ink/40">
              <tr>
                <th className="px-4 py-2">User ID</th>
                <th className="px-4 py-2">Calls</th>
                <th className="px-4 py-2">Est. cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.topUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-ink/40">
                    No attributed AI calls yet.
                  </td>
                </tr>
              ) : (
                data.topUsers.map((u) => (
                  <tr key={u.userId}>
                    <td className="px-4 py-2 font-mono text-xs">{u.userId}</td>
                    <td className="px-4 py-2 font-mono text-xs">{u.calls}</td>
                    <td className="px-4 py-2 font-mono text-xs">{formatUsd(u.costUsd)}</td>
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
