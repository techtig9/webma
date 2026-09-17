import { z } from "zod";

// Shared request-body schemas for the AI routes. Centralized here so the credit-cost
// gate and the AI call always operate on data that's already been shape-checked —
// per the Security standard: "Input validation" on every route, not just type assertions.

export const generateWebsiteSchema = z.object({
  name: z.string().trim().min(1, "Website name is required.").max(120),
  description: z.string().trim().min(10, "Description must be at least 10 characters.").max(2000),
  answers: z.record(z.string()).optional().default({}),
  projectId: z.string().uuid().nullable().optional(),
});

export const followUpQuestionsSchema = z.object({
  name: z.string().trim().min(1, "Website name is required.").max(120),
  description: z.string().trim().min(10, "Description must be at least 10 characters.").max(2000),
});

export const transcribeSchema = z.object({
  audio: z.string().min(1, "No audio received."),
  mimeType: z.string().default("audio/webm"),
});

export const exportZipSchema = z.object({
  projectId: z.string().uuid(),
  format: z.enum(["zip", "react", "nextjs"]),
});

export const deploySchema = z.object({
  projectId: z.string().uuid(),
});

export const saveProjectSchema = z.object({
  projectId: z.string().uuid(),
  files: z.record(z.string()),
  // Optional: lets autosave persist in-flight page/section-order edits (e.g. from
  // the drag-to-reorder panel) alongside file content, instead of silently
  // dropping them — dedicated endpoints like reorder-sections already persist
  // their own change immediately, this is a safety net for the general Save path.
  pages: z.array(z.record(z.unknown())).optional(),
});
export const archiveProjectSchema = z.object({
  projectId: z.string().uuid(),
  archived: z.boolean(),
});
export const generateNewPageSchema = z.object({
  projectId: z.string().uuid(),
  pageName: z.string().trim().min(1, "Page name is required.").max(60),
  pageDescription: z.string().trim().min(5, "Describe what should be on this page.").max(500),
});

export const renamePageSchema = z.object({
  projectId: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().trim().min(1, "Page name is required.").max(60),
});

export const deletePageSchema = z.object({
  projectId: z.string().uuid(),
  slug: z.string().min(1),
});

export const duplicatePageSchema = z.object({
  projectId: z.string().uuid(),
  slug: z.string().min(1),
});

export const reorderPagesSchema = z.object({
  projectId: z.string().uuid(),
  orderedSlugs: z.array(z.string()).min(1),
});
export const reorderSectionsSchema = z.object({
  projectId: z.string().uuid(),
  slug: z.string().min(1),
  orderedSections: z.array(z.string()).min(1),
});
export const updatePageSeoSchema = z.object({
  projectId: z.string().uuid(),
  slug: z.string().min(1),
  seoTitle: z.string().trim().max(60, "Titles over 60 characters get truncated in search results.").optional(),
  seoDescription: z
    .string()
    .trim()
    .max(160, "Descriptions over 160 characters get truncated in search results.")
    .optional(),
  seoOgImageUrl: z.string().trim().url().optional().or(z.literal("")),
});
export const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "other"]),
  message: z.string().trim().min(10, "Give a few more details (at least 10 characters).").max(2000),
});
export const renameProjectSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1, "Website name is required.").max(120),
});

export const duplicateProjectSchema = z.object({
  projectId: z.string().uuid(),
});

export const deleteProjectSchema = z.object({
  projectId: z.string().uuid(),
});

export const deleteAssetSchema = z.object({
  assetId: z.string().uuid(),
});

export const updateAssetAltTextSchema = z.object({
  assetId: z.string().uuid(),
  altText: z.string().trim().max(250, "Alt text is limited to 250 characters.").default(""),
});

// A public site visitor's browser submits this — no auth, so keep it minimal
// and let the route itself compute anything privacy-sensitive (the visitor
// hash), never trust the client to supply one.
export const trackPageViewSchema = z.object({
  projectId: z.string().uuid(),
  path: z.string().min(1).max(300).default("/"),
  referrer: z.string().max(500).optional(),
});

// A public site visitor's browser submits this — no auth, so validate the
// shape strictly and keep it small. `data` is capped in both key count and
// total size in the route itself (zod alone can't bound total JSON size).
export const formSubmitSchema = z.object({
  projectId: z.string().uuid(),
  pageSlug: z.string().min(1).max(120).default("index"),
  formName: z.string().min(1).max(80).default("contact"),
  data: z.record(z.string().max(4000)).refine((d) => Object.keys(d).length <= 30, {
    message: "A form submission can have at most 30 fields.",
  }),
  // Honeypot field: generated forms include a visually-hidden input real
  // users never fill in. Any value here means a bot filled every field
  // blindly — the route accepts the request (so the bot doesn't learn to
  // avoid it) but silently discards it instead of storing or counting it.
  website: z.string().optional(),
});

// PLAN_IDS is redeclared here (rather than imported from credits.ts) purely
// to keep this file's zod schemas free of a dependency on credits.ts, which
// itself doesn't export the id list as a standalone array — the enum values
// below are kept in sync with PlanId in credits.ts by hand, the same way
// ACTION_COSTS and PLAN_CREDITS there are each other's single source of
// truth for their own concern.
export const overrideSubscriptionSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["set_plan", "extend", "cancel"]),
  plan: z.enum(["free", "starter", "pro", "business"]).optional(),
  extendDays: z.number().int().positive().max(3650).optional(),
});

// A template's "structure" is the same {files, pages} shape a real
// project_versions row already uses (see /api/templates/use) — files is a
// map of component-file path to source, pages an array describing each
// page's slug/path/sections. Kept loose (record<string,string> / unknown[])
// here rather than fully re-validating the Page shape, matching how
// /api/templates/use itself only checks that `files` is present before
// trusting the rest — the admin authoring this is trusted content, not
// arbitrary user input.
const templateStructureSchema = z.object({
  files: z.record(z.string()),
  pages: z.array(z.unknown()).optional(),
});

export const adminCreateTemplateSchema = z.object({
  category: z.string().trim().min(1, "Category is required.").max(60),
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: z.string().trim().max(2000).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
  style: z.string().trim().max(40).optional().nullable(),
  industry: z.string().trim().max(60).optional().nullable(),
  tierRequired: z.enum(["free", "starter", "pro", "business"]).optional().default("free"),
  thumbnail: z.string().trim().max(2_000_000).optional().nullable(),
  isFeatured: z.boolean().optional().default(false),
  structure: templateStructureSchema,
});

export const adminUpdateTemplateSchema = z.object({
  templateId: z.string().uuid(),
  category: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  style: z.string().trim().max(40).nullable().optional(),
  industry: z.string().trim().max(60).nullable().optional(),
  tierRequired: z.enum(["free", "starter", "pro", "business"]).optional(),
  thumbnail: z.string().trim().max(2_000_000).nullable().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  structure: templateStructureSchema.optional(),
});

export const adminDeleteTemplateSchema = z.object({ templateId: z.string().uuid() });

/** Runs a zod schema against a parsed request body and returns either the typed data
 * or a ready-to-return 400 response body — callers check `parsed.success`. */
export function validate<T extends z.ZodTypeAny>(schema: T, body: unknown):
  | { success: true; data: z.infer<T> }
  | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid request." };
  }
  return { success: true, data: result.data };
}
