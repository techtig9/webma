"use client";

import { useEffect, useState } from "react";
import { Gift, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

interface ReferralStats {
  code: string;
  totalReferred: number;
  creditedReferrals: number;
  creditsEarned: number;
}

export function ReferralCard() {
  const toast = useToast();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    fetch("/api/referrals")
      .then((r) => {
        if (!r.ok) throw new Error("request failed");
        return r.json();
      })
      .then(setStats)
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const link = stats ? `${window.location.origin}/signup?ref=${stats.code}` : "";

  function handleCopy() {
    navigator.clipboard.writeText(link).then(() => toast.show("success", "Referral link copied."));
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Gift size={16} className="text-signal" />
        <h2 className="h2">Invite friends, earn credits</h2>
      </div>
      <p className="mt-1 text-sm text-ink/50">
        Share your link — you and your friend each get 500 bonus credits when they sign up.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-ink/40">Loading…</p>
      ) : loadFailed || !stats ? (
        <p className="mt-4 text-sm text-ink/40">Couldn&apos;t load your referral link.</p>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              className="focus-ring flex-1 rounded-lg border border-ink/15 bg-ink/[0.02] px-3 py-2 font-mono text-xs"
            />
            <button
              onClick={handleCopy}
              aria-label="Copy referral link"
              className="focus-ring lift-on-hover flex items-center gap-1.5 rounded-lg border border-ink/15 px-3 py-2 text-xs font-medium hover:bg-ink/5"
            >
              <Copy size={13} /> Copy
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-ink/[0.03] p-3">
              <p className="font-display text-lg font-bold">{stats.totalReferred}</p>
              <p className="font-mono text-xs text-ink/50">Friends referred</p>
            </div>
            <div className="rounded-lg bg-ink/[0.03] p-3">
              <p className="font-display text-lg font-bold">{stats.creditsEarned.toLocaleString()}</p>
              <p className="font-mono text-xs text-ink/50">Credits earned</p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
