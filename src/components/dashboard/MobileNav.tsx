"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";

/** The dashboard sidebar is `hidden md:flex` — deliberately absent below the
 * md breakpoint, since a fixed 248px rail has no reasonable place to sit on
 * a phone-width screen. But nothing replaced it: there was no hamburger, no
 * drawer, nothing. A mobile user landing on any dashboard page had no way to
 * reach Projects, Templates, Assets, Billing, Team, or Settings at all
 * unless they already had the exact URL. This is that missing replacement —
 * visible only below md (`md:hidden`), so it never overlaps with the real
 * desktop sidebar. */
export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);

  // Closing on route change is handled by Sidebar's onNavigate prop below
  // (fires on every link click, including the logo and the "Open assistant"
  // card) — this additionally locks page scroll while the drawer is open,
  // since it's a full-height overlay and background scroll would fight with
  // scrolling the drawer's own nav list.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="focus-ring rounded-xl p-2 text-white/60 hover:bg-white/[0.05] hover:text-white"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative flex h-full w-[280px] max-w-[85vw] flex-col">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="focus-ring absolute right-3 top-5 z-10 rounded-lg p-1.5 text-white/50 hover:bg-white/[0.08] hover:text-white"
            >
              <X size={18} />
            </button>
            <Sidebar isAdmin={isAdmin} variant="drawer" onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
