import Link from "next/link";
import { Logo } from "./logo";
import { APP_NAME } from "@/config/app";

/** Herkese açık sayfaların (ana sayfa hariç) ortak üst çubuğu. */
export function PublicHeader({ cta }: { cta?: { href: string; label: string } }) {
  const action = cta ?? { href: "/kayit", label: "Ücretsiz başla" };
  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/85 backdrop-blur print:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3.5">
        <Link href="/" aria-label={APP_NAME}>
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/fiyatlar" className="hidden rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:inline">
            Fiyatlar
          </Link>
          <Link href="/ornekler" className="hidden rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 sm:inline">
            Örnekler
          </Link>
          <Link href="/giris" className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
            Giriş yap
          </Link>
          <Link href={action.href} className="rounded-lg bg-rose-600 px-3.5 py-2 font-semibold text-white shadow-sm hover:bg-rose-500">
            {action.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-100 print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500">
        <span className="flex items-center gap-3">
          <Logo className="text-base" />
          <span>© {new Date().getFullYear()}</span>
        </span>
        <span className="flex flex-wrap items-center gap-4">
          <Link href="/ornekler" className="font-medium text-slate-600 hover:underline">
            Örnek planlar
          </Link>
          <Link href="/fiyatlar" className="font-medium text-slate-600 hover:underline">
            Fiyatlar
          </Link>
          <Link href="/yasal" className="font-medium text-slate-600 hover:underline">
            Yasal bilgiler
          </Link>
        </span>
        <p className="w-full text-xs">Yapay zekâ önerileri karar desteği içindir; önemli kararlardan önce uzman görüşü alın.</p>
      </div>
    </footer>
  );
}
