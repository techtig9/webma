// Wraps the Google Gemini API (primary) with automatic fallback to OpenAI (secondary)
// and implements the "AI Cost Optimisation" section of the spec: intelligent model
// routing, prompt compression, and response caching.
//
// Provider fallback: if Gemini throws (outage, rate limit, transient error) and
// OPENAI_API_KEY is configured, the call automatically retries on OpenAI instead of
// failing the whole request. This is the single-provider dependency risk called out
// during launch planning — fixed here rather than left as a known gap. Fallback is
// optional: if OPENAI_API_KEY isn't set, behavior is unchanged (Gemini-only).

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { createServiceRoleClient } from "@/lib/supabase/server";
import crypto from "crypto";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Complex, multi-section reasoning gets the premium model. Everything else (theme
// tweaks, small edits, transcription, follow-up questions) routes to the cheaper one.
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
  | "change_theme"
  | "follow_up_questions"
  | "voice_transcription";

function geminiModelFor(task: GeminiTask) {
  const isComplex = (COMPLEX_TASKS as Set<string>).has(task);
  // These fallback defaults WILL go stale — Gemini/OpenAI both ship new model
  // generations every few months and retire old ones (this is exactly what
  // happened to the previous defaults here: gemini-1.5-pro/flash both 404 as of
  // mid-2026). Setting GEMINI_MODEL_PREMIUM/LITE explicitly in your environment
  // is the real fix; treat these strings as "last known good as of this build,"
  // not a permanent answer, and check Google's current model list before launch.
  const modelName = isComplex
    ? process.env.GEMINI_MODEL_PREMIUM ?? "gemini-3.1-pro"
    : process.env.GEMINI_MODEL_LITE ?? "gemini-3.5-flash-lite";
  return genAI.getGenerativeModel({ model: modelName });
}

function openaiModelFor(task: GeminiTask) {
  const isComplex = (COMPLEX_TASKS as Set<string>).has(task);
  // Same staleness caveat as geminiModelFor above — verify against OpenAI's
  // current model list before launch, don't trust these defaults long-term.
  return isComplex
    ? process.env.OPENAI_MODEL_PREMIUM ?? "gpt-5.6-terra"
    : process.env.OPENAI_MODEL_LITE ?? "gpt-5.6-luna";
}

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

/** Calls Gemini; on any failure, falls back to OpenAI if configured. Throws only if
 * both fail (or only Gemini is configured and it fails). */
async function callModel(
  task: GeminiTask,
  compressed: string,
  opts: { systemPrompt?: string; jsonOutput?: boolean }
): Promise<{ text: string; provider: "gemini" | "openai" }> {
  try {
    const model = geminiModelFor(task);
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: compressed }] }],
      systemInstruction: opts.systemPrompt,
      generationConfig: opts.jsonOutput ? { responseMimeType: "application/json" } : undefined,
    });
    return { text: result.response.text(), provider: "gemini" };
  } catch (geminiError) {
    if (!openai) throw geminiError;
    console.error(`Gemini failed for task "${task}", falling back to OpenAI`, geminiError);

    const completion = await openai.chat.completions.create({
      model: openaiModelFor(task),
      messages: [
        ...(opts.systemPrompt ? [{ role: "system" as const, content: opts.systemPrompt }] : []),
        { role: "user" as const, content: compressed },
      ],
      response_format: opts.jsonOutput ? { type: "json_object" } : undefined,
    });
    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("OpenAI fallback returned an empty response.");
    return { text, provider: "openai" };
  }
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

  if (provider === "openai") {
    console.warn(`Task "${task}" served by OpenAI fallback (Gemini was unavailable).`);
  }

  return { text, cacheHit: false };
}

// ---------------------------------------------------------------------------
// Domain-specific helpers built on top of generateWithCache
// ---------------------------------------------------------------------------

export const SITE_SYSTEM_PROMPT = `You are webma's website-generation engine. Given a plain-language
description of a business or project, and the user's answers to a short follow-up
questionnaire (website type, theme, color preference, style), output a complete,
responsive website as React + Tailwind CSS components. Always include Navbar, Hero,
About, Services, Features, and Footer, plus any additional sections implied by the
description. Respond ONLY with JSON in this exact shape, no prose, no markdown fences:
{ "files": { "components/Navbar.tsx": "...", "components/Hero.tsx": "...", ... },
  "sections": ["Navbar", "Hero", ...] }`;

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
  return { site: JSON.parse(text) as { files: Record<string, string>; sections: string[] }, cacheHit };
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
    // Strip tags/scripts/styles down to readable text — good enough for Gemini to
    // infer the site's purpose, tone, and structure without a full DOM parser.
    referenceContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000); // keep the prompt bounded regardless of source page size
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
  return { site: JSON.parse(text) as { files: Record<string, string>; sections: string[] }, cacheHit };
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

/** Multi-turn chat, unlike the single-shot generation calls above — no response
 * caching here since conversations are inherently unique per session. Routes
 * through the same Gemini-primary/OpenAI-fallback path via callModel. */
export async function chatWithAssistant(messages: ChatMessage[]): Promise<string> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const history = messages
    .slice(0, -1)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = history ? `${history}\n\nUser: ${lastUserMessage}` : lastUserMessage;
  const { text } = await callModel("follow_up_questions", compressPrompt(prompt), {
    systemPrompt: ASSISTANT_SYSTEM_PROMPT,
  });
  return text;
}

export async function generateFollowUpQuestions(name: string, description: string) {
  const prompt = `Website name: ${name}\nDescription: ${description}\nReturn 4 short follow-up
questions (websiteType, theme, colorPreference, style) each with 3-5 selectable option
strings, as JSON: { "questions": [{ "key": "websiteType", "label": "...", "options": ["..."] }] }`;
  const { text, cacheHit } = await generateWithCache("follow_up_questions", prompt, { jsonOutput: true });
  return { questions: JSON.parse(text).questions as Array<{ key: string; label: string; options: string[] }>, cacheHit };
}

/** Incremental regeneration: only the touched section is re-sent to Gemini, per the spec's
 * "regenerate only modified content" cost-safeguard — the rest of the file map is reused as-is. */
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

const THEME_CHANGE_SYSTEM_PROMPT = `You restyle an already-generated website's visual theme (colors, spacing, tone
of the Tailwind classes) based on an instruction, WITHOUT changing its content, copy, or structure.
You will be given a JSON map of existing files and an instruction. Return ONLY JSON in the exact
same shape as the input: { "files": { "<same file paths>": "<updated source>" } }. Keep every
component, every string of copy, and the overall layout identical — only touch className strings
and any inline color/style values.`;

/** Restyles the whole site's visual theme in one pass — distinct from editSection,
 * which only ever touches a single file. Content/structure stay untouched by design. */
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
  try {
    const model = geminiModelFor("voice_transcription");
    const result = await model.generateContent([
      { inlineData: { data: audioBase64, mimeType } },
      { text: "Transcribe this spoken website description to plain text. Return only the transcript." },
    ]);
    return result.response.text();
  } catch (geminiError) {
    if (!openai) throw geminiError;
    console.error("Gemini transcription failed, falling back to OpenAI Whisper", geminiError);

    const extension = mimeType.split("/")[1] ?? "webm";
    const buffer = Buffer.from(audioBase64, "base64");
    const file = new File([buffer], `audio.${extension}`, { type: mimeType });
    const transcription = await openai.audio.transcriptions.create({ file, model: "whisper-1" });
    return transcription.text;
  }
}
