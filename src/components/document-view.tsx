import { TableCharts } from "./table-charts";
import type { DocumentSection, GeneratedDocument, SectionBody } from "@/core/output/document";

/** Dokümanın salt okunur görünümü (örnek plan ve ileride paylaşım bağlantısı için). */
export function DocumentView({ doc }: { doc: GeneratedDocument }) {
  return (
    <article className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{doc.title}</h1>

      {doc.context && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="font-medium text-slate-800">Kullanıcının anlattığı durum</p>
          {doc.context.entries.map((e, i) => (
            <p key={i} className="mt-2 whitespace-pre-line text-slate-600">
              {e.answer}
            </p>
          ))}
        </div>
      )}

      {doc.sections.map((section) => (
        <section key={section.subcategoryId} className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
          <p className="text-sm text-slate-500">{section.categoryName}</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{section.subcategoryName}</h2>
          {section.body.summary && <p className="mt-3 text-slate-600">{section.body.summary}</p>}
          {section.personalization && <Notes notes={section.personalization} />}
          <div className="mt-6">
            <Body body={section.body} />
          </div>
        </section>
      ))}
    </article>
  );
}

function Notes({ notes }: { notes: NonNullable<DocumentSection["personalization"]> }) {
  return (
    <div className="mt-4 space-y-3 text-sm">
      {notes.keyFindings.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
          <p className="font-semibold text-rose-950">Öne çıkan bulgular</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-rose-950">
            {notes.keyFindings.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ol>
        </div>
      )}
      {(notes.assumptions.length > 0 || notes.openQuestions.length > 0) && (
        <div className="rounded-xl border border-pink-200 bg-pink-50/60 p-4">
          {notes.assumptions.length > 0 && (
            <>
              <p className="font-semibold text-slate-800">Yapılan varsayımlar ({notes.assumptions.length})</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">
                {notes.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
          {notes.openQuestions.length > 0 && (
            <>
              <p className="mt-3 font-semibold text-slate-800">Planı netleştirmek için sorular</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-slate-700">
                {notes.openQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Body({ body }: { body: SectionBody }) {
  switch (body.kind) {
    case "template":
      return (
        <div className="space-y-8">
          {body.sections.map((s) => (
            <div key={s.id}>
              <h3 className="text-lg font-semibold text-slate-900">{s.title}</h3>
              {s.description && <p className="mt-1 text-sm text-slate-500">{s.description}</p>}
              {s.fields.length > 0 && (
                <dl className="mt-3 space-y-3 text-sm">
                  {s.fields.map((f) => (
                    <div key={f.id}>
                      <dt className="font-medium text-slate-800">{f.label}</dt>
                      <dd className="mt-0.5 whitespace-pre-line text-slate-700">{f.value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {s.table && s.table.rows.length > 0 && (
                <div className="mt-3">
                  <TableCharts table={s.table} />
                </div>
              )}
              {s.table && s.table.rows.length > 0 && (
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead className="bg-slate-50 text-left text-slate-700">
                      <tr>
                        {s.table.columns.map((c) => (
                          <th key={c.id} className="border-b border-slate-200 px-3 py-2 font-semibold">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row, i) => (
                        <tr key={i} className="align-top">
                          {s.table!.columns.map((c) => (
                            <td key={c.id} className="border-b border-slate-100 px-3 py-2 text-slate-700">
                              {row[c.id] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    case "checklist":
      return (
        <div className="space-y-6">
          {body.groups.map((g) => (
            <div key={g.id}>
              <h3 className="text-lg font-semibold text-slate-900">{g.title}</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {g.items.map((item) => (
                  <li key={item.id}>
                    {item.checked ? "☑" : "☐"} {item.text}
                    {item.note && <span className="block pl-5 text-slate-500">Not: {item.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case "guide":
      return (
        <div className="space-y-6 text-sm text-slate-700">
          {body.sections.map((s) => (
            <div key={s.id}>
              <h3 className="text-lg font-semibold text-slate-900">{s.heading}</h3>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="mt-2">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      );
  }
}
