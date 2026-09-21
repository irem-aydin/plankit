import { describe, expect, it } from "vitest";
import { continuePath, normalizePreview, previewInputSchema, type PreviewResponse } from "@/core/ai/preview";

const response = (over: Partial<PreviewResponse> = {}): PreviewResponse => ({
  title: "Kafe Satış Toparlama Planı",
  summary: "Hafta içi satışları artırmak için düşük maliyetli adımlar.",
  keyFindings: ["Bulgu 1", "Bulgu 2", "Bulgu 3", "Fazladan bulgu"],
  firstSteps: [
    { step: "Saatlik satış verisini topla", when: "Bu hafta" },
    { step: "Öğle menüsü dene", when: "İlk ay" },
    { step: "  ", when: "Hiç" },
  ],
  openQuestion: "Aylık pazarlama bütçen ne kadar?",
  category: "is-analizi",
  ...over,
});

describe("previewInputSchema", () => {
  it("çok kısa ve çok uzun metni reddeder", () => {
    expect(previewInputSchema.safeParse("kısa").success).toBe(false);
    expect(previewInputSchema.safeParse("a".repeat(601)).success).toBe(false);
    expect(previewInputSchema.safeParse("  Kafemin satışları düştü, toparlamak istiyorum  ").success).toBe(true);
  });
});

describe("normalizePreview", () => {
  it("en fazla 3 bulgu ve 3 dolu adım tutar", () => {
    const p = normalizePreview(response())!;
    expect(p.keyFindings).toHaveLength(3);
    expect(p.firstSteps).toHaveLength(2);
  });

  it("bilinmeyen alanı İş Analizi'ne düşürür, büyük harfi tolere eder", () => {
    expect(normalizePreview(response({ category: "Proje-Yonetimi " }))!.category).toBe("proje-yonetimi");
    expect(normalizePreview(response({ category: "pazarlama" }))!.category).toBe("is-analizi");
  });

  it("uygunsuz veya boş yanıtta null döner", () => {
    expect(normalizePreview(response({ title: "Uygun değil" }))).toBeNull();
    expect(normalizePreview(response({ keyFindings: [] }))).toBeNull();
    expect(normalizePreview(response({ firstSteps: [] }))).toBeNull();
  });

  it("aşırı uzun metinleri kısaltır", () => {
    const p = normalizePreview(response({ title: "x".repeat(300) }))!;
    expect(p.title.length).toBeLessThanOrEqual(90);
  });
});

describe("continuePath", () => {
  it("seçilen alanın formuna isteği taşır", () => {
    expect(continuePath({ category: "urun-yonetimi" }, " Abonelik modeli & fiyat? ")).toBe(
      "/olustur/urun-yonetimi?istek=Abonelik%20modeli%20%26%20fiyat%3F",
    );
  });
});
