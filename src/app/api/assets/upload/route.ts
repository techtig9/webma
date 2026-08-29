import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { nanoid } from "nanoid";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB — matches the bucket's own file_size_limit,
// kept safely under Vercel's ~4.5MB serverless request body cap.
// SVG deliberately excluded: it's servable as a document (not just an
// <img> source) and can embed <script>/event-handler content, making an
// SVG upload a real stored-XSS vector against whatever origin serves the
// storage bucket — content-type here is trusted from the client (`file.type`),
// not sniffed from the actual bytes, so nothing else in this route would
// catch a mislabeled or malicious SVG either. Re-enable only alongside real
// server-side SVG sanitization (stripping scripts/event handlers), not before.
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = await checkRateLimit(`${user!.id}:asset-upload`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many uploads — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ message: "No file received." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ message: "Only PNG, JPEG, WEBP, or GIF images are allowed." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ message: "That file is too large — 4MB max." }, { status: 400 });
  }
  const altTextRaw = formData?.get("altText");
  const altText = (typeof altTextRaw === "string" ? altTextRaw : "").trim().slice(0, 250);

  const supabase = createServiceRoleClient();

  const extension = file.name.split(".").pop() ?? "png";
  const storagePath = `${user!.id}/${nanoid()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from("assets").upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ message: "Upload failed — try again." }, { status: 500 });
  }

  const { data: inserted, error: dbError } = await supabase
    .from("assets")
    .insert({
      user_id: user!.id,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      alt_text: altText,
    })
    .select("id, storage_path, file_name, mime_type, size_bytes, alt_text, created_at")
    .single();

  if (dbError || !inserted) {
    // Don't leave an orphaned file in storage with no matching database row.
    await supabase.storage.from("assets").remove([storagePath]);
    return NextResponse.json({ message: "Upload failed — try again." }, { status: 500 });
  }

  const { data: publicUrl } = supabase.storage.from("assets").getPublicUrl(storagePath);

  return NextResponse.json({ asset: { ...inserted, url: publicUrl.publicUrl } });
}
