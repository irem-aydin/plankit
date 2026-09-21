"use client";

import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { FEEDBACK_KINDS, FEEDBACK_KIND_LABELS, type FeedbackKind } from "@/core/feedback/feedback";
import { sendFeedbackAction } from "./feedback-actions";

/** Sağ altta sabit "Geri bildirim" düğmesi ve öneri/şikâyet formu. */
export function FeedbackBox() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("suggestion");
  const [message, setMessage] = useState("");
  const [wantsReply, setWantsReply] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    if (sent) {
      setSent(false);
      setMessage("");
      setWantsReply(false);
      setKind("suggestion");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await sendFeedbackAction({ kind, message, page: pathname, wantsReply });
        if (result.ok) setSent(true);
        else setError(result.error);
      } catch {
        setError("Bağlantı hatası. Lütfen tekrar dene.");
      }
    });
  }

  // Plan oluşturma formunun alt çubuğundaki düğmelerin üstüne binmesin.
  if (pathname.startsWith("/olustur/")) return null;

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
      >
        {open ? <X className="size-4" aria-hidden /> : <MessageSquare className="size-4" aria-hidden />}
        {open ? "Kapat" : "Öneri / Şikâyet"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Öneri ve şikâyet"
          className="fixed right-4 bottom-18 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        >
          {sent ? (
            <div className="py-4 text-center">
              <p className="text-3xl" aria-hidden>
                🙏
              </p>
              <p className="mt-2 font-semibold text-slate-900">Teşekkürler, mesajın bize ulaştı</p>
              <p className="mt-1 text-sm text-slate-600">
                {wantsReply ? "En kısa sürede e-posta adresine dönüş yapacağız." : "Her mesajı okuyup değerlendiriyoruz."}
              </p>
              <button type="button" onClick={close} className="mt-4 text-sm font-medium text-rose-600 hover:underline">
                Kapat
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <p className="font-semibold text-slate-900">Bize yaz</p>
              <p className="mt-0.5 text-sm text-slate-600">Önerin, şikâyetin ya da karşılaştığın bir hata mı var?</p>

              <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Mesaj türü">
                {FEEDBACK_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={kind === k}
                    onClick={() => setKind(k)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      kind === k ? "border-rose-400 bg-rose-50 text-rose-800" : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {FEEDBACK_KIND_LABELS[k]}
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 3000))}
                rows={4}
                required
                minLength={5}
                autoFocus
                aria-label="Mesajın"
                placeholder={
                  kind === "bug"
                    ? "Ne yapıyordun, ne oldu? Ne olmasını bekliyordun?"
                    : kind === "suggestion"
                      ? "Neyin daha iyi olmasını isterdin?"
                      : "Mesajın…"
                }
                className="mt-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
              />

              <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={wantsReply}
                  onChange={(e) => setWantsReply(e.target.checked)}
                  className="mt-0.5 accent-rose-600"
                />
                Bana e-postayla dönüş yapılsın
              </label>

              {error && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending || message.trim().length < 5}
                className="mt-4 w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {isPending ? "Gönderiliyor…" : "Gönder"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
