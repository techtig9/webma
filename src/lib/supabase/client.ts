// Browser-side Supabase client (client components only).
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { SupabaseConfigError } from "./config-error";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new SupabaseConfigError(
      "Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return createBrowserClient<Database>(url, anonKey);
}
