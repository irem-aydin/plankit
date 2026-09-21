import type { Metadata } from "next";
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
    </>
  );
}
