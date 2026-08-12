// Multi-provider AI routing, replacing the old Gemini-primary/OpenAI-fallback setup.
//
// Simple/lite tasks (small edits, theme changes, follow-up questions, voice
// transcription) go through a free chain: Groq first, falling back automatically
// to Cerebras, then OpenRouter, if a provider hits its rate limit or errors for
// any other reason. All three speak the same OpenAI-compatible API shape, so one
// client class (just pointed at a different baseURL) talks to all of them.
//
// Complex/bigger tasks (full website generation, clone-from-url, regenerate) go
// to Claude Sonnet 5 instead — a stronger model for the hardest job this app does.
// If Claude itself fails, it falls back to the same free chain as a last resort,
// rather than showing the user a hard failure.
//
// Every model name below is a "last known good as of this build" default, not a
// permanent answer — free-tier model catalogs (especially Cerebras and
// OpenRouter's free lineup) change often. Setting GROQ_MODEL / CEREBRAS_MODEL /
// OPENROUTER_MODEL / CLAUDE_MODEL in your environment overrides these without any
// code change or redeploy debugging — just update the value and redeploy.

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Page } from "@/lib/preview";
import crypto from "crypto";

const groq = process.env.GROQ_API_KEY
  ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" })
  : null;
const cerebras = process.env.CEREBRAS_API_KEY
  ? new OpenAI({ apiKey: process.env.CEREBRAS_API_KEY, baseURL: "https://api.cerebras.ai/v1" })
  : null;
const openrouter = process.env.OPENROUTER_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" })
  : null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

// Complex, multi-section reasoning gets Claude. Everything else (theme tweaks,
// small edits, transcription, follow-up questions) routes to the free chain.
const COMPLEX_TASKS = new Set([
  "generate_full_website",
  "generate_from_url",
  "regenerate_complete",
] as const);

export type GeminiTask =
  | "generate_full_website"
  | "generate_from_url"
  | "regenerate_complete"
  | "ai_edit"
  | "generate_new_page"
  | "change_theme"
  | "follow_up_questions"
  | "voice_transcription";

/** Strips repeated whitespace/instructions and trims dead weight before it ever hits the API. */
export function compressPrompt(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/(please|kindly)\s+/gi, "")
    .trim();
}

function cacheKey(task: GeminiTask, prompt: string) {
  return crypto.createHash("sha256").update(`${task}:${prompt}`).digest("hex");
}

/** Tries Groq, then Cerebras, then OpenRouter — moving to the next the instant one
 * hits a rate limit or fails for any other reason. Throws only if every configured
 * provider in the chain fails (or none are configured at all). */
async function callFreeChain(
  compressed: string,
  opts: { systemPrompt?: string; jsonOutput?: boolean }
): Promise<{ text: string; provider: "groq" | "cerebras" | "openrouter" }> {
  const chain: Array<{ name: "groq" | "cerebras" | "openrouter"; client: OpenAI | null; model: string }> = [
    { name: "groq", client: groq, model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile" },
    { name: "cerebras", client: cerebras, model: process.env.CEREBRAS_MODEL ?? "gpt-oss-120b" },
    // openrouter/free is OpenRouter's own auto-router — it always resolves to
    // whatever free model is currently live, so this link never goes stale even
    // as OpenRouter's actual free-model lineup changes underneath it.
    { name: "openrouter", client: openrouter, model: process.env.OPENROUTER_MODEL ?? "openrouter/free" },
  ];

  let lastError: unknown = null;

  for (const provider of chain) {
    if (!provider.client) continue;
    try {
      const completion = await provider.client.chat.completions.create({
        model: provider.model,
        messages: [
          ...(opts.systemPrompt ? [{ role: "system" as const, content: opts.systemPrompt }] : []),
          { role: "user" as const, content: compressed },
        ],
        response_format: opts.jsonOutput ? { type: "json_object" } : undefined,
      });
      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error(`${provider.name} returned an empty response.`);
      return { text, provider: provider.name };
    } catch (err) {
      console.error(`${provider.name} failed, trying next provider in the free chain`, err);
      lastError = err;
    }
  }

  throw lastError ?? new Error("No free-tier AI provider is configured (GROQ_API_KEY / CEREBRAS_API_KEY / OPENROUTER_API_KEY).");
}

/** Complex tasks go to Claude Sonnet 5. Falls back to the free chain as a last
 * resort if Claude itself fails, so a Claude-side outage doesn't hard-fail the
 * request when a (lower-quality but working) alternative is available. */
async function callClaude(
  compressed: string,
  opts: { systemPrompt?: string; jsonOutput?: boolean }
): Promise<{ text: string; provider: "claude" | "groq" | "cerebras" | "openrouter" }> {
  if (anthropic) {
    try {
      const message = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL ?? "claude-sonnet-5",
        max_tokens: Number(process.env.CLAUDE_MAX_TOKENS ?? 8192),
        system: opts.systemPrompt,
        messages: [{ role: "user", content: compressed }],
      });
      const block = message.content[0];
      const text = block && block.type === "text" ? block.text : "";
      if (!text) throw new Error("Claude returned an empty response.");
      return { text, provider: "claude" };
    } catch (err) {
      console.error("Claude failed, falling back to the free chain", err);
    }
  }

  return callFreeChain(compressed, opts);
}

