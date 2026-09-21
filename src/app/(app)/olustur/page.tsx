import type { Metadata } from "next";
import Link from "next/link";
import { listCategories } from "@/infrastructure/supabase/catalog-queries";

export const metadata: Metadata = { title: "Yeni plan" };

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div>
      <p className="text-sm font-medium text-rose-600">Adım 1</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Hangi alanda çalışıyorsun?</h1>
      <p className="mt-2 text-slate-600">Bir ana kategori seç; bir sonraki adımda ihtiyacın olan alt başlıkları işaretleyeceksin.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/olustur/${category.slug}`}
            className="group rounded-xl border border-slate-200 bg-white p-6 transition hover:border-rose-300 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-rose-700">{category.name}</h2>
            {category.description && <p className="mt-2 text-sm text-slate-600">{category.description}</p>}
            <span className="mt-4 inline-block text-sm font-semibold text-rose-600">Alt başlıkları gör →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
