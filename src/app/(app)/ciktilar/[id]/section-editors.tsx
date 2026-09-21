"use client";

import { useId } from "react";
import { TableCharts } from "@/components/table-charts";
import { emptyRow } from "@/core/output/generator";
import type { ChecklistInstance, GuideInstance, TemplateInstance } from "@/core/output/document";

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none";

// ------------------------------------------------------------------ template

export function TemplateEditor({
  body,
  onChange,
  showExamples = true,
}: {
  body: TemplateInstance;
  onChange: (body: TemplateInstance) => void;
  showExamples?: boolean;
}) {
  type Section = TemplateInstance["sections"][number];
  const uid = useId();

  function setSection(index: number, section: Section) {
    onChange({ ...body, sections: body.sections.map((s, i) => (i === index ? section : s)) });
  }

  return (
    <div className="space-y-10">
      {body.sections.map((section, si) => (
        <div key={section.id}>
          <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
          {section.description && <p className="mt-1 text-sm text-slate-600">{section.description}</p>}

          {section.fields.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {section.fields.map((field, fi) => {
                const setValue = (value: string) =>
                  setSection(si, {
                    ...section,
                    fields: section.fields.map((f, i) => (i === fi ? { ...f, value } : f)),
                  });
                const id = `${uid}-${section.id}-${field.id}`;
                return (
                  <div key={field.id} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                    <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        id={id}
                        value={field.value}
                        placeholder={field.placeholder}
                        onChange={(e) => setValue(e.target.value)}
                        className={`${inputClass} mt-1 min-h-20 field-sizing-content`}
                      />
                    ) : field.type === "select" ? (
                      <>
                        <select
                          id={id}
                          value={field.value}
                          onChange={(e) => setValue(e.target.value)}
                          className={`${inputClass} mt-1 print:hidden`}
                        >
                          <option value="">Seçin…</option>
                          {field.options?.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                        <span className="hidden text-sm text-slate-900 print:block">{field.value || "—"}</span>
                      </>
                    ) : (
                      <>
                        {/* Tek satırlık alan yazdırmada taşan metni kırpar; çıktıda düz metin gösterilir. */}
                        <input
                          id={id}
                          value={field.value}
                          placeholder={field.placeholder}
                          onChange={(e) => setValue(e.target.value)}
                          className={`${inputClass} mt-1 print:hidden`}
                        />
                        <span className="hidden text-sm text-slate-900 print:block">{field.value || "—"}</span>
                      </>
                    )}
                    {field.help && <p className="mt-1 text-xs text-slate-500 print:hidden">{field.help}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {section.table && (
            <div className="mt-4">
              <TableCharts table={section.table} />
            </div>
          )}
          {section.table && (
            <EditableTable
              table={section.table}
              showExamples={showExamples}
              onChange={(table) => setSection(si, { ...section, table })}
            />
          )}
        </div>
      ))}
    </div>
  );
}

type Table = NonNullable<TemplateInstance["sections"][number]["table"]>;

function EditableTable({
  table,
  onChange,
  showExamples,
}: {
  table: Table;
  onChange: (t: Table) => void;
  showExamples: boolean;
}) {
  const columnIds = table.columns.map((c) => c.id);

  function setCell(rowIndex: number, columnId: string, value: string) {
    onChange({
      ...table,
      rows: table.rows.map((r, i) => (i === rowIndex ? { ...r, [columnId]: value } : r)),
    });
  }

  return (
    <div className="mt-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200 print:overflow-visible">
        <table className="w-full min-w-[640px] border-collapse text-sm print:min-w-0">
          <thead className="bg-slate-50">
            <tr>
              {table.columns.map((c) => (
                <th key={c.id} scope="col" className="border-b border-slate-200 px-2 py-2 text-left font-semibold text-slate-700">
                  {c.label}
                </th>
              ))}
              <th className="w-8 border-b border-slate-200 print:hidden">
                <span className="sr-only">Satır işlemleri</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {showExamples && table.exampleRows.map((row, i) => (
              <tr key={`example-${i}`} className="bg-rose-50/40 text-slate-500 italic print:hidden">
                {table.columns.map((c, ci) => (
                  <td key={c.id} className="border-b border-slate-100 px-2 py-2 align-top">
                    {ci === 0 && (
                      <span className="mr-1 rounded bg-rose-100 px-1 text-[10px] font-semibold text-rose-700 not-italic uppercase">
                        Örnek
                      </span>
                    )}
                    {row[c.id]}
                  </td>
                ))}
                <td className="border-b border-slate-100" />
              </tr>
            ))}
            {table.rows.map((row, ri) => (
              <tr key={ri}>
                {table.columns.map((c) => (
                  <td key={c.id} className="border-b border-slate-100 p-1 align-top">
                    {c.type === "select" ? (
                      <>
                        <select
                          aria-label={c.label}
                          value={row[c.id] ?? ""}
                          onChange={(e) => setCell(ri, c.id, e.target.value)}
                          className={`${inputClass} print:hidden`}
                        >
                          <option value="">—</option>
                          {c.options?.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                        <span className="hidden px-1 text-slate-900 print:block">{row[c.id] || "—"}</span>
                      </>
                    ) : (
                      <textarea
                        aria-label={c.label}
                        rows={1}
                        value={row[c.id] ?? ""}
                        onChange={(e) => setCell(ri, c.id, e.target.value)}
                        className={`${inputClass} field-sizing-content resize-none`}
                      />
                    )}
                  </td>
                ))}
                <td className="border-b border-slate-100 px-1 text-center align-middle print:hidden">
                  <button
                    type="button"
                    aria-label="Satırı sil"
                    onClick={() => onChange({ ...table, rows: table.rows.filter((_, i) => i !== ri) })}
                    className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => onChange({ ...table, rows: [...table.rows, emptyRow(columnIds)] })}
        className="mt-2 text-sm font-medium text-rose-600 hover:underline print:hidden"
      >
        + Satır ekle
      </button>
    </div>
  );
}

// ----------------------------------------------------------------- checklist

export function ChecklistEditor({
  body,
  onChange,
}: {
  body: ChecklistInstance;
  onChange: (body: ChecklistInstance) => void;
}) {
  const total = body.groups.reduce((n, g) => n + g.items.length, 0);
  const done = body.groups.reduce((n, g) => n + g.items.filter((i) => i.checked).length, 0);

  function setItem(gi: number, ii: number, patch: Partial<ChecklistInstance["groups"][number]["items"][number]>) {
    onChange({
      ...body,
      groups: body.groups.map((g, i) =>
        i !== gi ? g : { ...g, items: g.items.map((item, j) => (j === ii ? { ...item, ...patch } : item)) },
      ),
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
        <span className="text-sm font-medium text-slate-700">
          {done}/{total}
        </span>
      </div>

      <div className="mt-6 space-y-8">
        {body.groups.map((group, gi) => (
          <div key={group.id}>
            <h3 className="text-lg font-semibold text-slate-900">{group.title}</h3>
            <ul className="mt-3 space-y-3">
              {group.items.map((item, ii) => (
                <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                  <label className="flex cursor-pointer gap-3">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => setItem(gi, ii, { checked: e.target.checked })}
                      className="mt-0.5 size-4 shrink-0 accent-emerald-600"
                    />
                    <span>
                      <span className={`text-sm ${item.checked ? "text-slate-500 line-through" : "text-slate-900"}`}>
                        {item.text}
                      </span>
                      {item.hint && <span className="mt-0.5 block text-xs text-slate-500 print:hidden">{item.hint}</span>}
                    </span>
                  </label>
                  <textarea
                    aria-label={`Not: ${item.text}`}
                    rows={1}
                    placeholder="Not ekle…"
                    value={item.note}
                    onChange={(e) => setItem(gi, ii, { note: e.target.value })}
                    className={`${inputClass} mt-2 ml-7 w-[calc(100%-1.75rem)] resize-none border-dashed field-sizing-content ${item.note ? "" : "print:hidden"}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------- guide

export function GuideEditor({ body, onChange }: { body: GuideInstance; onChange: (body: GuideInstance) => void }) {
  const uid = useId();
  return (
    <div className="space-y-8">
      {body.sections.map((section) => (
        <div key={section.id}>
          <h3 className="text-lg font-semibold text-slate-900">{section.heading}</h3>
          <div className="mt-2 space-y-3 text-slate-700">
            {section.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {section.tips.length > 0 && (
            <ul className="mt-3 space-y-1.5 rounded-lg bg-amber-50 p-4 text-sm text-amber-950">
              {section.tips.map((tip, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>💡</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {body.reflectionQuestions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 print:bg-white">
          <h3 className="text-lg font-semibold text-slate-900">Kendi girişimin için değerlendir</h3>
          <div className="mt-4 space-y-4">
            {body.reflectionQuestions.map((q, qi) => (
              <div key={q.id}>
                <label htmlFor={`${uid}-${q.id}`} className="block text-sm font-medium text-slate-800">
                  {q.question}
                </label>
                <textarea
                  id={`${uid}-${q.id}`}
                  value={q.answer}
                  onChange={(e) =>
                    onChange({
                      ...body,
                      reflectionQuestions: body.reflectionQuestions.map((x, i) =>
                        i === qi ? { ...x, answer: e.target.value } : x,
                      ),
                    })
                  }
                  className={`${inputClass} mt-1 min-h-16 field-sizing-content`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor={`${uid}-notes`} className="block text-sm font-medium text-slate-700">
          Notlar
        </label>
        <textarea
          id={`${uid}-notes`}
          value={body.notes}
          onChange={(e) => onChange({ ...body, notes: e.target.value })}
          className={`${inputClass} mt-1 min-h-20 field-sizing-content ${body.notes ? "" : "print:hidden"}`}
        />
      </div>
    </div>
  );
}
