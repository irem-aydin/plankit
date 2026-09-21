"use client";

import { useEffect, useState } from "react";

export type ProgressStage = { at: number; text: string };

/** Yeni plan üretimi (ölçülen süre: 1-4 dk). */
export const GENERATE_STAGES: ProgressStage[] = [
  { at: 0, text: "Anlattıkların okunuyor" },
  { at: 12, text: "Durumun analiz ediliyor" },
  { at: 40, text: "Alternatifler ve riskler değerlendiriliyor" },
  { at: 80, text: "Aksiyon planı ve takvim yazılıyor" },
  { at: 140, text: "Tablolar dolduruluyor, tutarlılık kontrol ediliyor" },
  { at: 210, text: "Son dokunuşlar yapılıyor" },
];

/** Cevaplarla güncelleme (ölçülen süre: 2-5 dk). */
export const REFINE_STAGES: ProgressStage[] = [
  { at: 0, text: "Cevapların okunuyor" },
  { at: 15, text: "Cevapların plana etkisi değerlendiriliyor" },
  { at: 60, text: "Bölüm yeniden yazılıyor" },
  { at: 150, text: "Rakamlar ve tablolar güncelleniyor" },
  { at: 240, text: "Son dokunuşlar yapılıyor" },
];

/**
 * Uzun yapay zekâ işlemlerinde tam ekran bekleme kartı. Sunucudan gerçek
 * ilerleme gelmediği için aşamalar geçen süreye göre ilerler; çubuk hiçbir
 * zaman %95'i geçmez ki "bitti ama bekliyor" izlenimi oluşmasın.
 */
export function GenerationProgress({
  title,
  stages,
  expectedSeconds,
}: {
  title: string;
  stages: ProgressStage[];
  expectedSeconds: number;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const current = stages.reduce((idx, s, i) => (elapsed >= s.at ? i : idx), 0);
  const percent = Math.min(95, Math.round(95 * (1 - Math.exp(-elapsed / (expectedSeconds / 1.5)))));
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div role="status" aria-live="polite" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-slate-900">{title}</p>
          <span className="font-mono text-sm text-slate-500 tabular-nums">
            {minutes}:{seconds}
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-violet-100">
          <div className="h-full rounded-full bg-violet-600 transition-all duration-1000" style={{ width: `${percent}%` }} />
        </div>

        <ol className="mt-5 space-y-2.5 text-sm">
          {stages.map((s, i) => (
            <li
              key={s.text}
              className={`flex items-center gap-2.5 ${
                i < current ? "text-slate-500" : i === current ? "font-medium text-slate-900" : "text-slate-400"
              }`}
            >
              {i < current ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">✓</span>
              ) : i === current ? (
                <span className="size-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
              ) : (
                <span className="size-5 rounded-full border-2 border-slate-200" />
              )}
              {s.text}
            </li>
          ))}
        </ol>

        <p className="mt-5 text-xs text-slate-500">
          {elapsed > expectedSeconds * 1.3
            ? "Detaylı planlar biraz daha uzun sürebiliyor, az kaldı. Lütfen sayfayı kapatma."
            : "Bu işlem birkaç dakika sürebilir. Lütfen sayfayı kapatma."}
        </p>
      </div>
    </div>
  );
}
