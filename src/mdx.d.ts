// Extends @types/mdx's "*.mdx" module declaration (default export only)
// with the named `meta` export every post in src/content/blog/ has —
// declaration merging combines this with the package's own declaration for
// the same module pattern, it doesn't replace it.
declare module "*.mdx" {
  import type { PostMeta } from "@/lib/blog";

  export const meta: PostMeta;
}
