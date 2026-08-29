import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Webma — Create a website with AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated in code rather than a static asset — matches the brand mark's
// exact gradient (LogoMark's webmaGradient, #5B6CFF -> #00D4B8) and the
// dark ground the rest of the marketing site uses (#070a12, layout.tsx's
// body background), so this never drifts out of sync with the real UI the
// way a hand-exported PNG would the next time either changes.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#070a12",
          backgroundImage:
            "radial-gradient(circle at 22% 20%, rgba(91,108,255,0.24), transparent 55%), radial-gradient(circle at 82% 85%, rgba(0,212,184,0.20), transparent 55%)",
        }}
      >
        <svg width={96} height={96} viewBox="0 0 40 40" fill="none">
          <path d="M4 15V8a4 4 0 0 1 4-4h7" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M36 25v7a4 4 0 0 1-4 4h-7" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M20 11.5L22.6 17.4L28.5 20L22.6 22.6L20 28.5L17.4 22.6L11.5 20L17.4 17.4Z" fill="url(#g)" />
          <defs>
            <linearGradient id="g" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#5B6CFF" />
              <stop offset="1" stopColor="#00D4B8" />
            </linearGradient>
          </defs>
        </svg>
        <div
          style={{
            marginTop: 28,
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#ffffff",
            display: "flex",
          }}
        >
          webma
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 30,
            color: "rgba(255,255,255,0.55)",
            display: "flex",
          }}
        >
          Describe your website. Webma builds it.
        </div>
      </div>
    ),
    { ...size }
  );
}
