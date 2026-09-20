import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { SupabaseConfigError } from "@/lib/supabase/config-error";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
const ADMIN_PREFIX = "/admin";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  try {
    const { response, user } = await updateSession(request);

    const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
    if (!isProtected) return response;

    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirectedFrom", path);
      return NextResponse.redirect(redirectUrl);
    }

    if (path.startsWith(ADMIN_PREFIX)) {
      const supabase = createServiceRoleClient();
      const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
      if (data?.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    return response;
  } catch (err) {
    // A missing Supabase config previously crashed with a raw framework
    // error page here. Anything else is a real bug and should still be
    // visible as one, so only this specific, well-known cause is caught.
    if (err instanceof SupabaseConfigError) {
      return new NextResponse(
        "<!doctype html><meta charset='utf-8'><title>Not configured</title>" +
          "<p style='font:15px system-ui;padding:2rem;max-width:32rem'>" +
          "This app isn't configured yet — Supabase environment variables are missing. " +
          "See .env.example for what's required.</p>",
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    throw err;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
