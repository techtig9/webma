"use client";

import { Search, Bell } from "lucide-react";

export function Topnav({
  name,
  plan,
  creditsRemaining,
}: {
  name: string;
  plan: string;
  creditsRemaining: number;
}) {
  return (
    <header className="glass-panel !rounded-none !border-x-0 !border-t-0 flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-2 rounded-full border border-ink/10 px-3 py-1.5 text-sm text-ink/50">
        <Search size={14} />
        <input
          placeholder="Search projects, templates…"
          className="w-48 bg-transparent outline-none placeholder:text-ink/30"
        />
      </div>
      <div className="flex items-center gap-5">
        <span className="font-mono text-xs text-ink/50">
          {creditsRemaining.toLocaleString()} credits ·{" "}
          <span className="capitalize text-signal">{plan}</span>
        </span>
        <button className="focus-ring text-ink/50 hover:text-ink">
          <Bell size={18} />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal text-xs font-bold text-paper">
          {name.slice(0, 1).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
