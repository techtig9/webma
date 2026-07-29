"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link2, Unlink } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Connection {
  provider: "vercel" | "netlify";
  provider_account_email: string | null;
  created_at: string;
}

const PROVIDERS = [
  { id: "vercel" as const, label: "Vercel" },
  { id: "netlify" as const, label: "Netlify" },
];

export function DeployConnectionsSection() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/deploy-oauth/status")
      .then((r) => r.json())
      .then((data) => setConnections(data.connections ?? []));

    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) toast.show("success", `${connected} connected — your sites will deploy under your own account.`);
    if (error) toast.show("error", "Couldn't connect that provider. It may not be configured yet — see .env.example.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function disconnect(provider: string) {
    setDisconnecting(provider);
    try {
      await fetch("/api/deploy-oauth/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      setConnections((prev) => prev.filter((c) => c.provider !== provider));
      toast.show("success", `${provider} disconnected.`);
    } catch {
      toast.show("error", "Network error — disconnect didn't complete.");
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h2 className="font-display font-bold">Deploy connections</h2>
      <p className="mt-1 text-sm text-ink/50">
        Connect your own Vercel or Netlify account so your sites deploy under it, not Techtig&apos;s.
      </p>
      <div className="mt-4 space-y-2">
        {PROVIDERS.map((p) => {
          const conn = connections.find((c) => c.provider === p.id);
          return (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-ink/10 px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <span>{p.label}</span>
                {conn && <span className="font-mono text-[11px] text-signal2">connected</span>}
              </div>
              {conn ? (
                <button
                  onClick={() => disconnect(p.id)}
                  disabled={disconnecting === p.id}
                  className="focus-ring flex items-center gap-1.5 text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  <Unlink size={12} /> {disconnecting === p.id ? "Disconnecting…" : "Disconnect"}
                </button>
              ) : (
                <a
                  href={`/api/deploy-oauth/${p.id}/authorize`}
                  className="focus-ring flex items-center gap-1.5 text-xs text-signal hover:underline"
                >
                  <Link2 size={12} /> Connect
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
