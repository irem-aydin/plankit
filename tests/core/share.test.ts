import { describe, expect, it } from "vitest";
import { SAMPLE_PLAN } from "@/content/sample-plan";
import { generatedDocumentSchema } from "@/core/output/document";
import { createShareToken, isShareToken, sharePath, toSharedDocument } from "@/core/share/share";

describe("paylaşım anahtarı", () => {
  it("URL-güvenli, 24 karakterlik ve doğrulanabilir anahtar üretir", () => {
    const token = createShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(isShareToken(token)).toBe(true);
    expect(sharePath(token)).toBe(`/p/${token}`);
  });

  it("her seferinde farklı anahtar üretir", () => {
    const tokens = new Set(Array.from({ length: 500 }, createShareToken));
    expect(tokens.size).toBe(500);
  });

  it.each(["", "kisa", "a".repeat(23), "a".repeat(25), "../../etc/passwd-xxxxxxxx", "a b".repeat(8)])(
    "geçersiz anahtarı reddeder: %s",
    (value) => {
      expect(isShareToken(value)).toBe(false);
    },
  );
});

describe("toSharedDocument (gizlilik)", () => {
  const withPrivateData = {
    ...SAMPLE_PLAN,
    context: { ...SAMPLE_PLAN.context!, profile: { id: "p1", name: "Gizli Şirket A.Ş." } },
    attachments: [{ name: "maaş-tablosu.pdf", mediaType: "application/pdf", kind: "pdf" as const, size: 1000 }],
    missing: [{ subcategoryId: "x", name: "Eksik başlık" }],
  };

  it("anlatılan durumu, profili ve dosya adlarını çıkarır", () => {
    const shared = toSharedDocument(withPrivateData);
    const json = JSON.stringify(shared);
    expect(shared.context).toBeUndefined();
    expect(shared.attachments).toEqual([]);
    expect(json).not.toContain("Gizli Şirket");
    expect(json).not.toContain("maaş-tablosu");
    expect(json).not.toContain(SAMPLE_PLAN.context!.entries[0].answer.slice(0, 40));
  });

  it("planın kendisini aynen korur ve geçerli bir doküman olarak kalır", () => {
    const shared = toSharedDocument(withPrivateData);
    expect(shared.title).toBe(SAMPLE_PLAN.title);
    expect(shared.sections).toEqual(SAMPLE_PLAN.sections);
    expect(generatedDocumentSchema.safeParse(shared).success).toBe(true);
  });

  it("orijinal dokümanı değiştirmez", () => {
    toSharedDocument(withPrivateData);
    expect(withPrivateData.context.profile.name).toBe("Gizli Şirket A.Ş.");
  });
});
