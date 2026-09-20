"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Link2, Mic, Plus, Sparkles, Square, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { buildEnrichedDescription } from "@/lib/structured-form";
import { TemplateCard } from "@/components/dashboard/TemplateCard";
import type { FollowUpAnswers } from "@/lib/gemini";
import type { TemplateSummary } from "@/lib/templates";

const EXAMPLES = [
  "Modern digital agency called Nova with a dark, premium look",
  "Restaurant website with menu, reservations and location",
  "Personal portfolio for a product designer with case studies",
];

// Matches the real `templates.category` values in production (verified via
// the live table) exactly, so picking a category here also becomes a real
// filter against the template gallery in the Theme step — not a cosmetic
// label that happens to look similar.
const CATEGORIES = [
  "Agency", "Architecture", "Beauty", "Blog", "Business", "Community", "Construction",
  "Consulting", "Creative", "Ecommerce", "Education", "Events", "Fashion", "Finance",
  "Fitness", "Freelancer", "Healthcare", "Hotel", "Landing Page", "Legal", "News",
  "Personal", "Photography", "Portfolio", "Real Estate", "Restaurant", "SaaS",
  "Startup", "Technology", "Travel",
];

const STYLES = ["Modern", "Minimal", "Bold", "Playful", "Elegant", "Classic"];
const COLOR_PREFERENCES = ["Blue", "Purple", "Green", "Black & white", "Warm", "Custom"];

// "Home" is always included and isn't offered as a toggle — every generated
// site needs a home page, so there's nothing genuine to ask about it here.
const STANDARD_PAGES = [
  "About", "Services", "Products", "Portfolio", "Pricing", "Blog",
  "Contact", "FAQ", "Testimonials", "Team", "Gallery",
];
const DEFAULT_PAGES = ["About", "Contact"];

const STEPS = ["Category", "Describe", "Pages", "Theme"] as const;
type WizardStep = 0 | 1 | 2 | 3;

