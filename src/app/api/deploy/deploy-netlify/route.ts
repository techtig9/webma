import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

// Netlify deploy is intentionally disabled for now. Unlike Vercel (which runs a
// real `next build` server-side on the source files you send it), Netlify's
// simple deploy API just uploads whatever files you give it as static assets —
// there's no build step. Shipping raw, uncompiled .tsx source with no bundler
// and no Tailwind compilation would only ever produce a broken, unstyled page.
// Re-enable this once a real build step (bundling + Tailwind) runs before upload.
export async function POST() {
  const { response } = await requireUser();
  if (response) return response;

  return NextResponse.json(
    { message: "Netlify deploy isn't ready yet — use Vercel deploy or one of the code exports for now." },
    { status: 501 }
  );
}
