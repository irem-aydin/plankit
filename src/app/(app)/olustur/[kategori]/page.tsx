import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAiConfigured } from "@/infrastructure/ai/claude-personalizer";
import { PROFILE_KIND_META, profileCompleteness } from "@/core/profile/profile";
import { getCategoryWithSubcategories } from "@/infrastructure/supabase/catalog-queries";
import { ProfileRepository } from "@/infrastructure/supabase/profile-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { getCurrentSession } from "@/services/session";
import { SelectionForm } from "./selection-form";

/**
 * Arka plan işleri (after) bu sayfanın sunucu işlevlerinin süre sınırıyla
 * çalışır. Vercel'de Fluid Compute ile ücretsiz planda en fazla 300 sn.
 */
export const maxDuration = 300;

export async function generateMetadata({ params }: PageProps<"/olustur/[kategori]">): Promise<Metadata> {
  const { kategori } = await params;
  const data = await getCategoryWithSubcategories(kategori);
  return { title: data?.category.name ?? "Kategori" };
}

export default async function SubcategorySelectionPage({ params, searchParams }: PageProps<"/olustur/[kategori]">) {
  const { kategori } = await params;
  const { istek } = await searchParams;
  const initialRequest = typeof istek === "string" ? istek.slice(0, 500) : "";
  const [data, session] = await Promise.all([getCategoryWithSubcategories(kategori), getCurrentSession()]);
  if (!data) notFound();

  const entitlement = session?.entitlement;
  const preferences = session?.preferences;
  const personalization = preferences?.personalizationEnabled ?? true;
  const profiles = personalization
    ? (await new ProfileRepository(await createSupabaseServerClient()).list().catch(() => [])).map((p) => ({
        id: p.id,
        name: p.name,
        kindLabel: `${PROFILE_KIND_META[p.kind].icon} ${PROFILE_KIND_META[p.kind].label}`,
        completeness: profileCompleteness(p),
      }))
    : [];

  return (
    <div>
      <Link href="/olustur" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Kategoriler
      </Link>
      <p className="mt-4 text-sm font-medium text-rose-600">Adım 2</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{data.category.name}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Yalnızca ihtiyacın olan alt başlıkları seç. Bir sonraki adımda durumunu anlatırsan yapay zekâ sana özel analiz,
        öneri ve aksiyon planı hazırlar. Aradığın başlık listede yoksa ne istediğini kendi cümlenle de yazabilirsin.
      </p>

      {entitlement && !entitlement.canGenerate && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            {entitlement.kind === "credits"
              ? "Bu ayki kredilerin bitti. Krediler her ay yenilenir; hemen devam etmek için planını yükseltebilirsin."
              : "Ücretsiz deneme hakkını kullandın. Yeni planlar için sana uygun planı seç."}
          </p>
          <Link href="/abonelik" className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500">
            Planları gör
          </Link>
        </div>
      )}

      <SelectionForm
        categoryId={data.category.id}
        categoryName={data.category.name}
        subcategories={data.subcategories}
        usage={{ kind: entitlement?.kind ?? "none", remaining: entitlement?.remaining ?? 0 }}
        aiAvailable={isAiConfigured()}
        personalizationEnabled={personalization}
        profiles={profiles}
        defaultProfileId={
          profiles.some((p) => p.id === preferences?.defaultProfileId) ? preferences!.defaultProfileId : null
        }
        defaultDetail={preferences?.defaultDetail ?? "summary"}
        initialRequest={initialRequest}
      />
    </div>
  );
}
