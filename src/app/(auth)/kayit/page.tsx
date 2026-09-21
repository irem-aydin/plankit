import type { Metadata } from "next";
import Link from "next/link";
import { TRIAL_GENERATION_LIMIT } from "@/core/billing/entitlements";
import { signUpAction } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Kayıt ol" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Ücretsiz hesap oluştur</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        İlk {TRIAL_GENERATION_LIMIT} çıktı üretimin ücretsiz. Kredi kartı gerekmez.
      </p>
      <AuthForm mode="signup" action={signUpAction} />
      <p className="mt-4 text-center text-xs text-slate-500">
        Hesap oluşturarak{" "}
        <Link href="/yasal" className="font-medium text-indigo-600 hover:underline">
          kullanım koşullarını ve KVKK aydınlatma metnini
        </Link>{" "}
        kabul etmiş olursun.
      </p>
    </>
  );
}
