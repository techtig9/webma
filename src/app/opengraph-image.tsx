import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Webma — Create a website with AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated in code rather than a static asset — matches the brand mark's
// exact gradient (LogoMark's webmaGradient, #FFB020 -> #FF5A1F) and the
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
            "radial-gradient(circle at 22% 20%, rgba(255,176,32,0.20), transparent 55%), radial-gradient(circle at 82% 85%, rgba(255,90,31,0.18), transparent 55%)",
        }}
      >
        <svg width={96} height={96} viewBox="0 0 40 40" fill="none">
          <path d="M6 10L13 30L20 16L27 30L34 10" stroke="url(#g)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <defs>
            <linearGradient id="g" x1="4" y1="8" x2="36" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFB020" />
              <stop offset="1" stopColor="#FF5A1F" />
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
