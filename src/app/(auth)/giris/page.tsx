import type { Metadata } from "next";
import { signInAction } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Giriş yap" };

export default async function SignInPage({ searchParams }: PageProps<"/giris">) {
  const { sonra, hata, durum } = await searchParams;

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Giriş yap</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">Şablon ve checklist&apos;lerine devam et.</p>
      {durum === "cikis" && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Tüm cihazlardaki oturumların kapatıldı. Tekrar giriş yapabilirsin.
        </p>
      )}
      {hata && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Doğrulama bağlantısı geçersiz veya süresi dolmuş. Lütfen tekrar deneyin.
        </p>
      )}
      <AuthForm mode="signin" action={signInAction} next={typeof sonra === "string" ? sonra : undefined} />
    </>
  );
}
