import { describe, expect, it } from "vitest";
import type { IntakeContext } from "@/core/ai/intake";
import type { ContentPersonalizer, PersonalizationRequest } from "@/core/ai/personalizer";
import { PersonalizationError } from "@/core/ai/personalizer";
import type { CatalogEntry, CatalogRepository } from "@/core/output/catalog-repository";
import { generatedDocumentSchema, type TemplateInstance } from "@/core/output/document";
import { GenerationError } from "@/core/output/errors";
import {
  AI_DESIGNED_TEMPLATE_ID,
  CUSTOM_SECTION_ID,
  generateOutput,
  isCatalogSection,
  type GenerationProgress,
} from "@/core/output/generator";
import { refineSection } from "@/core/output/refiner";

// ------------------------------------------------------------ sahte katalog

const STRATEJI = "11111111-1111-4111-8111-111111111111";
const RISK = "22222222-2222-4222-8222-222222222222";
const OLMAYAN = "44444444-4444-4444-8444-444444444444";

const CATEGORY = { id: "33333333-3333-4333-8333-333333333333", name: "İş Analizi", sortOrder: 1 };

const TEMPLATE_CONTENT = {
  kind: "template",
  summary: "Strateji çalışması",
  sections: [
    {
      id: "durum",
      title: "Mevcut Durum",
      fields: [{ id: "ozet", label: "Özet", type: "textarea" }],
      table: {
        columns: [
          { id: "adim", label: "Adım" },
          { id: "oncelik", label: "Öncelik", type: "select", options: ["Yüksek", "Düşük"] },
        ],
        emptyRows: 2,
        exampleRows: [{ adim: "Örnek adım", oncelik: "Yüksek" }],
      },
    },
  ],
};

function entry(id: string, name: string, sortOrder: number, withTemplate: boolean): CatalogEntry {
  return {
    subcategory: { id, name, outputType: "template", sortOrder },
    category: CATEGORY,
    template: withTemplate ? { id: `tpl-${id}`, version: 2, content: TEMPLATE_CONTENT } : null,
  };
}

const CATALOG = [entry(STRATEJI, "Strateji Analizi", 1, true), entry(RISK, "Risk Planı", 2, false)];

const repository: CatalogRepository = {
  async findEntriesBySubcategoryIds(ids) {
    return CATALOG.filter((e) => ids.includes(e.subcategory.id));
  },
  async findCategoryById(id) {
    return id === CATEGORY.id ? CATEGORY : null;
  },
};

// --------------------------------------------------------- sahte yapay zekâ

function fill(template: TemplateInstance, marker: string): TemplateInstance {
  return {
    ...template,
    sections: template.sections.map((s) => ({
      ...s,
      fields: s.fields.map((f) => ({ ...f, value: `${marker}: ${f.label}` })),
      table: s.table && { ...s.table, rows: [{ adim: `${marker} adımı`, oncelik: "Yüksek" }] },
    })),
  };
}

function fakePersonalizer(calls: string[] = []): ContentPersonalizer {
  return {
    async personalizeTemplate(req: PersonalizationRequest) {
      calls.push(`fill:${req.subcategoryName}`);
      return {
        template: fill(req.template, "doldurdu"),
        keyFindings: ["Bulgu"],
        assumptions: ["Varsayım"],
        openQuestions: ["Bütçe ne kadar?"],
        model: "test-model",
      };
    },
    async designDocument(req) {
      calls.push(`design:${req.topic}`);
      return {
        title: `Tasarım: ${req.topic}`,
        template: {
          kind: "template",
          summary: "Yapay zekâ tasarladı",
          sections: [{ id: "a", title: "Bölüm", fields: [{ id: "x", label: "Alan", type: "text", value: "değer" }] }],
        },
        keyFindings: [],
        assumptions: [],
        openQuestions: [],
        model: "test-model",
      };
    },
    async extractDecisions() {
      return [];
    },
  };
}

const CONTEXT: IntakeContext = {
  mode: "free",
  detail: "summary",
  language: "tr",
  entries: [{ question: "Durum", answer: "İzmir'de 3 yıllık bir kahve dükkânıyız, ikinci şubeyi düşünüyoruz." }],
};

const NOW = () => new Date("2026-09-21T10:00:00.000Z");

// ------------------------------------------------------------------- testler

