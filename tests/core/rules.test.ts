import { describe, expect, it } from "vitest";
import { passwordSchema, safeInternalPath } from "@/core/account/security";
import { classifyAttachment, MAX_ATTACHMENTS, validateAttachments } from "@/core/ai/attachments";
import { decisionToMemory, MAX_DECISIONS, normalizeDecisions } from "@/core/ai/decisions";
import { buildIntakeContext, INTAKE_QUESTIONS } from "@/core/ai/intake";
import { applyTemplateFill, normalizeOption } from "@/core/ai/template-fill";
import { feedbackInputSchema } from "@/core/feedback/feedback";
import type { TemplateInstance } from "@/core/output/document";

const MB = 1024 * 1024;

describe("safeInternalPath (açık yönlendirme koruması)", () => {
  it("site içi yolu kabul eder", () => {
    expect(safeInternalPath("/panel", "/")).toBe("/panel");
  });

  it.each(["https://kotu-site.com", "//kotu-site.com", "/\\kotu-site.com", "", null, 42])(
    "%s adresini reddeder",
    (value) => {
      expect(safeInternalPath(value, "/panel")).toBe("/panel");
    },
  );
});

describe("passwordSchema", () => {
  it("harf ve rakam içeren 8+ karakteri kabul eder", () => {
    expect(passwordSchema.safeParse("Sifre123").success).toBe(true);
    expect(passwordSchema.safeParse("şifreğü1").success).toBe(true);
  });

  it.each(["kisa1", "sadeceharf", "12345678", "a1".repeat(40)])("%s reddedilir", (value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });
});

describe("dosya ekleri", () => {
  it("türleri doğru sınıflandırır", () => {
    expect(classifyAttachment("image/png", "a.png")).toBe("image");
    expect(classifyAttachment("application/pdf", "a.pdf")).toBe("pdf");
    expect(classifyAttachment("", "rapor.PDF")).toBe("pdf");
    expect(classifyAttachment("", "veri.csv")).toBe("text");
    expect(classifyAttachment("application/vnd.ms-excel", "tablo.xlsx")).toBeNull();
    expect(classifyAttachment("application/msword", "belge.docx")).toBeNull();
  });

  it("sınırlar içindeki dosyaları kabul eder", () => {
    expect(validateAttachments([{ name: "a.pdf", size: 5 * MB }, { name: "b.png", size: 5 * MB }])).toBeNull();
  });

  it("çok fazla, çok büyük veya toplamı aşan dosyaları reddeder", () => {
    const many = Array.from({ length: MAX_ATTACHMENTS + 1 }, (_, i) => ({ name: `${i}.txt`, size: 10 }));
    expect(validateAttachments(many)).toMatch(/En fazla/);
    expect(validateAttachments([{ name: "dev.pdf", size: 9 * MB }])).toMatch(/dev\.pdf/);
    expect(validateAttachments([1, 2, 3].map((i) => ({ name: `${i}.pdf`, size: 7 * MB })))).toMatch(/toplam/);
  });
});

describe("buildIntakeContext", () => {
  it("çok kısa anlatımı reddeder", () => {
    expect(buildIntakeContext("free", { free: "kısa" }).ok).toBe(false);
  });

  it("serbest metni tek girdi olarak alır ve dili korur", () => {
    const result = buildIntakeContext("free", { free: "İzmir'de kahve dükkânı işletiyoruz, ikinci şubeyi düşünüyoruz." }, "detailed", "en");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.entries).toHaveLength(1);
      expect(result.context.detail).toBe("detailed");
      expect(result.context.language).toBe("en");
    }
  });

  it("kısa sorularda yalnızca cevaplananları alır", () => {
    const [q1, q2] = INTAKE_QUESTIONS.quick;
    const result = buildIntakeContext("quick", {
      [q1.id]: "Kahve dükkânı, 8 çalışan, İzmir Alsancak'ta 3 yıldır açık.",
      [q2.id]: "   ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.entries.map((e) => e.question)).toEqual([q1.label]);
  });
});

