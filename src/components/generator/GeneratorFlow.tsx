"use client";

import { useRef, useState } from "react";
import { DescribeStep } from "@/components/generator/DescribeStep";
import { FollowUpStep, type FollowUpQuestion } from "@/components/generator/FollowUpStep";
import { LivePreview } from "@/components/generator/LivePreview";
import { PageTabs } from "@/components/generator/PageTabs";
import { CodeEditor } from "@/components/generator/CodeEditor";
import { ExportBar } from "@/components/generator/ExportBar";
import { AIEditBar } from "@/components/generator/AIEditBar";
import { ThemeChangeBar } from "@/components/generator/ThemeChangeBar";
import dynamic from "next/dynamic";
import { Settings2 } from "lucide-react";
import { deriveSections, resolvePages, type Page } from "@/lib/preview";

const ProjectSettingsPanel = dynamic(
  () => import("@/components/generator/ProjectSettingsPanel").then((m) => m.ProjectSettingsPanel),
  { ssr: false, loading: () => <div className="p-4 text-sm text-ink/40">Loading settings…</div> }
);
import { useToast } from "@/components/ui/Toast";

type Stage = "describe" | "questions" | "result";

interface InitialProject {
  projectId: string;
  name: string;
  description: string;
  files: Record<string, string>;
  sections: string[];
  pages: Page[];
}

