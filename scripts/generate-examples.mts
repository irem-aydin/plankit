/**
 * Örnek plan galerisinin içeriklerini gerçek plan motoruyla üretir ve
 * src/content/examples/<slug>.json olarak kaydeder. Var olan dosyaları
 * atlar (yeniden üretmek için --force). Her örnek bir yapay zekâ üretimidir
 * (~0,15 $); sonuçlar yayından önce elle gözden geçirilmelidir.
 *
 * Çalıştırma:
 *   NODE_OPTIONS=--conditions=react-server npx tsx --tsconfig tsconfig.json scripts/generate-examples.mts [slug...] [--force]
 */
import fs from "node:fs";
import path from "node:path";

process.loadEnvFile(".env.local");

const { EXAMPLES } = await import("@/content/examples");
const { CATEGORY_NAMES } = await import("@/core/ai/preview");
const { buildIntakeContext } = await import("@/core/ai/intake");
const { generateOutput } = await import("@/core/output/generator");
const { generatedDocumentSchema } = await import("@/core/output/document");
const { ClaudePersonalizer } = await import("@/infrastructure/ai/claude-personalizer");

const OUT_DIR = path.resolve("src/content/examples");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Galeri örnekleri serbest istekten tasarlanır; katalog veritabanına ihtiyaç yok.
const CATEGORY_IDS: Record<string, string> = {
  "is-analizi": "10000000-0000-4000-8000-000000000001",
  "proje-yonetimi": "10000000-0000-4000-8000-000000000002",
  "urun-yonetimi": "10000000-0000-4000-8000-000000000003",
  "is-gelistirme": "10000000-0000-4000-8000-000000000004",
};
const repository = {
  async findEntriesBySubcategoryIds() {
    return [];
  },
  async findCategoryById(id: string) {
    const slug = Object.keys(CATEGORY_IDS).find((k) => CATEGORY_IDS[k] === id);
    return slug ? { id, name: CATEGORY_NAMES[slug as keyof typeof CATEGORY_NAMES], sortOrder: 0 } : null;
  },
};

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));
const targets = EXAMPLES.filter((e) => (only.length === 0 || only.includes(e.slug)) && (force || !fs.existsSync(path.join(OUT_DIR, `${e.slug}.json`))));
console.log(`Üretilecek: ${targets.map((t) => t.slug).join(", ") || "(yok)"}`);

const personalizer = new ClaudePersonalizer();
await Promise.all(
  targets.map(async (example) => {
    const started = Date.now();
    const context = buildIntakeContext("free", { free: example.scenario }, "summary", "tr");
    if (!context.ok) throw new Error(`${example.slug}: ${context.error}`);
    try {
      const doc = await generateOutput(
        {
          subcategoryIds: [],
          title: example.title,
          context: context.context,
          customRequest: { categoryId: CATEGORY_IDS[example.category], text: example.request },
        },
        repository,
        { personalizer },
      );
      const valid = generatedDocumentSchema.parse(doc);
      fs.writeFileSync(path.join(OUT_DIR, `${example.slug}.json`), JSON.stringify(valid, null, 2) + "\n");
      console.log(`✓ ${example.slug} (${Math.round((Date.now() - started) / 1000)} sn)`);
    } catch (error) {
      console.error(`✗ ${example.slug}:`, error instanceof Error ? error.message : error);
    }
  }),
);
