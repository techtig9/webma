import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { listVisiblePosts } from "@/lib/blog";

export const metadata = { title: "Blog" };

export default function BlogIndexPage() {
  const posts = listVisiblePosts();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/">
        <Logo />
      </Link>

      <h1 className="mt-8 font-display text-3xl font-bold">Blog</h1>
      <p className="mt-1 text-sm text-ink/50">Notes on building webma, and getting more out of it.</p>

      {posts.length === 0 ? (
        <p className="mt-10 text-sm text-ink/50">No posts published yet — check back soon.</p>
      ) : (
        <div className="mt-10 space-y-8">
          {posts.map(({ slug, meta }) => (
            <Link key={slug} href={`/blog/${slug}`} className="lift-on-hover glass-panel block rounded-xl p-5">
              <p className="font-mono text-xs text-ink/40">
                {new Date(meta.date).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-ink">{meta.title}</h2>
              <p className="mt-1 text-sm text-ink/60">{meta.description}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