describe("generateOutput — doğrulama", () => {
  it("hiçbir şey seçilmezse kullanıcıya anlaşılır hata verir", async () => {
    await expect(generateOutput({ subcategoryIds: [] }, repository)).rejects.toMatchObject({ code: "EMPTY_SELECTION" });
  });

  it("katalogda olmayan başlığı reddeder", async () => {
    await expect(generateOutput({ subcategoryIds: [OLMAYAN] }, repository)).rejects.toMatchObject({
      code: "UNKNOWN_SUBCATEGORY",
    });
  });

  it("bağlam verilip yapay zekâ yoksa üretmez", async () => {
    await expect(
      generateOutput({ subcategoryIds: [STRATEJI], context: CONTEXT }, repository),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });

  it("serbest istekte bilinmeyen kategoriyi reddeder", async () => {
    await expect(
      generateOutput(
        { subcategoryIds: [], customRequest: { categoryId: OLMAYAN, text: "Bayi değerlendirme çerçevesi" }, context: CONTEXT },
        repository,
        { personalizer: fakePersonalizer() },
      ),
    ).rejects.toBeInstanceOf(GenerationError);
  });
});

describe("generateOutput — yapay zekâsız", () => {
  it("hazır şablonu boş olarak verir, şablonu olmayanı eksik listesine koyar", async () => {
    const doc = await generateOutput({ subcategoryIds: [RISK, STRATEJI] }, repository, { now: NOW });
    expect(doc.sections.map((s) => s.subcategoryName)).toEqual(["Strateji Analizi"]);
    expect(doc.missing).toEqual([{ subcategoryId: RISK, name: "Risk Planı" }]);
    expect(doc.sections[0].templateVersion).toBe(2);
    expect(generatedDocumentSchema.safeParse(doc).success).toBe(true);
  });
});

describe("generateOutput — yapay zekâ ile", () => {
  it("hazır şablonu doldurur, şablonu olmayanı tasarlatır", async () => {
    const calls: string[] = [];
    const doc = await generateOutput({ subcategoryIds: [STRATEJI, RISK], context: CONTEXT }, repository, {
      personalizer: fakePersonalizer(calls),
      now: NOW,
    });

    expect(calls.sort()).toEqual(["design:Risk Planı", "fill:Strateji Analizi"]);
    expect(doc.missing).toEqual([]);
    const [strateji, risk] = doc.sections;
    expect(strateji.personalization?.openQuestions).toEqual(["Bütçe ne kadar?"]);
    expect(strateji.body.kind === "template" && strateji.body.sections[0].fields[0].value).toBe("doldurdu: Özet");
    expect(risk.templateId).toBe(AI_DESIGNED_TEMPLATE_ID);
    expect(doc.context).toEqual(CONTEXT);
    expect(generatedDocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("serbest isteği ayrı bölüm olarak ekler ve raporlamaya katmaz", async () => {
    const doc = await generateOutput(
      { subcategoryIds: [], customRequest: { categoryId: CATEGORY.id, text: "Bayi değerlendirme çerçevesi" }, context: CONTEXT },
      repository,
      { personalizer: fakePersonalizer(), now: NOW },
    );
    expect(doc.sections).toHaveLength(1);
    expect(doc.sections[0].subcategoryId).toBe(CUSTOM_SECTION_ID);
    expect(doc.sections[0].subcategoryName).toBe("Tasarım: Bayi değerlendirme çerçevesi");
    expect(isCatalogSection(doc.sections[0])).toBe(false);
  });

  it("İngilizce planda Türkçe hazır şablonu kullanmaz, çerçeveyi tasarlatır", async () => {
    const calls: string[] = [];
    await generateOutput({ subcategoryIds: [STRATEJI], context: { ...CONTEXT, language: "en" } }, repository, {
      personalizer: fakePersonalizer(calls),
    });
    expect(calls).toEqual(["design:Strateji Analizi"]);
  });

  it("her biten bölüm için ilerleme bildirir", async () => {
    const events: GenerationProgress[] = [];
    await generateOutput(
      {
        subcategoryIds: [STRATEJI, RISK],
        customRequest: { categoryId: CATEGORY.id, text: "Bayi değerlendirme" },
        context: CONTEXT,
      },
      repository,
      { personalizer: fakePersonalizer(), onProgress: (p) => events.push(p) },
    );
    expect(events.map((e) => e.completed)).toEqual([1, 2, 3]);
    expect(events.every((e) => e.total === 3)).toBe(true);
  });

  it("ilerleme bildirimindeki hata üretimi bozmaz", async () => {
    const doc = await generateOutput({ subcategoryIds: [STRATEJI], context: CONTEXT }, repository, {
      personalizer: fakePersonalizer(),
      onProgress: () => {
        throw new Error("arayüz hatası");
      },
    });
    expect(doc.sections).toHaveLength(1);
  });

  it("yapay zekâ hatasını kullanıcıya gösterilebilir hataya çevirir", async () => {
    const failing = fakePersonalizer();
    failing.personalizeTemplate = async () => {
      throw new PersonalizationError("Yapay zekâ yanıt vermedi.");
    };
    await expect(
      generateOutput({ subcategoryIds: [STRATEJI], context: CONTEXT }, repository, { personalizer: failing }),
    ).rejects.toMatchObject({ code: "AI_FAILED", message: "Yapay zekâ yanıt vermedi." });
  });
});

describe("refineSection", () => {
  async function personalizedDoc() {
    return generateOutput({ subcategoryIds: [STRATEJI], context: CONTEXT }, repository, {
      personalizer: fakePersonalizer(),
      now: NOW,
    });
  }

  it("cevapları gönderir ve bölümü günceller", async () => {
    const doc = await personalizedDoc();
    let revision: PersonalizationRequest["revision"];
    const personalizer = fakePersonalizer();
    personalizer.personalizeTemplate = async (req) => {
      revision = req.revision;
      return { template: fill(req.template, "güncellendi"), keyFindings: [], assumptions: [], openQuestions: [], model: "m" };
    };

    const updated = await refineSection(
      doc,
      { sectionIndex: 0, answers: [{ question: "Bütçe ne kadar?", answer: "500.000 TL" }] },
      personalizer,
    );
    expect(revision?.answers).toEqual([{ question: "Bütçe ne kadar?", answer: "500.000 TL" }]);
    const body = updated.sections[0].body;
    expect(body.kind === "template" && body.sections[0].fields[0].value).toBe("güncellendi: Özet");
  });

  it("boş cevaplarla güncelleme yapmaz", async () => {
    const doc = await personalizedDoc();
    await expect(
      refineSection(doc, { sectionIndex: 0, answers: [{ question: "Bütçe?", answer: "   " }] }, fakePersonalizer()),
    ).rejects.toMatchObject({ code: "EMPTY_SELECTION" });
  });

  it("olmayan bölümü reddeder", async () => {
    const doc = await personalizedDoc();
    await expect(
      refineSection(doc, { sectionIndex: 5, answers: [{ question: "a", answer: "b" }] }, fakePersonalizer()),
    ).rejects.toMatchObject({ code: "INVALID_CONTENT" });
  });
});
