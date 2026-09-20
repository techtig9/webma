"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

/** The marketing navbar's link list and "Sign in" button were both
 * `hidden md:flex` / `hidden sm:inline-flex` with no mobile replacement — a
 * visitor on a phone had no way to reach Product/Templates/Resources or log
 * in at all from the header (only "Get started" stayed visible below those
 * breakpoints). This is that missing replacement, following the same
 * hamburger-toggle pattern the dashboard's own MobileNav already uses. */
export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="focus-ring rounded-lg p-2 text-white/60 hover:bg-white/[0.06] hover:text-white"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-white/[0.07] bg-[#070a12] px-5 py-4">
          <ul className="space-y-1 text-sm text-white/70">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-2.5 hover:bg-white/[0.06] hover:text-white"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-2 py-2.5 hover:bg-white/[0.06] hover:text-white"
              >
                Sign in
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