async function callModel(
  task: GeminiTask,
  compressed: string,
  opts: { systemPrompt?: string; jsonOutput?: boolean }
): Promise<{ text: string; provider: string }> {
  const isComplex = (COMPLEX_TASKS as Set<string>).has(task);
  return isComplex ? callClaude(compressed, opts) : callFreeChain(compressed, opts);
}

/**
 * Calls the model (with automatic provider fallback) and caches the result: identical
 * (task, prompt) pairs reuse the last output instead of spending a fresh API call —
 * this is what lets "regenerate" and repeated theme/edit requests stay cheap under
 * the credit-cost table.
 */
export async function generateWithCache(
  task: GeminiTask,
  prompt: string,
  opts: { systemPrompt?: string; jsonOutput?: boolean } = {}
): Promise<{ text: string; cacheHit: boolean }> {
  const compressed = compressPrompt(prompt);
  const key = cacheKey(task, compressed);
  const supabase = createServiceRoleClient();

  const { data: cached } = await supabase
    .from("ai_response_cache")
    .select("response")
    .eq("cache_key", key)
    .maybeSingle();

  if (cached?.response) {
    return { text: cached.response as string, cacheHit: true };
  }

  const { text, provider } = await callModel(task, compressed, opts);

  await supabase.from("ai_response_cache").upsert({
    cache_key: key,
    task,
    response: text,
    created_at: new Date().toISOString(),
  });

  if (provider !== "claude") {
    console.warn(`Task "${task}" served by ${provider} (free chain).`);
  }

  return { text, cacheHit: false };
}

// ---------------------------------------------------------------------------
// Domain-specific helpers built on top of generateWithCache
// ---------------------------------------------------------------------------

export const SITE_SYSTEM_PROMPT = `You are webma's website-generation engine. Given a plain-language
description of a business or project, and the user's answers to a short follow-up
questionnaire (website type, theme, color preference, style), output a complete,
responsive, MULTI-PAGE website as React + Tailwind CSS components.

Always include a Home page. Add 1-4 additional pages that genuinely make sense for
this type of site (e.g. About, Services, Pricing, Contact) — use your judgment based
on the description; don't force pages that don't fit. Navbar and Footer should be
shared, reused components (written once, referenced by every page), not duplicated
per page. Write Navbar's navigation links as plain <a href="..."> tags pointing at
each page's exact "path" value below, so the site actually navigates correctly.

Respond ONLY with JSON in this exact shape, no prose, no markdown fences:
{
  "files": { "components/Navbar.tsx": "...", "components/Hero.tsx": "...", ... },
  "pages": [
    { "slug": "index", "path": "/", "name": "Home", "sections": ["Navbar", "Hero", "About", "Footer"] },
    { "slug": "contact", "path": "/contact", "name": "Contact", "sections": ["Navbar", "ContactForm", "Footer"] }
  ]
}
Use "index" as the slug for the home page, and a short lowercase-hyphenated slug for
every other page (this becomes its URL folder name). Every name listed in any page's
"sections" must exactly match a key in "files" (minus the "components/" prefix and
file extension).`;

export interface FollowUpAnswers {
  websiteType?: string;
  theme?: string;
  colorPreference?: string;
  style?: string;
}

export async function generateFullWebsite(description: string, answers: FollowUpAnswers) {
  const prompt = `Website description: ${description}\nFollow-up answers: ${JSON.stringify(answers)}`;
  const { text, cacheHit } = await generateWithCache("generate_full_website", prompt, {
    systemPrompt: SITE_SYSTEM_PROMPT,
    jsonOutput: true,
  });
  return { site: JSON.parse(text) as { files: Record<string, string>; pages?: Page[] }, cacheHit };
}

/** Fetches a reference site and generates a similarly-structured site inspired by
 * its content — not a pixel clone (that would need visual/DOM analysis this text-only
 * pipeline doesn't do), but a real fetch-and-generate, not a stub. */
export async function generateFromUrl(url: string, answers: FollowUpAnswers) {
  let referenceContent: string;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    const html = await res.text();
    referenceContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);
  } catch (err) {
    throw new Error(`Couldn't fetch that URL to use as a reference: ${(err as Error).message}`);
  }

  const prompt = `Reference site content (from ${url}):\n${referenceContent}\n\nFollow-up answers: ${JSON.stringify(answers)}\n
Generate a NEW website inspired by this reference's apparent purpose, tone, and structure — reuse its
sense of what the business/project is about, but write original copy, do not copy sentences verbatim.`;

  const { text, cacheHit } = await generateWithCache("generate_from_url", prompt, {
    systemPrompt: SITE_SYSTEM_PROMPT,
    jsonOutput: true,
  });
  return { site: JSON.parse(text) as { files: Record<string, string>; pages?: Page[] }, cacheHit };
}

