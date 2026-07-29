import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

const links = [
  { href: "#features", label: "Features" },
  { href: "#templates", label: "Templates" },
  { href: "#pricing", label: "Pricing" },
  { href: "#help", label: "Help" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  return (
    <header className="glass-panel sticky top-0 z-50 !border-x-0 !border-t-0 !rounded-none">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-8 text-sm text-ink/70 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="link-grow hover:text-ink transition-colors">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <Button href="/login" variant="ghost" className="hidden sm:inline-flex px-4">
            Login
          </Button>
          <Button href="/signup" variant="primary" className="px-5 py-2.5">
            Get Started
          </Button>
        </div>
      </nav>
    </header>
  );
}
