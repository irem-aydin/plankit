"use client";

import { Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const EXAMPLES = [
  {
    prompt: "Kafemin hafta içi satışları düştü, 6 ayda toparlamak istiyorum.",
    title: "Kafe Satış Toparlama Planı",
    items: ["Durum analizi ve kök nedenler", "3 alternatif strateji karşılaştırması", "6 aylık aksiyon takvimi"],
  },
  {
    prompt: "E-ticaret sitemiz için yeni bir ödeme sistemi projesi başlatıyoruz.",
    title: "Ödeme Sistemi Proje Beratı",
    items: ["Kapsam, hedefler ve başarı ölçütleri", "Paydaşlar ve RACI matrisi", "Risk haritası ve önlemler"],
  },
  {
    prompt: "Mobil uygulamamız için abonelik modeline geçmeyi düşünüyoruz.",
    title: "Abonelik Modeli Ürün Stratejisi",
    items: ["Pazar ve rakip değerlendirmesi", "Fiyatlandırma seçenekleri", "Geçiş yol haritası ve metrikler"],
  },
];

const TYPE_MS = 32;
const HOLD_MS = 3200;

/**
 * Ana sayfa hero önizlemesi: örnek istek yazılır, ardından plan kartı belirir.
 * Hareket azaltma tercihinde animasyon yapılmaz, ilk örnek sabit gösterilir.
 */
export function HeroDemo() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [reduced, setReduced] = useState(false);
  const example = EXAMPLES[index];
  const done = reduced || typed >= example.prompt.length;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const timer = done
      ? setTimeout(() => {
          setIndex((i) => (i + 1) % EXAMPLES.length);
          setTyped(0);
        }, HOLD_MS)
      : setTimeout(() => setTyped((t) => t + 1), TYPE_MS);
    return () => clearTimeout(timer);
  }, [typed, done, reduced]);

  const text = reduced ? example.prompt : example.prompt.slice(0, typed);

  return (
    <div className="relative" aria-hidden>
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-rose-200/60 via-pink-200/40 to-transparent blur-2xl" />

      {/* İstek kutusu */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-rose-900/5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-pink-700">
          <Sparkles className="size-3.5" /> Ne oluşturmak istiyorsun?
        </p>
        <p className="mt-2 min-h-12 text-sm text-slate-800">
          {text}
          {!done && <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-slate-800" />}
        </p>
      </div>

      {/* Plan kartı */}
      <div
        key={index}
        className={`mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-rose-900/5 transition duration-500 ${
          done ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-slate-900">{example.title}</p>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 ring-inset">
            Hazır
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {example.items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="flex size-5 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Check className="size-3" />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-1.5">
          <span className="rounded-md bg-emerald-50 p-2 text-[10px] font-semibold text-emerald-800">Güçlü yönler</span>
          <span className="rounded-md bg-amber-50 p-2 text-[10px] font-semibold text-amber-800">Zayıf yönler</span>
          <span className="rounded-md bg-sky-50 p-2 text-[10px] font-semibold text-sky-800">Fırsatlar</span>
          <span className="rounded-md bg-red-50 p-2 text-[10px] font-semibold text-red-800">Tehditler</span>
        </div>
        <div className="mt-3 space-y-1.5">
          {[
            ["0%", "30%", "bg-rose-500"],
            ["20%", "40%", "bg-pink-500"],
            ["50%", "45%", "bg-sky-500"],
          ].map(([left, width, color]) => (
            <div key={left} className="relative h-2.5 rounded-full bg-slate-100">
              <span className={`absolute inset-y-0 rounded-full ${color}`} style={{ left, width }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