const ASSISTANT_SYSTEM_PROMPT = `You are webma's website-building assistant. You help visitors and customers make
decisions — what kind of site they need, which template category fits their business, how to describe
their site so generation goes well, which plan fits their usage, and how to use webma's features
(AI editing, restyle, custom domains, exporting, deploying). You do NOT generate websites yourself in
this chat — if someone's ready to build, point them to the AI Generator. Keep answers short (2-4
sentences unless they ask for more), concrete, and specific to webma rather than generic advice. If
you don't know something about their specific account (their credits, their plan, their projects),
say so plainly rather than guessing.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithAssistant(messages: ChatMessage[]): Promise<string> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const history = messages
    .slice(0, -1)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = history ? `${history}\n\nUser: ${lastUserMessage}` : lastUserMessage;
  const { text } = await callFreeChain(compressPrompt(prompt), { systemPrompt: ASSISTANT_SYSTEM_PROMPT });
  return text;
}

export async function generateFollowUpQuestions(name: string, description: string) {
  const prompt = `Website name: ${name}\nDescription: ${description}\nReturn 4 short follow-up
questions (websiteType, theme, colorPreference, style) each with 3-5 selectable option
strings, as JSON: { "questions": [{ "key": "websiteType", "label": "...", "options": ["..."] }] }`;
  const { text, cacheHit } = await generateWithCache("follow_up_questions", prompt, { jsonOutput: true });
  return { questions: JSON.parse(text).questions as Array<{ key: string; label: string; options: string[] }>, cacheHit };
}

export async function editSection(
  existingFiles: Record<string, string>,
  targetFile: string,
  instruction: string
) {
  const prompt = `Existing file (${targetFile}):\n${existingFiles[targetFile]}\n\nInstruction: ${instruction}\n
Return ONLY the full replacement source for this one file, no markdown fences, no explanation.`;
  const { text, cacheHit } = await generateWithCache("ai_edit", prompt);
  return { updatedFile: text, cacheHit };
}

const NEW_PAGE_SYSTEM_PROMPT = `You are adding ONE new page to an already-generated website. You'll be given
the site's existing shared components (Navbar, Footer, etc. — these already exist, do NOT regenerate
them) and a description of the new page to create. Write only the NEW component file(s) this page's
unique content actually needs, matching the existing site's visual style (same Tailwind approach,
same overall look). Reuse Navbar and Footer by name in the page's section list — every page keeps
the same navigation and footer.

Respond ONLY with JSON in this exact shape, no prose, no markdown fences:
{
  "files": { "components/NewSectionName.tsx": "..." },
  "page": { "slug": "careers", "path": "/careers", "name": "Careers", "sections": ["Navbar", "NewSectionName", "Footer"] }
}
"slug" is a short lowercase-hyphenated identifier (becomes the URL folder name) that must not
collide with any existing page's slug. Every name in "sections" must either be one of the existing
shared component names given to you, or a key in your own "files" (minus the "components/" prefix
and file extension).`;

/** Generates one new page for an existing project — new component(s) plus the page
 * entry — without touching anything else already on the site. This is a "lite"
 * task (free chain), not COMPLEX_TASKS: it's one page, not a whole new site. */
export async function generateNewPage(
  existingFiles: Record<string, string>,
  existingPages: Page[],
  pageName: string,
  pageDescription: string
) {
  const sharedComponentNames = Array.from(new Set(existingPages.flatMap((p) => p.sections)));
  const existingSlugs = existingPages.map((p) => p.slug);
  const prompt = `Existing shared components available to reuse: ${sharedComponentNames.join(", ")}
Existing page slugs already in use (the new page's slug must NOT match any of these): ${existingSlugs.join(", ")}
New page name: ${pageName}
New page description: ${pageDescription}`;

  const { text, cacheHit } = await generateWithCache("generate_new_page", prompt, {
    systemPrompt: NEW_PAGE_SYSTEM_PROMPT,
    jsonOutput: true,
  });
  return { result: JSON.parse(text) as { files: Record<string, string>; page: Page }, cacheHit };
}

const THEME_CHANGE_SYSTEM_PROMPT = `You restyle an already-generated website's visual theme (colors, spacing, tone

export async function changeTheme(existingFiles: Record<string, string>, instruction: string) {
  const prompt = `Existing files: ${JSON.stringify(existingFiles)}\n\nRestyle instruction: ${instruction}`;
  const { text, cacheHit } = await generateWithCache("change_theme", prompt, {
    systemPrompt: THEME_CHANGE_SYSTEM_PROMPT,
    jsonOutput: true,
  });
  const parsed = JSON.parse(text) as { files: Record<string, string> };
  return { files: parsed.files, cacheHit };
}

export async function transcribeVoicePrompt(audioBase64: string, mimeType: string) {
  if (!groq) {
    throw new Error("Voice transcription needs GROQ_API_KEY configured.");
  }
  const extension = mimeType.split("/")[1] ?? "webm";
  const buffer = Buffer.from(audioBase64, "base64");
  const file = new File([buffer], `audio.${extension}`, { type: mimeType });
  const transcription = await groq.audio.transcriptions.create({
    file,
    model: process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3",
  });
  return transcription.text;
  }
