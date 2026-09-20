// Service-role Supabase client, isolated in its own module (no `next/headers`
// import) so it's safe to use from Edge Middleware as well as Route Handlers.
// Never import this from client components or expose the key to the browser.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SupabaseConfigError } from "./config-error";

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new SupabaseConfigError(
      "Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createSupabaseClient<Database>(url, serviceRoleKey, { auth: { persistSession: false } });
}
