// What application code (not just the admin page) consults to decide
// whether an incomplete or risky feature should render — "incomplete
// features stay hidden behind flags" per fix-all.md. Fails safe: any error
// (unreachable database, missing table on a fresh project) returns false
// rather than throwing, so a flag check never crashes the page checking it.
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function isFeatureEnabled(key: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase.from("feature_flags").select("enabled").eq("key", key).maybeSingle();
    return data?.enabled ?? false;
  } catch {
    return false;
  }
}
