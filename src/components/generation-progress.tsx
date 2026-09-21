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
 * Uzun yapay zekâ işlemlerinde bekleme kartı. Aşamalar geçen süreye göre
 * ilerler; sunucudan gelen gerçek ilerleme (ör. "1 / 2 bölüm hazır") ayrıca
 * gösterilir. Çubuk hiçbir zaman %95'i geçmez ki "bitti ama bekliyor"
 * izlenimi oluşmasın.
 */
export function GenerationProgress({
  title,
  stages,
  expectedSeconds,
  startedAt,
  detail,
  note,
  inline = false,
}: {
  title: string;
  stages: ProgressStage[];
  expectedSeconds: number;
  /** Süre bu andan itibaren sayılır (sayfa yenilense de doğru kalır) */
  startedAt?: string;
  /** Sunucudan gelen gerçek ilerleme mesajı */
  detail?: string | null;
  note?: React.ReactNode;
  /** true: sayfa içinde kart; false: tam ekran kaplama */
  inline?: boolean;
}) {
  const [start] = useState(() => (startedAt ? Date.parse(startedAt) : Date.now()));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - start) / 1000));
  const current = stages.reduce((idx, s, i) => (elapsed >= s.at ? i : idx), 0);
  const percent = Math.min(95, Math.round(95 * (1 - Math.exp(-elapsed / (expectedSeconds / 1.5)))));
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, "0");

  const card = (
    <div role="status" aria-live="polite" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-900">{title}</p>
        <span className="font-mono text-sm text-slate-500 tabular-nums">
          {minutes}:{seconds}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-pink-100">
        <div className="h-full rounded-full bg-pink-600 transition-all duration-1000" style={{ width: `${percent}%` }} />
      </div>
      {detail && <p className="mt-2 text-xs font-medium text-pink-800">{detail}</p>}

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
              <span className="size-5 animate-spin rounded-full border-2 border-pink-200 border-t-pink-600" />
            ) : (
              <span className="size-5 rounded-full border-2 border-slate-200" />
            )}
            {s.text}
          </li>
        ))}
      </ol>

      <div className="mt-5 text-xs text-slate-500">
        {elapsed > expectedSeconds * 1.3 && <p className="mb-1">Detaylı planlar biraz daha uzun sürebiliyor, az kaldı.</p>}
        {note ?? <p>Bu işlem birkaç dakika sürebilir.</p>}
      </div>
    </div>
  );

  if (inline) return <div className="flex justify-center">{card}</div>;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">{card}</div>
  );
}