export function GeneratorFlow({ initialProject }: { initialProject?: InitialProject | null }) {
  const toast = useToast();
  const [stage, setStage] = useState<Stage>(initialProject ? "result" : "describe");
  const [name, setName] = useState(initialProject?.name ?? "");
  const [description, setDescription] = useState(initialProject?.description ?? "");
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [files, setFiles] = useState<Record<string, string>>(initialProject?.files ?? {});
  const [sections, setSections] = useState<string[]>(initialProject?.sections ?? []);
  const [pages, setPages] = useState<Page[]>(initialProject?.pages ?? []);
  const [activeSlug, setActiveSlug] = useState<string>(
    resolvePages(initialProject?.files ?? {}, initialProject?.pages ?? null)[0]?.slug ?? "index"
  );
  const [projectId, setProjectId] = useState<string | null>(initialProject?.projectId ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [activeFile, setActiveFile] = useState<string>(Object.keys(initialProject?.files ?? {})[0] ?? "");
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleDescribeSubmit(n: string, d: string) {
    setName(n);
    setDescription(d);
    setLoadingQuestions(true);
    try {
      const res = await fetch("/api/ai/follow-up-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, description: d }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions ?? []);
        setStage("questions");
      } else {
        setNotice(data.message ?? "Something went wrong — try again.");
        toast.show("error", data.message ?? "Something went wrong — try again.");
      }
    } catch {
      toast.show("error", "Network error — check your connection and try again.");
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function runGeneration() {
    setGenerating(true);
    setNotice(null);
    try {
      const res = await fetch("/api/ai/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, answers, projectId }),
      });
      const data = await res.json();
      if (res.status === 402 || res.status === 403) {
        setNotice(data.message);
        toast.show("error", data.message);
        return;
      }
      if (!res.ok) {
        const message = data.message ?? "Generation failed — your credits were refunded. Try again.";
        setNotice(message);
        toast.show("error", message);
        return;
      }
      setFiles(data.files);
      setSections(data.sections);
      setPages(data.pages ?? []);
      setActiveSlug((data.pages ?? [])[0]?.slug ?? "index");
      setProjectId(data.projectId);
      setActiveFile(Object.keys(data.files)[0] ?? "");
      setStage("result");
      toast.show("success", "Your website is ready.");
    } catch {
      const message = "Network error — check your connection and try again. No credits were charged.";
      setNotice(message);
      toast.show("error", message);
    } finally {
      setGenerating(false);
    }
  }

  async function runUrlGeneration(n: string, url: string) {
    setName(n);
    setGenerating(true);
    setNotice(null);
    try {
      const res = await fetch("/api/ai/generate-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, url, answers: {} }),
      });
      const data = await res.json();
      if (res.status === 402 || res.status === 403) {
        setNotice(data.message);
        toast.show("error", data.message);
        return;
      }
      if (!res.ok) {
        const message = data.message ?? "Generation failed — your credits were refunded. Try again.";
        setNotice(message);
        toast.show("error", message);
        return;
      }
      setFiles(data.files);
      setSections(data.sections);
      setPages(data.pages ?? []);
      setActiveSlug((data.pages ?? [])[0]?.slug ?? "index");
      setProjectId(data.projectId);
      setActiveFile(Object.keys(data.files)[0] ?? "");
      setStage("result");
      toast.show("success", "Your website is ready.");
    } catch {
      const message = "Network error — check your connection and try again. No credits were charged.";
      setNotice(message);
      toast.show("error", message);
    } finally {
      setGenerating(false);
    }
  }

  function handleFileChange(path: string, value: string) {
    setFiles((prev) => {
      const updated = { ...prev, [path]: value };

      if (projectId) {
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        setSaveStatus("saving");
        saveTimeout.current = setTimeout(async () => {
          try {
            await fetch("/api/projects/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectId, files: updated }),
            });
            setSaveStatus("saved");
          } catch {
            setSaveStatus("idle");
            toast.show("error", "Couldn't save your edits — check your connection.");
          }
        }, 1200);
      }

      return updated;
    });
  }

  const resolvedPages = resolvePages(files, pages.length > 0 ? pages : null);
  const activePage = resolvedPages.find((p) => p.slug === activeSlug) ?? resolvedPages[0];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {notice && (
        <div className="toast-enter mb-4 rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
          {notice}
        </div>
      )}

      {stage === "describe" && (
        <div className="reveal-in flex flex-1 items-center">
          <DescribeStep onSubmit={handleDescribeSubmit} onSubmitUrl={runUrlGeneration} submitting={loadingQuestions || generating} />
        </div>
      )}

      {stage === "questions" && (
        <div className="reveal-in flex flex-1 items-center">
          <FollowUpStep
            questions={questions}
            answers={answers}
            onAnswer={(key, value) => setAnswers((a) => ({ ...a, [key]: value }))}
            onGenerate={runGeneration}
            onSkip={runGeneration}
            generating={generating}
          />
        </div>
      )}

      {stage === "result" && (
        <div className="reveal-in flex flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-ink/40">
              {saveStatus === "saving" && "Saving…"}
              {saveStatus === "saved" && "All changes saved"}
            </p>
            {projectId && (
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="focus-ring flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1 text-xs transition-colors hover:border-ink"
              >
                <Settings2 size={12} /> {showSettings ? "Hide settings" : "SEO & domains"}
              </button>
            )}
          </div>
          {showSettings && projectId && (
            <div className="reveal-in">
              <ProjectSettingsPanel
                projectId={projectId}
                onLockedAction={setNotice}
                onVersionRestored={(restoredFiles, restoredPages) => {
                  setFiles(restoredFiles);
                  setSections(deriveSections(restoredFiles));
                  setPages(restoredPages ?? []);
                  setActiveSlug((restoredPages ?? [])[0]?.slug ?? "index");
                }}
              />
            </div>
          )}
          <PageTabs
            projectId={projectId}
            pages={resolvedPages}
            activeSlug={activeSlug}
            onActiveSlugChange={setActiveSlug}
            onPagesChange={setPages}
            onFilesChange={setFiles}
          />
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2">
            <LivePreview files={files} sections={activePage?.sections ?? sections} />
            <CodeEditor files={files} onChange={handleFileChange} active={activeFile} onActiveChange={setActiveFile} />
          </div>
          {activeFile && (
            <AIEditBar
              projectId={projectId}
              activeFile={activeFile}
              onApplied={setFiles}
              onLockedAction={setNotice}
            />
          )}
          <ThemeChangeBar projectId={projectId} onApplied={setFiles} onLockedAction={setNotice} />
          <ExportBar projectId={projectId} onLockedAction={setNotice} />
        </div>
      )}
    </div>
  );
          }
