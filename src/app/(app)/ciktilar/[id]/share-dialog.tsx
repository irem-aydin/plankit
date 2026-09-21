"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sharePath } from "@/core/share/share";
import { setSharingAction } from "../actions";

/** Araç çubuğundaki "Paylaş" düğmesi ve paylaşım penceresi. */
export function ShareButton({
  outputId,
  initialToken,
  initialViews,
  dirty,
}: {
  outputId: string;
  initialToken: string | null;
  initialViews: number;
  /** Kaydedilmemiş değişiklik varsa uyarı gösterilir (paylaşılan sayfa kayıtlı hâli gösterir) */
  dirty: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(initialToken);
  const [views, setViews] = useState(initialViews);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Hangi işlemin sürdüğü: düğme etiketleri yalnızca ilgili işlemde değişsin.
  const [pendingAction, setPendingAction] = useState<"on" | "off" | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const url = token && typeof window !== "undefined" ? `${window.location.origin}${sharePath(token)}` : "";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  function toggle(enabled: boolean) {
    setError(null);
    setCopied(false);
    setPendingAction(enabled ? "on" : "off");
    startTransition(async () => {
      try {
        const result = await setSharingAction(outputId, enabled);
        if (result.ok) {
          setToken(result.token);
          setViews(result.views);
        } else setError(result.error);
      } catch {
        setError("Bağlantı hatası. Lütfen tekrar dene.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Kopyalanamadı; bağlantıyı elle seçip kopyalayabilirsin.");
    }
  }

  return (
    <div className="relative" ref={dialogRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`rounded-lg border px-3 py-2 text-sm font-medium ${
          token ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        🔗 {token ? "Paylaşılıyor" : "Paylaş"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Planı paylaş"
          className="absolute right-0 z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-2xl"
        >
          <p className="font-semibold text-slate-900">Planı paylaş</p>

          {token ? (
            <>
              <p className="mt-1 text-sm text-slate-600">
                Bağlantıya sahip herkes planı giriş yapmadan görüntüleyebilir (düzenleyemez).
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Paylaşım bağlantısı"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                />
                <button
                  type="button"
                  onClick={copy}
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  {copied ? "Kopyalandı ✓" : "Kopyala"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">👁 {views} kez görüntülendi</p>
              {dirty && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Kaydedilmemiş değişikliklerin var. Paylaşılan sayfa planın son kaydedilen hâlini gösterir.
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">
                  Önizle ↗
                </a>
                <button
                  type="button"
                  onClick={() => toggle(false)}
                  disabled={isPending}
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  {isPending && pendingAction === "off" ? "Kapatılıyor…" : "Paylaşımı kapat"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-600">
                Ekibinle veya iş ortaklarınla paylaşmak için bir bağlantı oluştur. Bağlantıyı açan kişi planı giriş
                yapmadan görür.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                <li>🔒 Plan için anlattığın durum, profilin ve eklediğin dosyalar paylaşılmaz.</li>
                <li>🔍 Sayfa arama motorlarında çıkmaz.</li>
                <li>↩️ Paylaşımı istediğin an kapatabilirsin; bağlantı çalışmaz hâle gelir.</li>
              </ul>
              <button
                type="button"
                onClick={() => toggle(true)}
                disabled={isPending}
                className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {isPending && pendingAction === "on" ? "Oluşturuluyor…" : "Paylaşım bağlantısı oluştur"}
              </button>
            </>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
