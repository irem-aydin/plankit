"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { PASSWORD_HINT } from "@/core/account/security";
import type { AuthFormState } from "./actions";

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none";

function Feedback({ state }: { state: AuthFormState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.message}
        </p>
      )}
    </>
  );
}

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "signin" | "signup";
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  next?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const isSignIn = mode === "signin";

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          E-posta
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Şifre
          </label>
          {isSignIn && (
            <Link href="/sifremi-unuttum" className="text-xs font-medium text-rose-600 hover:underline">
              Şifremi unuttum
            </Link>
          )}
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignIn ? "current-password" : "new-password"}
          minLength={isSignIn ? undefined : 8}
          required
          className={inputClass}
        />
        {!isSignIn && <p className="mt-1 text-xs text-slate-500">{PASSWORD_HINT}</p>}
      </div>

      <Feedback state={state} />

      <SubmitButton className="w-full" pendingText={isSignIn ? "Giriş yapılıyor…" : "Hesap oluşturuluyor…"}>
        {isSignIn ? "Giriş yap" : "Hesap oluştur"}
      </SubmitButton>

      <p className="text-center text-sm text-slate-600">
        {isSignIn ? (
          <>
            Hesabın yok mu?{" "}
            <Link href={next ? `/kayit?sonra=${encodeURIComponent(next)}` : "/kayit"} className="font-semibold text-rose-600 hover:underline">
              Kayıt ol
            </Link>
          </>
        ) : (
          <>
            Zaten hesabın var mı?{" "}
            <Link href={next ? `/giris?sonra=${encodeURIComponent(next)}` : "/giris"} className="font-semibold text-rose-600 hover:underline">
              Giriş yap
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

export function ForgotPasswordForm({
  action,
}: {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          E-posta
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>
      <Feedback state={state} />
      <SubmitButton className="w-full" pendingText="Gönderiliyor…">
        Sıfırlama bağlantısı gönder
      </SubmitButton>
      <p className="text-center text-sm text-slate-600">
        <Link href="/giris" className="font-semibold text-rose-600 hover:underline">
          ← Girişe dön
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({
  action,
}: {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Yeni şifre
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
          Yeni şifre (tekrar)
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-500">{PASSWORD_HINT}</p>
      </div>
      <Feedback state={state} />
      <SubmitButton className="w-full" pendingText="Kaydediliyor…">
        Şifreyi kaydet
      </SubmitButton>
    </form>
  );
}
