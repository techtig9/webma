"use client";

import { useRef, useState } from "react";
import { Mic, Square, ArrowRight, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function DescribeStep({
  onSubmit,
  onSubmitUrl,
  submitting,
}: {
  onSubmit: (name: string, description: string) => void;
  onSubmitUrl: (name: string, url: string) => void;
  submitting: boolean;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<"describe" | "url">("describe");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  async function startRecording() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Permission denied, no microphone, or an insecure (non-HTTPS) context.
      toast.show("error", "Couldn't access your microphone — check permissions and try again.");
      return;
    }

    const recorder = new MediaRecorder(stream);
    chunks.current = [];
    recorder.ondataavailable = (e) => chunks.current.push(e.data);
    recorder.onstop = async () => {
      setTranscribing(true);
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      const base64 = await blobToBase64(blob);
      try {
        const res = await fetch("/api/ai/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64, mimeType: "audio/webm" }),
        });
        const data = await res.json();
        if (res.ok && data.text) {
          setDescription((d) => (d ? `${d} ${data.text}` : data.text));
        } else if (!res.ok) {
          toast.show("error", data.message ?? "Couldn't transcribe that — try typing instead.");
        }
      } catch {
        toast.show("error", "Network error — transcription failed. Try typing instead.");
      } finally {
        setTranscribing(false);
      }
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    mediaRecorder.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-5 flex gap-1 rounded-full border border-ink/10 p-1 text-sm">
        <button
          onClick={() => setMode("describe")}
          className={`focus-ring flex-1 rounded-full py-1.5 ${mode === "describe" ? "bg-ink text-paper" : "text-ink/60"}`}
        >
          Describe it
        </button>
        <button
          onClick={() => setMode("url")}
          className={`focus-ring flex-1 rounded-full py-1.5 ${mode === "url" ? "bg-ink text-paper" : "text-ink/60"}`}
        >
          Clone from URL
        </button>
      </div>

      {mode === "url" ? (
        <div>
          <h2 className="font-display text-xl font-bold">Generate from a reference site</h2>
          <p className="mt-1 text-sm text-ink/50">Paste a URL — webma fetches it and generates a similarly-structured site with original copy.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Website name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bloom & Co."
                className="focus-ring w-full rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Reference URL</label>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com"
                className="focus-ring w-full rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
              />
            </div>
            <Button
              onClick={() => onSubmitUrl(name, sourceUrl)}
              disabled={!name || !sourceUrl || submitting}
              className="w-full"
            >
              {submitting ? "Fetching & generating…" : "Generate from URL"} <Link2 size={16} />
            </Button>
          </div>
        </div>
      ) : (
      <div>
      <h2 className="font-display text-xl font-bold">Describe your website</h2>
      <p className="mt-1 text-sm text-ink/50">Name it, then tell us what it's for — type or speak.</p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Website name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bloom & Co."
            className="focus-ring w-full rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs font-medium text-ink/60">Description</label>
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`focus-ring flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs ${
                recording ? "bg-red-500/10 text-red-400" : "bg-signal/10 text-signal"
              }`}
            >
              {recording ? <Square size={12} /> : <Mic size={12} />}
              {recording ? "Stop" : transcribing ? "Transcribing…" : "Speak"}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="A cozy neighborhood bakery, warm and rustic, that also takes online orders…"
            className="focus-ring w-full resize-none rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
          />
        </div>
        <Button
          onClick={() => onSubmit(name, description)}
          disabled={!name || !description || submitting}
          className="w-full"
        >
          {submitting ? "Thinking…" : "Continue"} <ArrowRight size={16} />
        </Button>
      </div>
      </div>
      )}
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
