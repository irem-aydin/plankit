import type { Metadata } from "next";
import Link from "next/link";
import { OutputRepository } from "@/infrastructure/supabase/output-repository";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export const metadata: Metadata = { title: "Planlarım" };

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

export default async function OutputsPage() {
  const supabase = await createSupabaseServerClient();
  const outputs = await new OutputRepository(supabase).listForCurrentUser();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Planlarım</h1>
          <p className="mt-1 text-slate-600">Oluşturduğun planlar, şablonlar ve checklist&apos;ler.</p>
        </div>
        <Link href="/olustur" className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
          Yeni plan oluştur
        </Link>
      </div>

      {outputs.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium text-slate-900">Henüz bir çıktın yok.</p>
          <p className="mt-1 text-sm text-slate-600">Bir kategori ve alt başlık seçerek ilk dokümanını oluştur.</p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {outputs.map((o) => (
            <li key={o.id}>
              <Link href={`/ciktilar/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-slate-50">
                <span className="font-medium text-slate-900">{o.title}</span>
                <span className="text-sm text-slate-500">
                  {dateFormat.format(new Date(o.createdAt))}
                  {o.updatedAt !== o.createdAt && " · düzenlendi"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
