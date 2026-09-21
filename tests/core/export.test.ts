import { Packer } from "docx";
import { describe, expect, it } from "vitest";
import { SAMPLE_PLAN } from "@/content/sample-plan";
import { generatedDocumentSchema } from "@/core/output/document";
import { buildDocx } from "@/core/output/docx";
import { renderDocumentMarkdown } from "@/core/output/markdown";

describe("örnek plan", () => {
  it("gerçek planlarla aynı şemaya uyar", () => {
    const result = generatedDocumentSchema.safeParse(SAMPLE_PLAN);
    expect(result.success, JSON.stringify(result.error?.issues.slice(0, 3))).toBe(true);
  });
});

describe("Markdown dışa aktarma", () => {
  const md = renderDocumentMarkdown(SAMPLE_PLAN);

  it("başlığı, bölümleri ve bulguları içerir", () => {
    expect(md).toContain(`# ${SAMPLE_PLAN.title}`);
    expect(md).toContain("## Strateji Analizi");
    expect(md).toContain("**Öne çıkan bulgular:**");
  });

  it("tabloları Markdown tablosu olarak yazar", () => {
    expect(md).toMatch(/\| Faktör \| Tür \| Etki \|/);
    expect(md).toContain("| --- | --- | --- |");
  });

  it("hücredeki | karakterini bozmadan kaçırır", () => {
    const doc = structuredClone(SAMPLE_PLAN);
    const body = doc.sections[0].body;
    if (body.kind !== "template" || !body.sections[1].table) throw new Error("örnek yapı değişti");
    body.sections[1].table.rows[0].faktor = "A | B";
    expect(renderDocumentMarkdown(doc)).toContain("A \\| B");
  });
});

describe("Word dışa aktarma", () => {
  it("geçerli bir .docx (zip) dosyası üretir", async () => {
    const buffer = await Packer.toBuffer(buildDocx(SAMPLE_PLAN, "PlanKit"));
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    expect(buffer.length).toBeGreaterThan(5_000);
  });

  it("boş ve tablosuz planda da çalışır", async () => {
    const empty = { ...SAMPLE_PLAN, sections: [], context: undefined };
    const buffer = await Packer.toBuffer(buildDocx(empty, "PlanKit"));
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });
});
