"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Sparkles, UsersRound } from "lucide-react";

const LINKS = [
  { href: "/panel", label: "Panel", Icon: LayoutDashboard },
  { href: "/olustur", label: "Yeni plan", Icon: Sparkles },
  { href: "/ciktilar", label: "Planlarım", Icon: FileText },
  { href: "/profiller", label: "Profillerim", Icon: UsersRound },
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
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium ${
              active ? "bg-rose-50 text-rose-700" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <l.Icon className="size-4 opacity-70" aria-hidden />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
