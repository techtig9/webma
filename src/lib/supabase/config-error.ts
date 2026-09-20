/** Thrown by the Supabase client factories when required env vars are
 * missing, instead of letting @supabase/ssr's generic error surface (or a
 * TypeScript `!` assertion silently pass `undefined` through). Callers that
 * need to show a "not configured" state rather than a raw crash — e.g.
 * middleware.ts for /dashboard and /admin — catch this specifically. */
export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}
