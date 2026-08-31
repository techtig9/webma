import { useId } from "react";

export function LogoMark({ size = 28 }: { size?: number }) {
  // Every rendered instance previously shared the literal id "webmaGradient"
  // — invalid duplicate-id HTML the moment Logo appears twice on one page
  // (navbar + footer, at minimum), which browsers can resolve inconsistently
  // when several <linearGradient> elements share an id. useId() gives each
  // instance its own unique, stable id instead.
  const gradientId = `webma-gradient-${useId()}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="4" y1="8" x2="36" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFB020" />
          <stop offset="1" stopColor="#FF5A1F" />
        </linearGradient>
      </defs>
      {/* bold "W" glyph */}
      <path
        d="M6 10L13 30L20 16L27 30L34 10"
        stroke={`url(#${gradientId})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({
  size = 22,
  showWordmark = true,
  className = "",
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="font-display font-bold tracking-tight">
          webma
        </span>
      )}
    </span>
  );
}
