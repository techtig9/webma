import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, response: NextResponse.json({ message: "Not authenticated." }, { status: 401 }) };
  }
  return { user, response: null };
}

export async function requireAdmin() {
  const { user, response } = await requireUser();
  if (response) return { user: null, response };

  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("users").select("role").eq("id", user!.id).single();

  if (data?.role !== "admin") {
    return { user: null, response: NextResponse.json({ message: "Admin access required." }, { status: 403 }) };
  }
  return { user: user!, response: null };
}
