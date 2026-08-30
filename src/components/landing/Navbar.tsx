import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

// Homepage-section anchors are prefixed with "/" (not bare "#section") since
// Navbar now also renders on /pricing — a bare hash silently does nothing
// when the target section isn't on the current page. "/#features" resolves
// correctly from anywhere, and is a same-document instant scroll (no reload)
// when already on "/". Pricing links straight to its own real route now
// that one exists.
const links = [
  { href: "/#features", label: "Product" },
  { href: "/#templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#help", label: "Resources" },
];

export function Navbar() {
  return <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#070a12]/80 backdrop-blur-xl">
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
      <Link href="/"><Logo size={23} className="text-white" /></Link>
      <ul className="hidden items-center gap-8 text-sm text-white/55 md:flex">{links.map(l => <li key={l.href}><a href={l.href} className="flex items-center gap-1 hover:text-white">{l.label}{l.label !== "Pricing" && <ChevronDown size={12} className="text-white/25"/>}</a></li>)}</ul>
      <div className="flex items-center gap-2"><Button href="/login" variant="ghost" className="hidden sm:inline-flex">Sign in</Button><Button href="/signup" className="px-4 py-2.5">Get started</Button></div>
    </nav>
  </header>;
}