describe("normalizeOption (yapay zekâ seçenek değerleri)", () => {
  const options = ["Yüksek", "Orta", "Düşük"];

  it("büyük/küçük harf farkını yok sayar", () => {
    expect(normalizeOption("yüksek", options)).toBe("Yüksek");
  });

  it("açıklamalı cevabı seçeneğe eşler", () => {
    expect(normalizeOption("Yüksek — çünkü bütçe kısıtlı", options)).toBe("Yüksek");
  });

  it("listede olmayan değeri boş bırakır", () => {
    expect(normalizeOption("Kritik", options)).toBe("");
  });

  it("seçenek listesi yoksa değeri olduğu gibi bırakır", () => {
    expect(normalizeOption("Serbest metin", undefined)).toBe("Serbest metin");
  });
});

describe("applyTemplateFill", () => {
  const template: TemplateInstance = {
    kind: "template",
    summary: "",
    sections: [
      {
        id: "s1",
        title: "Riskler",
        fields: [{ id: "not", label: "Not", type: "text", value: "" }],
        table: {
          columns: [
            { id: "risk", label: "Risk", type: "text" },
            { id: "olasilik", label: "Olasılık", type: "select", options: ["Yüksek", "Düşük"] },
          ],
          exampleRows: [],
          rows: [{ risk: "", olasilik: "" }],
        },
      },
    ],
  };

  it("alanları ve satırları şablona eşler, boş satırları atar", () => {
    const filled = applyTemplateFill(template, {
      sections: [
        { id: " s1 ", fields: [{ id: "not", value: "Önemli" }, { id: "bilinmeyen", value: "x" }], rows: [["Kur riski", "yüksek"], ["", ""]] },
        { id: "olmayan-bolum", fields: [], rows: [] },
      ],
      keyFindings: [],
      assumptions: [],
      openQuestions: [],
    });
    const section = filled.sections[0];
    expect(section.fields[0].value).toBe("Önemli");
    expect(section.table?.rows).toEqual([{ risk: "Kur riski", olasilik: "Yüksek" }]);
  });

  it("yanıtta olmayan bölümü değiştirmez", () => {
    const filled = applyTemplateFill(template, { sections: [], keyFindings: [], assumptions: [], openQuestions: [] });
    expect(filled).toEqual(template);
  });
});

describe("normalizeDecisions", () => {
  it("tekrarları atar, bilinmeyen türü 'karar' sayar, sayıyı sınırlar", () => {
    const decisions = normalizeDecisions({
      decisions: [
        { text: "Bütçe 500.000 TL", kind: "RAKAM" },
        { text: "bütçe 500.000 tl", kind: "rakam" },
        { text: "Açılış Mart 2027", kind: "tahmin" },
        { text: "  ", kind: "karar" },
        ...Array.from({ length: 20 }, (_, i) => ({ text: `Karar ${i}`, kind: "karar" })),
      ],
    });
    expect(decisions[0]).toEqual({ text: "Bütçe 500.000 TL", kind: "rakam" });
    expect(decisions[1]).toEqual({ text: "Açılış Mart 2027", kind: "karar" });
    expect(decisions).toHaveLength(MAX_DECISIONS);
  });

  it("hafıza metnine planın adını ekler", () => {
    expect(decisionToMemory({ text: "Bütçe 500.000 TL", kind: "rakam" }, "Şube planı")).toContain("Şube planı");
  });
});

describe("feedbackInputSchema", () => {
  it("geçerli mesajı kabul eder ve boşlukları kırpar", () => {
    const r = feedbackInputSchema.safeParse({ kind: "bug", message: "  PDF indirilmiyor  " });
    expect(r.success && r.data.message).toBe("PDF indirilmiyor");
  });

  it("çok kısa mesajı ve bilinmeyen türü reddeder", () => {
    expect(feedbackInputSchema.safeParse({ kind: "bug", message: "a" }).success).toBe(false);
    expect(feedbackInputSchema.safeParse({ kind: "spam", message: "merhaba dünya" }).success).toBe(false);
  });
});
