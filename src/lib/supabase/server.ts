// Server-side Supabase client for use in Server Components, Route Handlers, and Server Actions.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // sameSite pinned explicitly rather than left to @supabase/ssr's
            // own default (which does happen to be "lax" today) — this is
            // the actual CSRF-relevant setting for this app's session
            // cookie (cross-site POSTs from a malicious page won't carry
            // it), so it shouldn't depend on an upstream library default
            // that could silently change.
            cookieStore.set({ name, value, sameSite: "lax", ...options });
          } catch {
            // Called from a Server Component; safe to ignore when middleware refreshes sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above.
          }
        },
      },
    }
  );
}

// Re-exported for convenience so existing imports from "@/lib/supabase/server"
// keep working; the actual implementation lives in ./service (see that file
// for why it's split out — Edge Middleware compatibility).
export { createServiceRoleClient } from "./service";
