"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/panel", label: "Panel" },
  { href: "/olustur", label: "Yeni plan" },
  { href: "/ciktilar", label: "Planlarım" },
  { href: "/profiller", label: "Profillerim" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Ana menü" className="flex flex-wrap gap-1 text-sm">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 font-medium ${
              active ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
