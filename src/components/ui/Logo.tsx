export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="webmaGradient" x1="4" y1="8" x2="36" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      {/* bold "W" glyph */}
      <path
        d="M6 10L13 30L20 16L27 30L34 10"
        stroke="url(#webmaGradient)"
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
