import type { MDXComponents } from "mdx/types";

// Required by @next/mdx for the App Router — every .mdx page renders through
// these component overrides. Maps MDX's plain HTML elements onto this app's
// existing type scale/spacing (the same classes LegalPage's prose content
// already uses) rather than letting them fall back to unstyled browser
// defaults.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => <h1 className="mt-8 font-display text-3xl font-bold" {...props} />,
    h2: (props) => <h2 className="mt-8 font-display text-xl font-bold text-ink" {...props} />,
    h3: (props) => <h3 className="mt-6 font-display text-lg font-bold text-ink" {...props} />,
    p: (props) => <p className="mt-4 text-sm leading-relaxed text-ink/75" {...props} />,
    ul: (props) => <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink/75" {...props} />,
    ol: (props) => <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-ink/75" {...props} />,
    a: (props) => <a className="text-signal underline underline-offset-2 hover:text-signal2" {...props} />,
    code: (props) => <code className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-xs" {...props} />,
    blockquote: (props) => (
      <blockquote className="mt-4 border-l-2 border-signal/40 pl-4 text-sm italic text-ink/60" {...props} />
    ),
    ...components,
  };
}
