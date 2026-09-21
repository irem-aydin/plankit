import type { Metadata } from "next";
import Link from "next/link";
import { signUpAction } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Kayıt ol" };

export default async function SignUpPage({ searchParams }: PageProps<"/kayit">) {
  const { sonra } = await searchParams;
  const next = typeof sonra === "string" ? sonra : undefined;
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Ücretsiz hesap oluştur</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        İlk planın ücretsiz. Kredi kartı gerekmez.
      </p>
      {next?.startsWith("/olustur/") && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900">
          Hesabını oluşturunca yazdığın istek plan formunda hazır olarak açılacak.
        </p>
      )}
      <AuthForm mode="signup" action={signUpAction} next={next} />
      <p className="mt-4 text-center text-xs text-slate-500">
        Hesap oluşturarak{" "}
        <Link href="/yasal" className="font-medium text-rose-600 hover:underline">
          kullanım koşullarını ve KVKK aydınlatma metnini
        </Link>{" "}
        kabul etmiş olursun.
      </p>
    </>
  );
}
