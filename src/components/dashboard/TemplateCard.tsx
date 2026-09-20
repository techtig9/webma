"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, Lock, Heart } from "lucide-react";

export function TemplateCard({
  id,
  name,
  description,
  tierRequired,
  thumbnail,
  locked,
  isFavorited,
  onOpenPreview,
  onToggleFavorite,
}: {
  id: string;
  name: string;
  description?: string;
  tierRequired: string;
  thumbnail: string | null;
  locked: boolean;
  isFavorited?: boolean;
  onOpenPreview: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      className={`glass-panel group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl text-left ${
        locked ? "opacity-70" : "cursor-pointer hover:!border-signal/40"
      }`}
      role="button"
      tabIndex={0}
      onClick={() => onOpenPreview(id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpenPreview(id)}
      aria-label={`Preview ${name}`}
    >
      {thumbnail && !imageFailed ? (
        // unoptimized, deliberately: next/image's remotePatterns allowlist
        // (next.config.mjs) only covers *.supabase.co today, and thumbnails
        // could plausibly be hosted elsewhere depending on how templates
        // get seeded — an unlisted host wouldn't just skip optimization,
        // it would throw and crash the whole page. unoptimized sidesteps
        // both the crash risk and the optimization pipeline, which a small,
        // pre-sized template preview image doesn't meaningfully need anyway.
        <Image
          src={thumbnail}
          alt={`${name} preview`}
          fill
          unoptimized
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-signal/10 to-amber/10">
          <ImageOff size={20} className="text-ink/20" />
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(id);
        }}
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={isFavorited}
        className="focus-ring absolute left-3 top-3 z-10 rounded-full bg-black/30 p-1.5 text-white/80 opacity-0 backdrop-blur-sm transition-opacity hover:text-white group-hover:opacity-100 aria-pressed:opacity-100"
      >
        <Heart size={13} fill={isFavorited ? "currentColor" : "none"} className={isFavorited ? "text-coral" : ""} />
      </button>

      <div className="relative z-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 pt-8">
        <p className="font-medium text-white">{name}</p>
        {description && <p className="mt-0.5 line-clamp-1 text-xs text-white/60">{description}</p>}
        <p className="mt-1 font-mono text-xs uppercase text-white/50">{tierRequired}</p>
      </div>

      {locked && (
        <span className="absolute right-3 top-3 z-10 text-white/70">
          <Lock size={14} />
        </span>
      )}
    </div>
  );
}
