import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    // Sentry's ingest endpoint is a two-level subdomain
    // (o<org-id>.ingest.sentry.io) — a single-level "*.sentry.io" wildcard
    // doesn't match that per the CSP spec, so both are listed explicitly
    // rather than assuming one covers the other.
    const connectSrc =
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.groq.com https://api.cerebras.ai https://openrouter.ai https://api.openai.com https://*.sentry.io https://*.ingest.sentry.io";
    // Shared by every route. This app's own pages never need to be framed
    // by anyone else, so X-Frame-Options/CSP frame-ancestors both deny
    // outright rather than allowlist. Google Fonts is NOT used (fonts are
    // self-hosted via @fontsource, per layout.tsx's own comment), so no
    // fonts.googleapis.com entry. img-src stays broad under https: because
    // AI-generated sites can embed an <img src> pointing at any external
    // domain the model chose — there's no fixed allowlist that wouldn't
    // break real generated content. Cross-Origin-Embedder-Policy is
    // deliberately NOT set: it would require every cross-origin resource
    // this app loads (Supabase-hosted images, the generator's CDN scripts)
    // to send back matching CORP/CORS headers, which aren't under this
    // app's control — enabling it blind risks silently breaking image
    // loading and the live preview instead of just tightening a header.
    const commonHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    ];

    return [
      {
        // Every route EXCEPT /dashboard/generator (matched separately
        // below) — the generated-site preview iframe itself isn't affected
        // by any of this either way (LivePreview.tsx sets `iframe.srcdoc`,
        // and buildPreviewHtml's output is never served by this app, so no
        // response headers of ours ever apply to it). Everything outside
        // the generator — the marketing site, auth pages, dashboard,
        // admin — never loads a third-party script or needs 'unsafe-eval',
        // so it gets the strict policy: no external script hosts, no eval.
        source: "/((?!dashboard/generator).*)",
        headers: [
          ...commonHeaders,
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              connectSrc,
              "frame-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      {
        // LivePreview.tsx renders the generated site by setting
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
        // in the product. Scoped to just this route (previously applied
        // site-wide) so the marketing site, auth pages, and dashboard no
        // longer carry a broader script allowlist and 'unsafe-eval' than
        // they ever actually use — a real security scan correctly flagged
        // that as an overly broad policy. 'unsafe-eval' specifically only
        // weakens the policy's protection on this one route, where
        // arbitrary AI-generated code already runs by design, inside the
        // sandbox="allow-scripts" iframe with no allow-same-origin, so it
        // can't reach this app's cookies/storage even with eval.
        source: "/dashboard/generator/:path*",
        headers: [
          ...commonHeaders,
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.tailwindcss.com https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              connectSrc,
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
