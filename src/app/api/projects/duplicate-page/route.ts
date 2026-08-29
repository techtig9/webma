import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { resolvePages, type Page } from "@/lib/preview";
import type { Json } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate, duplicatePageSchema } from "@/lib/validation";

function uniqueSlug(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

function uniqueComponentName(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}${i}`)) i++;
  return `${base}${i}`;
}

/** Duplicates a page and only the component files it doesn't share with
 * any other page — mirrors delete-page's own "is this section still used
 * elsewhere" logic, just in reverse. A shared section (Navbar, Footer,
 * anything else reused across pages) keeps pointing at the exact same
 * file in the new page, since duplicating it would silently fork
 * something every other page still expects to be the single shared
 * source. A page-specific section gets a real, independent copy — editing
 * the duplicate's hero shouldn't edit the original page's hero too, which
 * is the entire point of "duplicate" as an action distinct from just
 * adding a new page that happens to look the same today. */
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(duplicatePageSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, slug } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: project } = await supabase
    .from("projects")
    .select("user_id, current_version")
    .eq("id", projectId)
    .single();
  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  const { data: version } = await supabase
    .from("project_versions")
    .select("files, pages")
    .eq("project_id", projectId)
    .eq("version", project.current_version)
    .single();
  if (!version) {
    return NextResponse.json({ message: "Nothing to duplicate yet." }, { status: 404 });
  }

  const files = version.files as Record<string, string>;
  const pages = resolvePages(files, version.pages as Page[] | null);
  const target = pages.find((p) => p.slug === slug);
  if (!target) {
    return NextResponse.json({ message: "That page doesn't exist." }, { status: 404 });
  }

  const existingSlugs = new Set(pages.map((p) => p.slug));
  const newSlug = uniqueSlug(`${target.slug}-copy`, existingSlugs);

  const otherPagesSections = new Set(pages.filter((p) => p.slug !== slug).flatMap((p) => p.sections));
  const allComponentNames = new Set(
    Object.keys(files).map((path) => path.replace(/^components\//, "").replace(/\.tsx?$/, ""))
  );

  const updatedFiles = { ...files };
  const newSections: string[] = [];

  for (const section of target.sections) {
    if (otherPagesSections.has(section)) {
      // Shared with another page — the new page references the same
      // component, no file duplicated.
      newSections.push(section);
      continue;
    }
    // Page-specific — give it its own independent file so editing one
    // copy never silently edits the other.
    const sourceKey = files[`components/${section}.tsx`] !== undefined ? `components/${section}.tsx` : `components/${section}.ts`;
    const sourceContent = files[sourceKey];
    if (sourceContent === undefined) {
      // Section listed on the page but no matching file exists — skip
      // rather than fail the whole duplicate over one already-broken
      // reference (the same defensive posture as resolvePages elsewhere).
      continue;
    }
    const newName = uniqueComponentName(section, allComponentNames);
    allComponentNames.add(newName);
    const extension = sourceKey.endsWith(".ts") ? "ts" : "tsx";
    updatedFiles[`components/${newName}.${extension}`] = sourceContent;
    newSections.push(newName);
  }

  const newPage: Page = {
    slug: newSlug,
    path: newSlug === "index" ? "/" : `/${newSlug}`,
    name: `${target.name} (Copy)`,
    sections: newSections,
    seoTitle: target.seoTitle,
    seoDescription: target.seoDescription,
    seoOgImageUrl: target.seoOgImageUrl,
  };

  const targetIndex = pages.findIndex((p) => p.slug === slug);
  const updatedPages = [...pages.slice(0, targetIndex + 1), newPage, ...pages.slice(targetIndex + 1)];

  const { error } = await supabase
    .from("project_versions")
    .update({ files: updatedFiles, pages: updatedPages as unknown as Json })
    .eq("project_id", projectId)
    .eq("version", project.current_version);
  if (error) return NextResponse.json({ message: "Couldn't duplicate that page." }, { status: 500 });

  await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);

  return NextResponse.json({ files: updatedFiles, pages: updatedPages, newSlug });
}
