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
});

/** Runs a zod schema against a parsed request body and returns either the typed data
 * or a ready-to-return 400 response body — callers just check `"error" in result`. */
export function validate<T extends z.ZodTypeAny>(schema: T, body: unknown):
  | { data: z.infer<T>; error?: undefined }
  | { data?: undefined; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid request." };
  }
  return { data: result.data };
}
