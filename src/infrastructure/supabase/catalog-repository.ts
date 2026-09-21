import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CatalogEntry,
  CatalogRepository,
} from "@/core/output/catalog-repository";
import type { OutputType } from "@/core/output/content-schema";

type SubcategoryRow = {
  id: string;
  name: string;
  description: string | null;
  output_type: OutputType;
  sort_order: number;
  category: { id: string; name: string; sort_order: number };
  output_templates: { id: string; version: number; content: unknown }[];
};

/**
 * CatalogRepository'nin Supabase uygulaması. output_templates istemciye RLS
 * ile kapalı olduğundan service role istemcisi ile oluşturulmalıdır.
 */
export class SupabaseCatalogRepository implements CatalogRepository {
  constructor(private readonly admin: SupabaseClient) {}

  async findEntriesBySubcategoryIds(ids: string[]): Promise<CatalogEntry[]> {
    const { data, error } = await this.admin
      .from("subcategories")
      .select(
        `id, name, description, output_type, sort_order,
         category:categories!inner ( id, name, sort_order ),
         output_templates ( id, version, content )`,
      )
      .in("id", ids)
      .eq("output_templates.is_active", true)
      .returns<SubcategoryRow[]>();

    if (error) throw new Error(`Katalog okunamadı: ${error.message}`);

    return (data ?? []).map((row) => {
      const template = row.output_templates[0] ?? null;
      return {
        subcategory: {
          id: row.id,
          name: row.name,
          description: row.description ?? undefined,
          outputType: row.output_type,
          sortOrder: row.sort_order,
        },
        category: {
          id: row.category.id,
          name: row.category.name,
          sortOrder: row.category.sort_order,
        },
        template,
      };
    });
  }

  async findCategoryById(id: string): Promise<CatalogEntry["category"] | null> {
    const { data, error } = await this.admin
      .from("categories")
      .select("id, name, sort_order")
      .eq("id", id)
      .maybeSingle<{ id: string; name: string; sort_order: number }>();
    if (error) throw new Error(`Kategori okunamadı: ${error.message}`);
    return data ? { id: data.id, name: data.name, sortOrder: data.sort_order } : null;
  }
}
