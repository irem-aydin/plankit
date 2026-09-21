"use client";

import Link from "next/link";
import { useState } from "react";
import { DECISION_KIND_LABELS, type ExtractedDecision } from "@/core/ai/decisions";
import { proposeDecisionsAction, saveDecisionsAction } from "../actions";
import type { GeneratedDocument } from "@/core/output/document";

type Phase =
  | { step: "idle" }
  | { step: "loading" }
  | { step: "review"; decisions: ExtractedDecision[]; profileId: string; profileName: string }
  | { step: "saved"; count: number; profileName: string; profileId: string }
  | { step: "error"; message: string };

/**
 * Planı hafızaya alma: yapay zekâ dokümandaki kalıcı kararları çıkarır,
 * kullanıcı onaylar ve seçilenler profile yazılır. Sonraki planlar bu
 * kararlarla tutarlı olur.
 */
export function DecisionsPanel({
  outputId,
  doc,
  profiles,
}: {
  outputId: string;
  doc: GeneratedDocument;
  profiles: { id: string; name: string }[];
}) {
  // Planda yazan profil artık erişilebilir değilse (silinmiş veya başka hesaba aitse) ilk profile düş.
  const documentProfileId = doc.context?.profile?.id;
  const [profileId, setProfileId] = useState(
    profiles.some((p) => p.id === documentProfileId) ? documentProfileId! : (profiles[0]?.id ?? ""),
  );
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [selected, setSelected] = useState<Set<number>>(new Set());

  if (profiles.length === 0) {
    return (
      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 print:hidden">
        <h2 className="font-semibold text-slate-900">🧠 Bu planın kararlarını hatırla</h2>
        <p className="mt-1 text-sm text-slate-600">
          Kararları hafızaya almak için önce bir profil oluşturman gerekiyor. Profil oluşturduğunda sonraki planlar bu
          kararlarla (bütçe dağılımı, tarihler, eşikler) tutarlı olur.
        </p>
        <Link href="/profiller/yeni" className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:underline">
          Profil oluştur →
        </Link>
      </section>
    );
  }

  async function propose() {
    setPhase({ step: "loading" });
    try {
      const result = await proposeDecisionsAction(outputId, doc, profileId);
      if (!result.ok) {
        setPhase({ step: "error", message: result.error });
        return;
      }
      setSelected(new Set(result.decisions.map((_, i) => i)));
      setPhase({
        step: "review",
        decisions: result.decisions,
        profileId: result.profileId,
        profileName: result.profileName,
      });
    } catch {
      setPhase({ step: "error", message: "Bağlantı hatası. Lütfen tekrar dene." });
    }
  }

  async function save(decisions: ExtractedDecision[], targetProfileId: string, profileName: string) {
    const chosen = decisions.filter((_, i) => selected.has(i));
    setPhase({ step: "loading" });
    try {
      const result = await saveDecisionsAction(targetProfileId, doc.title, chosen);
      setPhase(
        result.ok
          ? { step: "saved", count: result.saved, profileName, profileId: targetProfileId }
          : { step: "error", message: result.error },
      );
    } catch {
      setPhase({ step: "error", message: "Bağlantı hatası. Lütfen tekrar dene." });
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 sm:p-6 print:hidden">
      <h2 className="font-semibold text-slate-900">🧠 Bu planın kararlarını hatırla</h2>
      <p className="mt-1 text-sm text-slate-600">
        Plandaki kalıcı kararlar (bütçe dağılımı, tarihler, karar eşikleri) profilinin hafızasına eklenir. Böylece
        bundan sonra hazırlayacağın planlar bu kararlarla çelişmez.
      </p>

      {phase.step === "idle" && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block font-medium text-slate-800">Hangi profile kaydedilsin?</span>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={propose}
            disabled={!profileId}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Kararları çıkar
          </button>
          <span className="text-xs text-slate-500">1-2 dakika sürer · kullanım hakkından düşmez</span>
        </div>
      )}

      {phase.step === "loading" && (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <span className="size-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          İşleniyor…
        </p>
      )}

      {phase.step === "review" && (
        <div className="mt-4">
          {phase.decisions.length === 0 ? (
            <p className="text-sm text-slate-700">
              Bu planda hafızaya alınacak yeni bir karar bulunamadı (kararlar zaten kayıtlı olabilir).
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-800">
                &quot;{phase.profileName}&quot; profiline kaydedilecekler — kaydetmek istemediklerinin işaretini kaldır:
              </p>
              <ul className="mt-3 space-y-2">
                {phase.decisions.map((d, i) => (
                  <li key={i}>
                    <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={(e) =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(i);
                            else next.delete(i);
                            return next;
                          })
                        }
                        className="mt-0.5 size-4 shrink-0 accent-indigo-600"
                      />
                      <span>
                        <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                          {DECISION_KIND_LABELS[d.kind]}
                        </span>
                        <span className="text-slate-800">{d.text}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => save(phase.decisions, phase.profileId, phase.profileName)}
                  disabled={selected.size === 0}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Seçilenleri hafızaya kaydet ({selected.size})
                </button>
                <button
                  type="button"
                  onClick={() => setPhase({ step: "idle" })}
                  className="text-sm font-medium text-slate-600 hover:underline"
                >
                  Vazgeç
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {phase.step === "saved" && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {phase.count} madde &quot;{phase.profileName}&quot; profilinin hafızasına eklendi. Bundan sonraki planlar bu
          kararları bilecek.{" "}
          <Link href={`/profiller/${phase.profileId}`} className="font-semibold underline">
            Hafızayı gör
          </Link>
        </p>
      )}

      {phase.step === "error" && (
        <div className="mt-4">
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{phase.message}</p>
          <button
            type="button"
            onClick={() => setPhase({ step: "idle" })}
            className="mt-2 text-sm font-medium text-slate-600 hover:underline"
          >
            Tekrar dene
          </button>
        </div>
      )}
    </section>
  );
}
