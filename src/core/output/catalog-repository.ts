import type { OutputType } from "./content-schema";

export interface CatalogEntry {
  subcategory: {
    id: string;
    name: string;
    description?: string;
    outputType: OutputType;
    sortOrder: number;
  };
  category: {
    id: string;
    name: string;
    sortOrder: number;
  };
  /** Alt başlığın aktif içerik kalıbı; henüz yazılmadıysa null */
  template: {
    id: string;
    version: number;
    content: unknown;
  } | null;
}

/**
 * Motorun veri kaynağına bağımlılığı. Supabase, test için bellek içi bir
 * sahte veya ileride başka bir depo bu arayüzü uygulayabilir.
 */
export interface CatalogRepository {
  findEntriesBySubcategoryIds(ids: string[]): Promise<CatalogEntry[]>;
  /** Serbest istek için kategori bilgisi */
  findCategoryById(id: string): Promise<CatalogEntry["category"] | null>;
}
