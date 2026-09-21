"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { OutputTypeBadge } from "@/components/output-type-badge";
import type { DocumentSection, GeneratedDocument, SectionBody } from "@/core/output/document";
import { renderDocumentMarkdown } from "@/core/output/markdown";
import { deleteOutputAction, refineSectionAction, saveOutputAction } from "../actions";
import { DecisionsPanel } from "./decisions-panel";
import { ChecklistEditor, GuideEditor, TemplateEditor } from "./section-editors";

export function OutputEditor({
  outputId,
  initialDocument,
  profiles,
}: {
  outputId: string;
  initialDocument: GeneratedDocument;
  profiles: { id: string; name: string }[];
}) {
  const [doc, setDoc] = useState(initialDocument);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);
  const router = useRouter();

  async function refine(index: number, answers: { question: string; answer: string }[]) {
    setRefiningIndex(index);
    setStatus(null);
    try {
      const result = await refineSectionAction(outputId, doc, { sectionIndex: index, answers });
      if (result.ok) {
        setDoc(result.document);
        setDirty(false);
        setStatus({
          kind: "ok",
          text:
            result.remembered > 0
              ? `Plan güncellendi · ${result.remembered} bilgi "${result.document.context?.profile?.name}" profilinin hafızasına eklendi`
              : "Plan cevaplarına göre güncellendi ve kaydedildi",
        });
      } else {
        setStatus({ kind: "error", text: result.error });
        if (result.needsSubscription) router.push("/abonelik?durum=limit");
      }
    } catch {
      setStatus({ kind: "error", text: "Bağlantı hatası. Lütfen tekrar dene." });
    } finally {
      setRefiningIndex(null);
    }
  }

  function update(next: GeneratedDocument) {
    setDoc(next);
    setDirty(true);
    setStatus(null);
  }

  function updateBody(index: number, body: SectionBody) {
    update({
      ...doc,
      sections: doc.sections.map((s, i) => (i === index ? { ...s, body } : s)),
    });
  }

  function save() {
    startSaving(async () => {
      const result = await saveOutputAction(outputId, doc);
      if (result.ok) {
        setDirty(false);
        setStatus({ kind: "ok", text: "Kaydedildi" });
      } else {
        setStatus({ kind: "error", text: result.error });
      }
    });
  }

  function downloadMarkdown() {
    const blob = new Blob([renderDocumentMarkdown(doc)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(doc.title)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Kaydedilmemiş değişiklik uyarısı + Ctrl/Cmd+S
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div>
      {/* Araç çubuğu */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur print:hidden">
        <Link href="/ciktilar" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Planlarım
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {status && (
            <span className={`text-sm ${status.kind === "ok" ? "text-emerald-700" : "text-red-700"}`}>{status.text}</span>
          )}
          {dirty && !status && <span className="text-sm text-amber-700">Kaydedilmemiş değişiklikler</span>}
          <button
            type="button"
            onClick={downloadMarkdown}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Markdown indir
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            PDF olarak kaydet
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isSaving || !dirty}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSaving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {refiningIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto size-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
            <p className="mt-4 font-semibold text-slate-900">Planın güncelleniyor</p>
            <p className="mt-1 text-sm text-slate-600">
              Yapay zekâ cevaplarını plana işliyor. Bu işlem 2-4 dakika sürebilir; lütfen sayfayı kapatma.
            </p>
          </div>
        </div>
      )}

      <article className="mx-auto max-w-4xl">
        <input
          aria-label="Doküman başlığı"
          value={doc.title}
          maxLength={200}
          onChange={(e) => update({ ...doc, title: e.target.value })}
          className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-3xl font-bold tracking-tight text-slate-900 hover:border-slate-200 focus:border-indigo-400 focus:outline-none"
        />
        <p className="mt-1 px-2 text-sm text-slate-500">
          {new Date(doc.generatedAt).toLocaleString("tr-TR")} tarihinde oluşturuldu · {doc.sections.length} bölüm
        </p>

        {doc.context && (
          <details className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm print:hidden">
            <summary className="cursor-pointer font-medium text-slate-700">
              {doc.context.profile ? `Kullanılan profil: ${doc.context.profile.name}` : "Bu plan için verdiğin bilgiler"}
            </summary>
            <dl className="mt-3 space-y-3">
              {doc.context.entries.map((e, i) => (
                <div key={i}>
                  <dt className="font-medium text-slate-800">{e.question}</dt>
                  <dd className="mt-0.5 whitespace-pre-line text-slate-600">{e.answer}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        {doc.attachments.length > 0 && (
          <p className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            📎 Bu plan hazırlanırken şu dosyalar okundu: {doc.attachments.map((a) => a.name).join(", ")}
          </p>
        )}

        {doc.missing.length > 0 && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">
            Şu başlıkların içeriği henüz hazır değil ve dokümana eklenmedi: {doc.missing.map((m) => m.name).join(", ")}
          </p>
        )}

        {doc.sections.length > 1 && (
          <nav className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">İçindekiler</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {doc.sections.map((s) => (
                <li key={s.subcategoryId}>
                  <a href={`#${s.subcategoryId}`} className="text-indigo-700 hover:underline">
                    {s.subcategoryName}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {doc.sections.map((section, index) => (
          <section
            key={section.subcategoryId}
            id={section.subcategoryId}
            className="mt-8 scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 print:border-0 print:p-0"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>{section.categoryName}</span>
              <OutputTypeBadge type={section.body.kind} />
            </div>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">{section.subcategoryName}</h2>
            {section.body.summary && <p className="mt-3 text-slate-600">{section.body.summary}</p>}
            {section.personalization && (
              <PersonalizationNotes
                key={section.personalization.openQuestions.join("|")}
                notes={section.personalization}
                refining={refiningIndex !== null}
                onRefine={(answers) => refine(index, answers)}
              />
            )}

            <div className="mt-6">
              {section.body.kind === "template" && (
                <TemplateEditor
                  body={section.body}
                  showExamples={!section.personalization}
                  onChange={(b) => updateBody(index, b)}
                />
              )}
              {section.body.kind === "checklist" && (
                <ChecklistEditor body={section.body} onChange={(b) => updateBody(index, b)} />
              )}
              {section.body.kind === "guide" && (
                <GuideEditor body={section.body} onChange={(b) => updateBody(index, b)} />
              )}
            </div>
          </section>
        ))}

        {doc.sections.some((s) => s.personalization) && (
          <DecisionsPanel outputId={outputId} doc={doc} profiles={profiles} />
        )}

        <p className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
          Bu doküman yapay zekâ desteğiyle hazırlanmıştır ve karar desteği amaçlıdır. Tahmini rakamlar, tarihler ve
          mevzuat bilgileri uygulamaya geçmeden önce ilgili kurumdan veya bir uzmandan teyit edilmelidir.
        </p>

        <form action={deleteOutputAction} className="mt-6 text-right print:hidden">
          <input type="hidden" name="id" value={outputId} />
          <button
            type="submit"
            onClick={(e) => {
              if (!confirm("Bu çıktı kalıcı olarak silinsin mi?")) e.preventDefault();
            }}
            className="text-sm text-red-600 hover:underline"
          >
            Çıktıyı sil
          </button>
        </form>
      </article>
    </div>
  );
}

function PersonalizationNotes({
  notes,
  onRefine,
  refining,
}: {
  notes: NonNullable<DocumentSection["personalization"]>;
  onRefine: (answers: { question: string; answer: string }[]) => void;
  refining: boolean;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const answered = notes.openQuestions
    .map((question, i) => ({ question, answer: (answers[i] ?? "").trim() }))
    .filter((a) => a.answer);

  return (
    <div className="mt-4 space-y-3">
      {notes.keyFindings.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 print:border-slate-300 print:bg-white">
          <p className="text-sm font-semibold text-indigo-950">Öne çıkan bulgular</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-indigo-950">
            {notes.keyFindings.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm print:border-slate-300 print:bg-white">
        <p className="font-medium text-violet-900 print:hidden">
          ✨ Bu bölüm senin anlattıklarına göre yapay zekâ ile hazırlandı. Tahmini rakamları ve mevzuat bilgilerini
          uygulamadan önce doğrula; gerektiği yerde düzenle.
        </p>

        {notes.assumptions.length > 0 && (
          <div className="mt-3">
            <p className="font-semibold text-slate-800">Yapılan varsayımlar ({notes.assumptions.length})</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">
              {notes.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {notes.openQuestions.length > 0 && (
          <div className="mt-4">
            <p className="font-semibold text-slate-800">Planı netleştirmek için sorular</p>
            <p className="mt-0.5 text-xs text-slate-600 print:hidden">
              Bildiklerini cevapla (hepsini cevaplaman gerekmez), planı cevaplarına göre güncelleyelim. Yaptığın
              düzenlemeler korunur.
            </p>
            <ol className="mt-2 space-y-3">
              {notes.openQuestions.map((q, i) => (
                <li key={i}>
                  <label className="block text-slate-800">
                    <span>
                      {i + 1}. {q}
                    </span>
                    <textarea
                      value={answers[i] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                      rows={1}
                      placeholder="Cevabın…"
                      disabled={refining}
                      className="mt-1 block w-full resize-none rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm field-sizing-content focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none print:hidden"
                    />
                  </label>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-3 print:hidden">
              <span className="text-xs text-slate-500">Güncelleme 1 kullanım hakkı sayılır · 2-4 dk</span>
              <button
                type="button"
                disabled={refining || answered.length === 0}
                onClick={() => onRefine(answered)}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refining
                  ? "Plan güncelleniyor…"
                  : `✨ Cevaplarımla planı güncelle${answered.length ? ` (${answered.length})` : ""}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function slugify(value: string) {
  return (
    value
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "cikti"
  );
}
