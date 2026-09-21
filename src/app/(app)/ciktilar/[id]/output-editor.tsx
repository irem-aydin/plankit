"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, FileDown, Printer, Save } from "lucide-react";
import { GenerationProgress, REFINE_STAGES } from "@/components/generation-progress";
import { useJobStatus, type JobStatusResponse } from "@/components/use-job-status";
import { APP_NAME } from "@/config/app";
import type { DocumentSection, GeneratedDocument, SectionBody } from "@/core/output/document";
import { renderDocumentMarkdown } from "@/core/output/markdown";
import { deleteOutputAction, loadOutputAction, refineSectionAction, saveOutputAction } from "../actions";
import { DecisionsPanel } from "./decisions-panel";
import { ShareButton } from "./share-dialog";
import { ChecklistEditor, GuideEditor, TemplateEditor } from "./section-editors";

export function OutputEditor({
  outputId,
  initialDocument,
  profiles,
  activeRefineJobId = null,
  share = { token: null, views: 0 },
}: {
  outputId: string;
  initialDocument: GeneratedDocument;
  profiles: { id: string; name: string }[];
  /** Sayfa açıldığında bu plan için süren bir güncelleme işi varsa */
  activeRefineJobId?: string | null;
  share?: { token: string | null; views: number };
}) {
  const [doc, setDoc] = useState(initialDocument);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [isSaving, startSaving] = useTransition();
  // Arka planda süren güncelleme işi (varsa ekran onu takip eder).
  const [refineJobId, setRefineJobId] = useState<string | null>(activeRefineJobId);
  const [starting, setStarting] = useState(false);
  const refining = refineJobId !== null || starting;
  const [exporting, setExporting] = useState(false);
  const router = useRouter();

  async function refine(index: number, answers: { question: string; answer: string }[]) {
    setStarting(true);
    setStatus(null);
    try {
      const result = await refineSectionAction(outputId, doc, { sectionIndex: index, answers });
      if (result.ok) setRefineJobId(result.jobId);
      else {
        setStatus({ kind: "error", text: result.error });
        if (result.needsSubscription) router.push("/abonelik?durum=limit");
      }
    } catch {
      setStatus({ kind: "error", text: "Bağlantı hatası. Lütfen tekrar dene." });
    } finally {
      setStarting(false);
    }
  }

  async function onRefineFinished(job: JobStatusResponse) {
    if (job.status === "succeeded") {
      const latest = await loadOutputAction(outputId).catch(() => null);
      if (latest) {
        setDoc(latest);
        setDirty(false);
      }
      setStatus({ kind: "ok", text: job.progress ?? "Plan güncellendi" });
    } else {
      setStatus({ kind: "error", text: job.error ?? "Plan güncellenemedi." });
    }
    setRefineJobId(null);
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
    downloadBlob(new Blob([renderDocumentMarkdown(doc)], { type: "text/markdown;charset=utf-8" }), `${slugify(doc.title)}.md`);
  }

  async function downloadWord() {
    setExporting(true);
    try {
      // Kütüphane büyük; yalnızca butona basılınca yüklenir.
      const [{ Packer }, { buildDocx }] = await Promise.all([import("docx"), import("@/core/output/docx")]);
      downloadBlob(await Packer.toBlob(buildDocx(doc, APP_NAME)), `${slugify(doc.title)}.docx`);
    } catch (error) {
      console.error(error);
      setStatus({ kind: "error", text: "Word dosyası oluşturulamadı. Lütfen tekrar dene." });
    } finally {
      setExporting(false);
    }
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
        <Link href="/ciktilar" className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="size-4" aria-hidden />
          Planlarım
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {status && (
            <span className={`text-sm ${status.kind === "ok" ? "text-emerald-700" : "text-red-700"}`}>{status.text}</span>
          )}
          {dirty && !status && <span className="text-sm text-amber-700">Kaydedilmemiş değişiklikler</span>}
          <ShareButton outputId={outputId} initialToken={share.token} initialViews={share.views} dirty={dirty} />
          <button
            type="button"
            onClick={downloadWord}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileDown className="size-4" aria-hidden />
            {exporting ? "Hazırlanıyor…" : "Word indir"}
          </button>
          <button
            type="button"
            onClick={downloadMarkdown}
            title="Markdown (.md) metin dosyası"
            className="rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            .md
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer className="size-4" aria-hidden />
            PDF olarak kaydet
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isSaving || !dirty}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
          >
            <Save className="size-4" aria-hidden />
            {isSaving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {starting && <GenerationProgress title="Planın güncelleniyor" stages={REFINE_STAGES} expectedSeconds={210} />}
      {refineJobId && <RefineWaiter key={refineJobId} jobId={refineJobId} onFinished={onRefineFinished} />}

      <article className="mx-auto max-w-4xl">
        <input
          aria-label="Doküman başlığı"
          value={doc.title}
          maxLength={200}
          onChange={(e) => update({ ...doc, title: e.target.value })}
          className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-3xl font-bold tracking-tight text-slate-900 hover:border-slate-200 focus:border-rose-400 focus:outline-none"
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
                  <a href={`#${s.subcategoryId}`} className="text-rose-700 hover:underline">
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
            <p className="text-sm text-slate-500">{section.categoryName}</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">{section.subcategoryName}</h2>
            {section.body.summary && <p className="mt-3 text-slate-600">{section.body.summary}</p>}
            {section.personalization && (
              <PersonalizationNotes
                key={section.personalization.openQuestions.join("|")}
                notes={section.personalization}
                refining={refining}
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

/** Arka plandaki güncelleme işini takip eder; bitince üst bileşene haber verir. */
function RefineWaiter({ jobId, onFinished }: { jobId: string; onFinished: (job: JobStatusResponse) => void }) {
  const { job, lostAccess } = useJobStatus(jobId);
  const finished = job && (job.status === "succeeded" || job.status === "failed") ? job : null;

  useEffect(() => {
    if (finished) onFinished(finished);
    // onFinished her render'da yeniden oluşur; yalnızca iş bittiğinde bir kez çağrılmalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished?.status]);

  useEffect(() => {
    if (lostAccess) onFinished({ status: "failed", title: "", progress: null, outputId: null, error: "Güncellemenin durumu okunamadı. Sayfayı yenile.", createdAt: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lostAccess]);

  return (
    <GenerationProgress
      title="Planın güncelleniyor"
      stages={REFINE_STAGES}
      expectedSeconds={210}
      startedAt={job?.createdAt}
      note={<p>Sayfayı kapatsan da güncelleme sunucuda devam eder ve plana kaydedilir.</p>}
    />
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
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 print:border-slate-300 print:bg-white">
          <p className="text-sm font-semibold text-rose-950">Öne çıkan bulgular</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-rose-950">
            {notes.keyFindings.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-xl border border-pink-200 bg-pink-50/60 p-4 text-sm print:border-slate-300 print:bg-white">
        <p className="font-medium text-pink-900 print:hidden">
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
                      className="mt-1 block w-full resize-none rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm field-sizing-content focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none print:hidden"
                    />
                  </label>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-3 print:hidden">
              <span className="text-xs text-slate-500">Güncelleme 1 kredi · 2-4 dk</span>
              <button
                type="button"
                disabled={refining || answered.length === 0}
                onClick={() => onRefine(answered)}
                className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
