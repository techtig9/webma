import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        // Applies to every route EXCEPT the generated-site preview iframe
        // source (buildPreviewHtml in lib/preview.ts) — that HTML is never
        // served by this app itself, it's injected client-side via srcDoc,
        // so it isn't affected by these headers at all. This app's own pages
        // never need to be framed by anyone else, so X-Frame-Options/CSP
        // frame-ancestors both deny outright rather than allowlist.
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          // IMPORTANT: LivePreview.tsx renders the generated site by setting
          // `iframe.srcdoc` (buildPreviewHtml() in lib/preview.ts) rather
          // than pointing the iframe at a URL — and per the CSP spec,
          // `about:srcdoc` documents have no URL of their own to fetch a
          // policy from, so they INHERIT the embedding page's CSP. That
          // preview loads React/ReactDOM/Babel Standalone from cdnjs, the
          // Tailwind JIT compiler from cdn.tailwindcss.com, and lucide-react
          // from unpkg — and Babel Standalone transpiles + executes the
          // generated JSX via an eval-like mechanism at runtime. A
          // script-src that omitted any of these three hosts, or omitted
          // 'unsafe-eval', would silently break the editor's live preview
          // for every generated site — the single most load-bearing feature
          // in the product. 'unsafe-eval' specifically only weakens the
          // policy's protection on /dashboard/generator (where arbitrary
          // AI-generated code already runs by design, inside the
          // sandbox="allow-scripts" iframe with no allow-same-origin, so it
          // can't reach this app's cookies/storage even with eval); every
          // other route still gets the full benefit of a real CSP.
          // Google Fonts is NOT used (fonts are self-hosted via
          // @fontsource, per layout.tsx's own comment), so no
          // fonts.googleapis.com entry. img-src stays broad under https:
          // because AI-generated sites can embed an <img src> pointing at
          // any external domain the model chose — there's no fixed
          // allowlist that wouldn't break real generated content.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.tailwindcss.com https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // Sentry's ingest endpoint is a two-level subdomain
              // (o<org-id>.ingest.sentry.io) — a single-level "*.sentry.io"
              // wildcard doesn't match that per the CSP spec, so both are
              // listed explicitly rather than assuming one covers the other.
              "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.groq.com https://api.cerebras.ai https://openrouter.ai https://api.openai.com https://*.sentry.io https://*.ingest.sentry.io",
              "frame-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  // disableLogger and the top-level automaticVercelMonitors were both
  // deprecated in this exact SDK version — confirmed against the installed
  // @sentry/nextjs@10.69.0's own type definitions before making this change,
  // not guessed from the warning text alone. Both moved under webpack per
  // the SDK's own migration guidance.
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});
