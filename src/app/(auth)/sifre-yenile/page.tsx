import type { Metadata } from "next";
import Link from "next/link";
import { getAuthenticatedUser } from "@/infrastructure/supabase/server";
import { resetPasswordAction } from "../actions";
import { ResetPasswordForm } from "../auth-form";

export const metadata: Metadata = { title: "Yeni şifre belirle" };

export default async function ResetPasswordPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <>
        <h1 className="text-xl font-semibold text-slate-900">Bağlantının süresi dolmuş</h1>
        <p className="mt-2 text-sm text-slate-600">
          Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş olabilir. Yeni bir bağlantı iste.
        </p>
        <Link
          href="/sifremi-unuttum"
          className="mt-6 block rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Yeni bağlantı iste
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Yeni şifre belirle</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">{user.email} hesabı için yeni şifreni gir.</p>
      <ResetPasswordForm action={resetPasswordAction} />
    </>
  );
}
