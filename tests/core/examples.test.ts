import { describe, expect, it } from "vitest";
import { EXAMPLE_DOCUMENT_SLUGS, loadExampleDocument } from "@/content/example-docs";
import { EXAMPLES } from "@/content/examples";
import { CATEGORY_SLUGS } from "@/core/ai/preview";

describe("örnek plan galerisi", () => {
  it("her örneğin geçerli bir plan dosyası var", () => {
    for (const e of EXAMPLES) {
      const doc = loadExampleDocument(e.slug);
      expect(doc, e.slug).not.toBeNull();
      expect(doc!.sections.length, e.slug).toBeGreaterThan(0);
    }
    expect(EXAMPLE_DOCUMENT_SLUGS.sort()).toEqual(EXAMPLES.map((e) => e.slug).sort());
  });

  it("adresler benzersiz ve URL'ye uygun", () => {
    const slugs = EXAMPLES.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("her alanda en az bir örnek var; açıklamalar arama sonucu uzunluğunda", () => {
    for (const c of CATEGORY_SLUGS) expect(EXAMPLES.some((e) => e.category === c), c).toBe(true);
    for (const e of EXAMPLES) {
      expect(e.description.length, e.slug).toBeGreaterThan(100);
      expect(e.description.length, e.slug).toBeLessThanOrEqual(170);
      expect(e.title.length, e.slug).toBeLessThanOrEqual(70);
    }
  });

  it("örnekler kişisel veri veya profil bilgisi taşımaz", () => {
    for (const e of EXAMPLES) {
      const doc = loadExampleDocument(e.slug)!;
      expect(doc.context?.profile, e.slug).toBeUndefined();
      expect(doc.attachments, e.slug).toEqual([]);
    }
  });
});
