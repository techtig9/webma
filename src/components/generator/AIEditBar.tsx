"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function AIEditBar({
  projectId,
  activeFile,
  onApplied,
  onLockedAction,
}: {
  projectId: string | null;
  activeFile: string;
  onApplied: (files: Record<string, string>) => void;
  onLockedAction: (message: string) => void;
}) {
  const toast = useToast();
  const [instruction, setInstruction] = useState("");
  const [applying, setApplying] = useState(false);

  async function handleApply() {
    if (!projectId || !instruction.trim()) return;
    setApplying(true);
    try {
      const res = await fetch("/api/ai/edit-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, targetFile: activeFile, instruction }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 402 || res.status === 403) {
        onLockedAction(data?.message ?? "Upgrade your plan to use AI editing.");
        return;
      }
      if (!res.ok) {
        toast.show("error", data?.message ?? "Edit failed — try again.");
        return;
      }
      onApplied(data.files);
      setInstruction("");
      toast.show("success", `Updated ${activeFile.split("/").pop()}.`);
    } catch {
      toast.show("error", "Network error — edit didn't apply. Try again.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="glass-panel flex items-center gap-2 rounded-full px-2 py-1.5">
      <Sparkles size={14} className="ml-2 shrink-0 text-signal" />
      <input
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !applying && handleApply()}
        placeholder={`Describe a change to ${activeFile.split("/").pop() ?? "this file"}…`}
        disabled={!projectId || applying}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35 disabled:opacity-50"
      />
      <button
        onClick={handleApply}
        disabled={!projectId || applying || !instruction.trim()}
        className="focus-ring shrink-0 rounded-full bg-signal px-4 py-1.5 text-xs font-medium text-paper hover:bg-signal2 disabled:opacity-40"
      >
        {applying ? "Applying…" : "Apply"}
      </button>
    </div>
  );
}
