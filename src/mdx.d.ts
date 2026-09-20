// Extends @types/mdx's "*.mdx" module declaration (default export only)
// with the named `meta` export every .mdx file in this repo has (blog
// posts AND help articles, each with their own differently-shaped meta —
// see src/lib/blog.ts and src/lib/help.ts) — declaration merging combines
// this with the package's own declaration for the same module pattern, it
// doesn't replace it. Typed as `any` rather than either concrete shape
// since this declaration applies to every .mdx file in the repo; each
// import site's own Record<string, ConcreteMetaType> assignment is what
// actually catches a real shape mismatch for that site.
declare module "*.mdx" {
  export const meta: any;
}
