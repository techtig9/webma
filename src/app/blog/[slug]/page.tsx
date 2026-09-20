import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { BLOG_POSTS, isPubliclyVisible } from "@/lib/blog";

// Static import map, not fs-based discovery — there are only ever the three
// known posts in src/content/blog/, added by hand alongside their meta entry
// in src/lib/blog.ts. A slug not in this map (or in BLOG_POSTS) 404s below.
const POST_COMPONENTS = {
  "welcome-to-webma": () => import("@/content/blog/welcome-to-webma.mdx"),
  "how-ai-generation-works": () => import("@/content/blog/how-ai-generation-works.mdx"),
  "better-prompts-better-sites": () => import("@/content/blog/better-prompts-better-sites.mdx"),
} as const;

export function generateStaticParams() {
  return Object.keys(POST_COMPONENTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const meta = BLOG_POSTS[params.slug];
  // Matches the page body's own notFound() gate below — generateMetadata is
  // resolved independently of the page component, so a draft post's real
  // title/description would otherwise still leak into the rendered <head>
  // (and the RSC flight payload) even while the visible page 404s.
  if (!meta || !isPubliclyVisible(meta)) return {};
  return { title: meta.title, description: meta.description };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const meta = BLOG_POSTS[params.slug];
  const loadPost = POST_COMPONENTS[params.slug as keyof typeof POST_COMPONENTS];
  if (!meta || !loadPost || !isPubliclyVisible(meta)) {
    notFound();
  }

  const { default: Post } = await loadPost();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/blog">
        <Logo />
      </Link>

      <p className="mt-8 font-mono text-xs text-ink/40">
        {new Date(meta.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold">{meta.title}</h1>

      <article className="mt-4">
        <Post />
      </article>
    </main>
  );
}
