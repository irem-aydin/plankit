import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/config/app";
import { getCurrentSession } from "@/services/session";
import { LogOut, Settings } from "lucide-react";
import { AppNav } from "./app-nav";
import { FeedbackBox } from "./feedback-box";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/giris");

  const { entitlement, user, preferences } = session;
  const displayName = preferences.displayName || user.email;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/panel" aria-label={`${APP_NAME} — Panel`}>
              <Logo />
            </Link>
            <AppNav />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/abonelik"
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                entitlement.unlimited
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : entitlement.canGenerate
                    ? "bg-rose-50 text-rose-700 ring-rose-200"
                    : "bg-amber-50 text-amber-800 ring-amber-200"
              }`}
            >
              {entitlement.unlimited
                ? "Pro"
                : entitlement.canGenerate
                  ? `Deneme: ${entitlement.remainingTrial} hak`
                  : "Abone ol"}
            </Link>
            <Link
              href="/ayarlar"
              title={displayName ?? undefined}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-100"
            >
              <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold uppercase text-slate-700">
                {(displayName ?? "?").slice(0, 1)}
              </span>
              <span className="hidden sm:inline">Ayarlar</span>
              <Settings className="size-4 text-slate-400 sm:hidden" aria-hidden />
            </Link>
            <form action="/auth/cikis" method="post">
              <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-100">
                <LogOut className="size-4" aria-hidden />
                <span className="hidden sm:inline">Çıkış</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 print:max-w-none print:p-0">{children}</main>

      <footer className="border-t border-slate-200 print:hidden">
        {/* Alt boşluk: sağ alttaki sabit "Öneri / Şikâyet" düğmesi bağlantıların üstüne binmesin */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-20 text-xs text-slate-500">
          <span>
            Yapay zekâ çıktıları karar desteği içindir; mevzuat ve tutar içeren konularda uzmandan teyit alın.
          </span>
          <Link href="/yasal" className="font-medium hover:underline">
            Yasal bilgiler
          </Link>
        </div>
      </footer>

      <FeedbackBox />
    </div>
  );
}
