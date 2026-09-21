/**
 * Dokümanı Markdown'a çevirir (indirme ve ileride API çıktısı için).
 */
import type { GeneratedDocument, SectionBody } from "./document";

export function renderDocumentMarkdown(doc: GeneratedDocument): string {
  const lines: string[] = [`# ${doc.title}`, ""];
  lines.push(
    `_Oluşturulma: ${new Date(doc.generatedAt).toLocaleString("tr-TR")}_`,
    "",
  );

  for (const section of doc.sections) {
    lines.push(`## ${section.subcategoryName}`, "");
    lines.push(`_${section.categoryName}_`, "");
    if (section.personalization) {
      const p = section.personalization;
      if (p.keyFindings.length) lines.push("**Öne çıkan bulgular:**", ...p.keyFindings.map((k) => `- ${k}`), "");
      if (p.assumptions.length) lines.push("**Yapılan varsayımlar:**", ...p.assumptions.map((a) => `- ${a}`), "");
      if (p.openQuestions.length)
        lines.push("**Netleştirilmesi gereken sorular:**", ...p.openQuestions.map((q) => `- ${q}`), "");
    }
    lines.push(...renderBody(section.body), "");
  }

  if (doc.missing.length > 0) {
    lines.push(
      "---",
      "",
      `İçeriği henüz hazır olmayan başlıklar: ${doc.missing.map((m) => m.name).join(", ")}`,
      "",
    );
  }

  return lines.join("\n");
}

function renderBody(body: SectionBody): string[] {
  const out: string[] = [];
  if (body.summary) out.push(body.summary, "");

  switch (body.kind) {
    case "template":
      for (const s of body.sections) {
        out.push(`### ${s.title}`, "");
        if (s.description) out.push(`> ${s.description}`, "");
        for (const f of s.fields) {
          out.push(`**${f.label}:** ${f.value.trim() || "—"}`, "");
        }
        if (s.table) {
          const cols = s.table.columns;
          const rows = s.table.rows.filter((r) =>
            cols.some((c) => (r[c.id] ?? "").trim() !== ""),
          );
          out.push(
            `| ${cols.map((c) => escapeCell(c.label)).join(" | ")} |`,
            `| ${cols.map(() => "---").join(" | ")} |`,
          );
          const bodyRows = rows.length > 0 ? rows : [{}];
          for (const r of bodyRows) {
            out.push(
              `| ${cols.map((c) => escapeCell((r as Record<string, string>)[c.id] ?? "")).join(" | ")} |`,
            );
          }
          out.push("");
        }
      }
      break;

    case "checklist":
      for (const g of body.groups) {
        out.push(`### ${g.title}`, "");
        for (const item of g.items) {
          out.push(`- [${item.checked ? "x" : " "}] ${item.text}`);
          if (item.note.trim()) out.push(`  - Not: ${item.note.trim()}`);
        }
        out.push("");
      }
      break;

    case "guide":
      for (const s of body.sections) {
        out.push(`### ${s.heading}`, "");
        for (const p of s.paragraphs) out.push(p, "");
        for (const t of s.tips) out.push(`- 💡 ${t}`);
        if (s.tips.length) out.push("");
      }
      if (body.reflectionQuestions.length) {
        out.push("### Değerlendirme Soruları", "");
        for (const q of body.reflectionQuestions) {
          out.push(`**${q.question}**`, "", q.answer.trim() || "—", "");
        }
      }
      if (body.notes.trim()) out.push("### Notlar", "", body.notes.trim(), "");
      break;
  }
  return out;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}
