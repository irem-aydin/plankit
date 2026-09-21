import type { Metadata } from "next";
import { requestPasswordResetAction } from "../actions";
import { ForgotPasswordForm } from "../auth-form";

export const metadata: Metadata = { title: "Şifremi unuttum" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Şifreni mi unuttun?</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Hesabına kayıtlı e-posta adresini yaz; şifreni yenilemen için bir bağlantı gönderelim.
      </p>
      <ForgotPasswordForm action={requestPasswordResetAction} />
    </>
  );
}
