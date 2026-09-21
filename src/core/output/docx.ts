/**
 * Dokümanı Word (.docx) dosyasına çevirir. Tarayıcıda da sunucuda da
 * çalışır; paketleme (Packer) çağıran tarafa bırakılır.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { GeneratedDocument, SectionBody } from "./document";

type Block = Paragraph | Table;

const DISCLAIMER =
  "Bu doküman yapay zekâ desteğiyle hazırlanmıştır ve karar desteği amaçlıdır. Tahmini rakamlar, tarihler ve mevzuat bilgileri uygulamaya geçmeden önce ilgili kurumdan veya bir uzmandan teyit edilmelidir.";

export function buildDocx(doc: GeneratedDocument, appName: string): Document {
  const children: Block[] = [
    new Paragraph({ text: doc.title, heading: HeadingLevel.TITLE }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${new Date(doc.generatedAt).toLocaleDateString("tr-TR", { dateStyle: "long" })} · ${appName}`,
          color: "64748B",
          size: 20,
        }),
      ],
      spacing: { after: 240 },
    }),
  ];

  for (const section of doc.sections) {
    children.push(
      new Paragraph({ text: section.subcategoryName, heading: HeadingLevel.HEADING_1, pageBreakBefore: children.length > 2 }),
      new Paragraph({ children: [new TextRun({ text: section.categoryName, color: "64748B", size: 20 })] }),
    );
    if (section.body.summary) children.push(textParagraph(section.body.summary));

    const p = section.personalization;
    if (p) {
      if (p.keyFindings.length) children.push(label("Öne çıkan bulgular"), ...p.keyFindings.map(bullet));
      if (p.assumptions.length) children.push(label("Yapılan varsayımlar"), ...p.assumptions.map(bullet));
      if (p.openQuestions.length) children.push(label("Netleştirilmesi gereken sorular"), ...p.openQuestions.map(bullet));
    }

    children.push(...renderBody(section.body));
  }

  if (doc.missing.length > 0) {
    children.push(textParagraph(`İçeriği henüz hazır olmayan başlıklar: ${doc.missing.map((m) => m.name).join(", ")}`));
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: DISCLAIMER, italics: true, color: "64748B", size: 18 })],
      spacing: { before: 480 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1", space: 8 } },
    }),
  );

  return new Document({
    creator: appName,
    title: doc.title,
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
    },
    sections: [{ children }],
  });
}

function renderBody(body: SectionBody): Block[] {
  const out: Block[] = [];
  switch (body.kind) {
    case "template":
      for (const s of body.sections) {
        out.push(new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_2 }));
        if (s.description) out.push(textParagraph(s.description, { italics: true, color: "64748B" }));
        for (const f of s.fields) {
          out.push(
            new Paragraph({ children: [new TextRun({ text: f.label, bold: true })], spacing: { before: 120 } }),
            textParagraph(f.value.trim() || "—"),
          );
        }
        if (s.table) {
          const cols = s.table.columns;
          const rows = s.table.rows.filter((r) => cols.some((c) => (r[c.id] ?? "").trim() !== ""));
          if (rows.length > 0) out.push(table(cols.map((c) => c.label), rows.map((r) => cols.map((c) => r[c.id] ?? ""))));
        }
      }
      break;

    case "checklist":
      for (const g of body.groups) {
        out.push(new Paragraph({ text: g.title, heading: HeadingLevel.HEADING_2 }));
        for (const item of g.items) {
          out.push(new Paragraph({ children: [new TextRun(`${item.checked ? "☑" : "☐"}  ${item.text}`)] }));
          if (item.note.trim()) out.push(textParagraph(`Not: ${item.note.trim()}`, { color: "475569" }, 360));
        }
      }
      break;

    case "guide":
      for (const s of body.sections) {
        out.push(new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_2 }));
        for (const p of s.paragraphs) out.push(textParagraph(p));
        for (const t of s.tips) out.push(bullet(`İpucu: ${t}`));
      }
      if (body.reflectionQuestions.length) {
        out.push(new Paragraph({ text: "Değerlendirme Soruları", heading: HeadingLevel.HEADING_2 }));
        for (const q of body.reflectionQuestions) {
          out.push(new Paragraph({ children: [new TextRun({ text: q.question, bold: true })] }), textParagraph(q.answer.trim() || "—"));
        }
      }
      if (body.notes.trim()) {
        out.push(new Paragraph({ text: "Notlar", heading: HeadingLevel.HEADING_2 }), textParagraph(body.notes.trim()));
      }
      break;
  }
  return out;
}

/** Satır sonlarını koruyan paragraf. */
function textParagraph(value: string, run: { italics?: boolean; color?: string } = {}, indent?: number) {
  const lines = value.split(/\r?\n/);
  return new Paragraph({
    children: lines.map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : undefined, ...run })),
    spacing: { after: 120 },
    indent: indent ? { left: indent } : undefined,
  });
}

function label(text: string) {
  return new Paragraph({ children: [new TextRun({ text, bold: true })], spacing: { before: 200 } });
}

function bullet(text: string) {
  return new Paragraph({ text, bullet: { level: 0 } });
}

function table(headers: string[], rows: string[][]) {
  const cell = (text: string, header = false) =>
    new TableCell({
      children: text.split(/\r?\n/).map(
        (line) => new Paragraph({ children: [new TextRun({ text: line, bold: header, size: 20 })] }),
      ),
      shading: header ? { type: ShadingType.CLEAR, color: "auto", fill: "EEF2FF" } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h) => cell(h, true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((v) => cell(v || "—")) })),
    ],
  });
}
