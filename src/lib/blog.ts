// Blog posts (src/content/blog/*.mdx) each export their own `meta` object
// directly — no gray-matter/frontmatter parsing dependency needed for a
// hand-maintained list of three known files. Slugs are the map keys below,
// not derived from filenames, so renaming a file doesn't silently change a
// post's public URL.
import { meta as welcomeToWebma } from "@/content/blog/welcome-to-webma.mdx";
import { meta as howAiGenerationWorks } from "@/content/blog/how-ai-generation-works.mdx";
import { meta as betterPromptsBetterSites } from "@/content/blog/better-prompts-better-sites.mdx";

export interface PostMeta {
  title: string;
  description: string;
  date: string;
  draft: boolean;
}

export const BLOG_POSTS: Record<string, PostMeta> = {
  "welcome-to-webma": welcomeToWebma,
  "how-ai-generation-works": howAiGenerationWorks,
  "better-prompts-better-sites": betterPromptsBetterSites,
};

/** A draft post 404s in production so it's never publicly reachable until
 * its author flips `draft: false` — but stays visible in development so
 * whoever's writing it can review the rendered result before publishing. */
export function isPubliclyVisible(meta: PostMeta): boolean {
  return !meta.draft || process.env.NODE_ENV !== "production";
}

export function listVisiblePosts(): Array<{ slug: string; meta: PostMeta }> {
  return Object.entries(BLOG_POSTS)
    .filter(([, meta]) => isPubliclyVisible(meta))
    .map(([slug, meta]) => ({ slug, meta }))
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date));
}
