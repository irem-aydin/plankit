"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, CalendarClock, HelpCircle, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { CATEGORY_NAMES, continuePath, PREVIEW_MAX_CHARS, PREVIEW_MIN_CHARS, type PlanPreview } from "@/core/ai/preview";
import { previewAction } from "./preview-actions";

const EXAMPLES = [
  "Kafemin hafta içi satışları son 3 ayda %25 düştü. Bütçem kısıtlı, 6 ayda toparlamak istiyorum.",
  "5 kişilik yazılım ekibimizle 4 ayda bir mobil uygulama çıkaracağız; riskleri ve takvimi planlamak istiyorum.",
  "Zeytinyağımızı Almanya'ya ihraç etmek istiyoruz; nereden başlamalıyız?",
];

/** Ana sayfada kayıt olmadan kısa plan önizlemesi. */
export function TryPreview() {
  const [text, setText] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  const [submitted, setSubmitted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const length = text.trim().length;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const request = text.trim();
    startTransition(async () => {
      try {
        const result = await previewAction(request, honeypot);
        if (result.ok) {
          setPreview(result.preview);
          setSubmitted(request);
        } else setError(result.error);
      } catch {
        setError("Bağlantı hatası. Lütfen tekrar dene.");
      }
    });
  }

  const nextPath = preview ? continuePath(preview, submitted) : "/kayit";
  const signupHref = `/kayit?sonra=${encodeURIComponent(nextPath)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <label htmlFor="try-text" className="flex items-center gap-2 font-semibold text-slate-900">
          <Sparkles className="size-4 text-rose-600" aria-hidden /> Durumunu birkaç cümleyle anlat
        </label>
        <textarea
          id="try-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, PREVIEW_MAX_CHARS))}
          rows={5}
          placeholder="Örn. Kafemin hafta içi satışları düştü, 6 ayda toparlamak istiyorum…"
          className="mt-3 block w-full resize-none rounded-xl border border-slate-300 px-3.5 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
        />
        {/* Botlar için görünmeyen alan */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          aria-hidden
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              className="rounded-full bg-slate-100 px-3 py-1 text-left text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-800"
            >
              {ex.length > 48 ? `${ex.slice(0, 46)}…` : ex}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}{" "}
            <Link href="/kayit" className="font-semibold underline">
              Ücretsiz başla
            </Link>
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {length}/{PREVIEW_MAX_CHARS} · kayıt gerekmez · 1 ücretsiz önizleme
          </span>
          <button
            type="submit"
            disabled={isPending || length < PREVIEW_MIN_CHARS}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
            {isPending ? "Önizleme hazırlanıyor…" : "Önizlemeyi gör"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Yazdığın metin yalnızca önizleme için yapay zekâya gönderilir ve saklanmaz.{" "}
          <Link href="/yasal#aydinlatma" className="underline">
            Ayrıntılar
          </Link>
        </p>
      </form>

      <div aria-live="polite">
        {preview ? (
          <PreviewCard preview={preview} signupHref={signupHref} />
        ) : (
          <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-8 text-center">
            {isPending ? (
              <>
                <Loader2 className="size-8 animate-spin text-rose-500" aria-hidden />
                <p className="mt-3 text-sm font-medium text-slate-700">Durumun analiz ediliyor…</p>
                <p className="mt-1 text-xs text-slate-500">Bu 10-15 saniye sürebilir.</p>
              </>
            ) : (
              <>
                <Lightbulb className="size-8 text-rose-400" aria-hidden />
                <p className="mt-3 font-medium text-slate-800">Planının önizlemesi burada görünecek</p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  Öne çıkan bulgular ve ilk adımlar yaklaşık 15 saniyede hazır olur.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewCard({ preview, signupHref }: { preview: PlanPreview; signupHref: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-lg shadow-rose-900/5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 ring-inset">
          Önizleme
        </span>
        <span className="text-xs text-slate-500">{CATEGORY_NAMES[preview.category]}</span>
      </div>
      <h3 className="mt-2 text-lg font-bold text-slate-900">{preview.title}</h3>
      {preview.summary && <p className="mt-1 text-sm text-slate-600">{preview.summary}</p>}

      <p className="mt-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">Öne çıkan bulgular</p>
      <ol className="mt-2 space-y-1.5 text-sm text-slate-800">
        {preview.keyFindings.map((k, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-700">
              {i + 1}
            </span>
            {k}
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">İlk adımlar</p>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
        {preview.firstSteps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-rose-500" aria-hidden />
            <span>
              {s.step} <span className="text-slate-500">· {s.when}</span>
            </span>
          </li>
        ))}
      </ul>

      {preview.openQuestion && (
        <p className="mt-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <HelpCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {preview.openQuestion}
        </p>
      )}

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-700">
          Tam planda ayrıca <strong>alternatiflerin karşılaştırması</strong>, <strong>risk haritası</strong>,{" "}
          <strong>zaman çizelgesi</strong> ve düzenlenebilir tablolar var.
        </p>
        <Link
          href={signupHref}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
        >
          Planın tamamını oluştur — ücretsiz <ArrowRight className="size-4" aria-hidden />
        </Link>
        <p className="mt-2 text-center text-xs text-slate-500">Yazdığın istek formda hazır olarak gelir.</p>
      </div>
    </div>
  );
}
