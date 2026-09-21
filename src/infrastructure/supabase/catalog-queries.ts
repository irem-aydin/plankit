import "server-only";
import { createSupabaseAdminClient } from "./admin";
import { createSupabaseServerClient } from "./server";
import type { OutputType } from "@/core/output/content-schema";

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  subcategoryCount: number;
}

export interface SubcategoryOption {
  id: string;
  name: string;
  description: string | null;
  outputType: OutputType;
  hasContent: boolean;
}

/** Seçim ekranı için katalog okumaları (UI'a özel, motordan bağımsız). */
export async function listCategories(): Promise<CategorySummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, description, subcategories!inner(count)")
    .eq("subcategories.is_active", true)
    .order("sort_order");

  if (error) throw new Error(`Kategoriler okunamadı: ${error.message}`);

  return (data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    subcategoryCount:
      (c.subcategories as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export async function getCategoryWithSubcategories(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data: category, error } = await supabase
    .from("categories")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Kategori okunamadı: ${error.message}`);
  if (!category) return null;

  const { data: subs, error: subError } = await supabase
    .from("subcategories")
    .select("id, name, description, output_type")
    .eq("category_id", category.id)
    .eq("is_active", true)
    .order("sort_order");

  if (subError) throw new Error(`Alt başlıklar okunamadı: ${subError.message}`);

  // İçeriğin kendisi değil, yalnızca varlığı sorgulanır.
  const admin = createSupabaseAdminClient();
  const { data: withContent, error: contentError } = await admin
    .from("output_templates")
    .select("subcategory_id")
    .eq("is_active", true)
    .in(
      "subcategory_id",
      (subs ?? []).map((s) => s.id),
    );

  if (contentError) throw new Error(`İçerik durumu okunamadı: ${contentError.message}`);
  const available = new Set((withContent ?? []).map((t) => t.subcategory_id));

  const subcategories: SubcategoryOption[] = (subs ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    outputType: s.output_type as OutputType,
    hasContent: available.has(s.id),
  }));

  return { category, subcategories };
}
