"use client";

import { useEffect, useRef } from "react";
import { clsx } from "clsx";

/** Generalizes the dialog mechanics TemplatePreviewModal built one-off
 * (role="dialog", aria-modal, escape-to-close, backdrop-click-to-close) —
 * the Phase 4 audit found this was the only accessible modal pattern in
 * the app and nothing shared it. Adds two things that pattern didn't have:
 * a body scroll lock while open, and moving focus into the dialog on
 * mount (previously focus stayed wherever it was on the page behind the
 * modal). Callers own their own header/body/footer content — this only
 * owns the overlay + panel + the accessibility-critical open/close
 * mechanics, since the one real caller's header (a loading skeleton, tags
 * row, page-switcher tabs) doesn't fit a generic title/footer slot API. */
export function Modal({
  onClose,
  children,
  ariaLabel,
  className,
}: {
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="reveal-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={clsx("glass-panel flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl focus:outline-none", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