function Dropdown({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const id = `dd-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <label htmlFor={id} className="block text-[10px] font-medium text-white/40">
      {label}
      <div className="relative mt-1.5">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="saas-input appearance-none pr-8 text-xs">
          <option value="">Any</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
      </div>
    </label>
  );
}

export function DescribeStep({
  onSubmit,
  onSubmitUrl,
  onUseTemplate,
  submitting,
}: {
  onSubmit: (name: string, description: string, answers: FollowUpAnswers) => void;
  onSubmitUrl: (name: string, url: string) => void;
  onUseTemplate: (templateId: string) => void;
  submitting: boolean;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<"describe" | "url">("describe");
  const [step, setStep] = useState<WizardStep>(0);

  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [targetAudience, setTargetAudience] = useState("");
  const [primaryCta, setPrimaryCta] = useState("");

  const [selectedPages, setSelectedPages] = useState<string[]>(DEFAULT_PAGES);
  const [customPageInput, setCustomPageInput] = useState("");
  const [customPages, setCustomPages] = useState<string[]>([]);

  const [style, setStyle] = useState("");
  const [colorPreference, setColorPreference] = useState("");
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const allPages = useMemo(() => ["Home", ...selectedPages, ...customPages], [selectedPages, customPages]);

  // Fetches real template rows filtered by the category chosen in step 1 —
  // the same /api/templates/list route and TemplateSummary shape the
  // dashboard gallery uses, so a template picked here is a real row, not a
  // mock. Category-only filtering (no style param) sidesteps any casing
  // mismatch between this wizard's display styles and the DB's own style
  // taxonomy; the user still sees and judges each template's actual style.
  useEffect(() => {
    if (step !== 3 || !category) return;
    let cancelled = false;
    setTemplatesLoading(true);
    fetch(`/api/templates/list?category=${encodeURIComponent(category)}&sort=featured`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setTemplates(((data.templates ?? []) as TemplateSummary[]).slice(0, 8));
      })
      .catch(() => { if (!cancelled) setTemplates([]); })
      .finally(() => { if (!cancelled) setTemplatesLoading(false); });
    return () => { cancelled = true; };
  }, [step, category]);

  async function startRecording() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
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
        if (res.ok && data.text) setDescription((d) => (d ? `${d} ${data.text}` : data.text));
        else if (!res.ok) toast.show("error", data.message ?? "Couldn't transcribe that — try typing instead.");
      } catch {
        toast.show("error", "Network error — transcription failed.");
      } finally {
        setTranscribing(false);
        stream.getTracks().forEach((t) => t.stop());
      }
    };
    recorder.start();
    mediaRecorder.current = recorder;
    setRecording(true);
  }
  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
  }

  function togglePage(page: string) {
    setSelectedPages((prev) => (prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]));
  }
  function addCustomPage() {
    const value = customPageInput.trim();
    if (!value || customPages.includes(value) || allPages.includes(value)) { setCustomPageInput(""); return; }
    setCustomPages((prev) => [...prev, value]);
    setCustomPageInput("");
  }
  function removeCustomPage(page: string) {
    setCustomPages((prev) => prev.filter((p) => p !== page));
  }

  function selectTemplate(id: string) {
    setSelectedTemplateId((prev) => (prev === id ? null : id));
  }
  async function toggleFavorite(id: string) {
    try {
      const res = await fetch("/api/templates/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: id }),
      });
      const data = await res.json();
      if (res.ok) setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isFavorited: data.favorited } : t)));
    } catch { /* non-critical — silently leave favorite state unchanged */ }
  }

  function handleFinalSubmit() {
    if (selectedTemplateId) { onUseTemplate(selectedTemplateId); return; }
    const enriched = buildEnrichedDescription({ description, pages: allPages, targetAudience, primaryCta });
    onSubmit(name, enriched, { websiteType: category, style, colorPreference });
  }

  function goNext() { setStep((s) => (Math.min(s + 1, 3) as WizardStep)); }
  function goBack() { setStep((s) => (Math.max(s - 1, 0) as WizardStep)); }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-signal/10 text-signal">
          <Sparkles size={21} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">What do you want to build?</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/40">
          Describe your website in detail and Webma&apos;s AI will take care of the rest.
        </p>
      </div>

      <div className="saas-card overflow-hidden">
        <div className="flex border-b border-white/[0.07] p-1.5">
          <button onClick={() => setMode("describe")} className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold ${mode === "describe" ? "bg-white/[0.07] text-white" : "text-white/35"}`}>Describe with AI</button>
          <button onClick={() => setMode("url")} className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold ${mode === "url" ? "bg-white/[0.07] text-white" : "text-white/35"}`}>Generate from URL</button>
        </div>

        {mode === "url" ? (
          <div className="p-6 lg:p-8">
            <h2 className="font-display text-lg font-semibold">Use a reference website</h2>
            <p className="mt-1 text-xs text-white/35">Webma uses the reference for structure and inspiration and generates original content.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-xs text-white/45">Website name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bloom & Co." className="saas-input mt-2" /></label>
              <label className="text-xs text-white/45">Reference URL<input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://example.com" className="saas-input mt-2" /></label>
            </div>
            <Button onClick={() => onSubmitUrl(name, sourceUrl)} disabled={!name || !sourceUrl || submitting} className="mt-6 w-full">{submitting ? "Fetching & generating…" : "Generate from URL"}<Link2 size={16} /></Button>
          </div>
        ) : (
          <div className="p-6 lg:p-8">
            {/* Step indicator */}
            <div className="mb-6 flex items-center gap-2">
              {STEPS.map((label, i) => (
                <div key={label} className="flex flex-1 items-center gap-2">
                  <div className={`flex items-center gap-2 text-xs font-semibold ${i === step ? "text-signal" : i < step ? "text-white/60" : "text-white/25"}`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${i === step ? "bg-signal text-[#1a0e06]" : i < step ? "bg-white/10" : "border border-white/15"}`}>
                      {i < step ? <Check size={11} /> : i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < step ? "bg-white/25" : "bg-white/[0.07]"}`} />}
                </div>
              ))}
            </div>

            {step === 0 && (
              <div>
                <h2 className="font-display text-lg font-semibold">What kind of website is this?</h2>
                <p className="mt-1 text-xs text-white/35">This helps Webma tailor content and match you with relevant templates.</p>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      aria-pressed={category === c}
                      className={`focus-ring rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                        category === c ? "border-signal/50 bg-signal/10 text-signal" : "border-white/[0.07] bg-white/[0.02] text-white/60 hover:border-white/20"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={goNext} disabled={!category}>Next<ArrowRight size={16} /></Button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <label className="text-xs font-medium text-white/45">Website name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nova Agency" className="saas-input mt-2" /></label>
                <label className="mt-5 block text-xs font-medium text-white/45">
                  Describe your website
                  <div className="relative mt-2">
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Create a modern website for a digital marketing agency called Nova. Include a strong hero, services, case studies, testimonials and contact section…" className="saas-input resize-none pr-12 leading-6" />
                    <button type="button" onClick={recording ? stopRecording : startRecording} className={`absolute bottom-3 right-3 rounded-lg p-2 ${recording ? "bg-red-500/10 text-red-400" : "bg-signal/10 text-signal"}`} title="Use voice" aria-label={recording ? "Stop voice input" : "Start voice input"}>{recording ? <Square size={14} /> : <Mic size={14} />}</button>
                  </div>
                </label>
                <div className="mt-3 flex items-center justify-between text-[10px] text-white/25">
                  <span>{transcribing ? "Transcribing your voice…" : "Tip: include audience, tone and your main goal."}</span>
                  <span>{description.length}/2000</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="focus-ring mt-4 flex items-center gap-1 text-[11px] font-medium text-white/40 hover:text-white/70"
                >
                  <ChevronDown size={12} className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                  Advanced options
                </button>
                {showAdvanced && (
                  <div className="mt-3 grid gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 sm:grid-cols-2">
                    <label className="text-[10px] font-medium text-white/40">Target audience<input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g. small business owners" className="saas-input mt-1.5 text-xs" /></label>
                    <label className="text-[10px] font-medium text-white/40">Primary call to action<input value={primaryCta} onChange={(e) => setPrimaryCta(e.target.value)} placeholder="e.g. Book a call" className="saas-input mt-1.5 text-xs" /></label>
                  </div>
                )}

                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/25">Try an example</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {EXAMPLES.map((x) => <button key={x} onClick={() => setDescription(x)} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-left text-xs leading-5 text-white/45 hover:border-signal/30 hover:text-white/70">{x}</button>)}
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <Button variant="secondary" onClick={goBack}><ArrowLeft size={16} />Back</Button>
                  <Button onClick={goNext} disabled={!name || !description}>Next<ArrowRight size={16} /></Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="font-display text-lg font-semibold">Which pages do you need?</h2>
                <p className="mt-1 text-xs text-white/35">Home is always included. Add or remove any others, or add your own.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-signal/40 bg-signal/10 px-3 py-1.5 text-xs font-medium text-signal">Home</span>
                  {STANDARD_PAGES.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePage(p)}
                      aria-pressed={selectedPages.includes(p)}
                      className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        selectedPages.includes(p) ? "border-signal/40 bg-signal/10 text-signal" : "border-white/[0.07] text-white/45 hover:border-white/20"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="mt-5">
                  <label htmlFor="custom-page" className="text-[10px] font-medium text-white/40">Add a custom page</label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      id="custom-page"
                      value={customPageInput}
                      onChange={(e) => setCustomPageInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomPage(); } }}
                      placeholder="e.g. Careers"
                      className="saas-input text-xs"
                    />
                    <Button type="button" variant="secondary" onClick={addCustomPage} disabled={!customPageInput.trim()} aria-label="Add page"><Plus size={14} /></Button>
                  </div>
                  {customPages.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {customPages.map((p) => (
                        <span key={p} className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-white/60">
                          {p}
                          <button onClick={() => removeCustomPage(p)} aria-label={`Remove ${p}`} className="text-white/30 hover:text-white/70"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-between">
                  <Button variant="secondary" onClick={goBack}><ArrowLeft size={16} />Back</Button>
                  <Button onClick={goNext}>Next<ArrowRight size={16} /></Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="font-display text-lg font-semibold">Choose your style</h2>
                <p className="mt-1 text-xs text-white/35">Pick a starting template to use as-is, or set a style and let AI design something original.</p>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Dropdown label="Style" value={style} options={STYLES} onChange={setStyle} />
                  <Dropdown label="Color preference" value={colorPreference} options={COLOR_PREFERENCES} onChange={setColorPreference} />
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/25">Templates for {category}</p>
                    {selectedTemplateId && (
                      <button onClick={() => setSelectedTemplateId(null)} className="text-[10px] font-medium text-signal hover:underline">Design my own instead</button>
                    )}
                  </div>
                  {templatesLoading ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-white/[0.04]" />)}
                    </div>
                  ) : templates.length === 0 ? (
                    <p className="mt-3 text-xs text-white/30">No templates in this category yet — Webma will design an original layout instead.</p>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {templates.map((t) => (
                        <div key={t.id} className={`rounded-xl ring-2 transition-shadow ${selectedTemplateId === t.id ? "ring-signal" : "ring-transparent"}`}>
                          <TemplateCard
                            id={t.id}
                            name={t.name}
                            description={t.style ?? undefined}
                            tierRequired={t.tierRequired}
                            thumbnail={t.thumbnail}
                            locked={false}
                            isFavorited={t.isFavorited}
                            onOpenPreview={selectTemplate}
                            onToggleFavorite={toggleFavorite}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-between">
                  <Button variant="secondary" onClick={goBack}><ArrowLeft size={16} />Back</Button>
                  <Button onClick={handleFinalSubmit} disabled={submitting}>
                    {submitting ? "Generating…" : selectedTemplateId ? "Use this template" : "Generate Website"}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
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
