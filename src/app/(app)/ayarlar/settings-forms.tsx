"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { ACCOUNT_DELETE_CONFIRMATION, PASSWORD_HINT } from "@/core/account/security";
import type { DetailLevel } from "@/core/ai/intake";
import {
  changePasswordAction,
  clearAllMemoriesAction,
  deleteAccountAction,
  updateDisplayNameAction,
  updateEmailAction,
  updatePreferencesAction,
  type SettingsState,
} from "./actions";

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none";

function Feedback({ state }: { state: SettingsState }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {state.message}
      </p>
    );
  return null;
}

// ------------------------------------------------------------------ hesap

export function DisplayNameForm({ displayName }: { displayName: string }) {
  const [state, action] = useActionState(updateDisplayNameAction, {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-slate-800">
          Görünen ad
        </label>
        <input id="displayName" name="displayName" maxLength={80} defaultValue={displayName} className={inputClass} />
        <p className="mt-1 text-xs text-slate-500">Panelde sana bu adla hitap ederiz.</p>
      </div>
      <Feedback state={state} />
      <SubmitButton pendingText="Kaydediliyor…">Kaydet</SubmitButton>
    </form>
  );
}

export function EmailForm({ email }: { email: string }) {
  const [state, action] = useActionState(updateEmailAction, {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-800">
          E-posta adresi
        </label>
        <input id="email" name="email" type="email" required defaultValue={email} autoComplete="email" className={inputClass} />
        <p className="mt-1 text-xs text-slate-500">
          Değiştirirsen yeni adrese bir onay bağlantısı gönderilir; onaylanana kadar mevcut adresin geçerli kalır.
        </p>
      </div>
      <Feedback state={state} />
      <SubmitButton pendingText="Gönderiliyor…">E-postayı değiştir</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------- güvenlik

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-800">
          Mevcut şifre
        </label>
        <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className={inputClass} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-slate-800">
            Yeni şifre
          </label>
          <input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-800">
            Yeni şifre (tekrar)
          </label>
          <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </div>
      </div>
      <p className="text-xs text-slate-500">{PASSWORD_HINT}</p>
      <Feedback state={state} />
      <SubmitButton pendingText="Güncelleniyor…">Şifreyi değiştir</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------- kişiselleştirme

function Toggle({
  name,
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start justify-between gap-4 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <span>
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        <span className="block text-sm text-slate-600">{description}</span>
      </span>
      <span className="relative mt-1 inline-flex shrink-0">
        <input
          type="checkbox"
          name={name}
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/40" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function PreferencesForm({
  personalizationEnabled,
  autoRemember,
  defaultDetail,
  defaultProfileId,
  profiles,
}: {
  personalizationEnabled: boolean;
  autoRemember: boolean;
  defaultDetail: DetailLevel;
  defaultProfileId: string | null;
  profiles: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(updatePreferencesAction, {});
  const [personal, setPersonal] = useState(personalizationEnabled);
  const [remember, setRemember] = useState(autoRemember);

  return (
    <form action={action} className="space-y-5">
      <Toggle
        name="personalizationEnabled"
        checked={personal}
        onChange={setPersonal}
        label="Kişiselleştirme (profiller ve hafıza)"
        description="Açıkken plan oluştururken profillerini seçebilir, uygulamanın seni hatırlamasını sağlayabilirsin. Kapalıyken her plan yalnızca o an verdiğin bilgilerle hazırlanır."
      />
      <Toggle
        name="autoRemember"
        checked={personal && remember}
        onChange={setRemember}
        disabled={!personal}
        label="Yeni bilgileri otomatik hatırla"
        description="Bir profille oluşturduğun planda soruları cevapladığında, cevaplar o profilin hafızasına eklenir. Hafızayı profil sayfasından görebilir ve silebilirsin."
      />
      {!personal && <input type="hidden" name="autoRemember" value={remember ? "on" : ""} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="defaultDetail" className="block text-sm font-medium text-slate-800">
            Varsayılan plan uzunluğu
          </label>
          <select id="defaultDetail" name="defaultDetail" defaultValue={defaultDetail} className={inputClass}>
            <option value="summary">Özet plan (daha hızlı)</option>
            <option value="detailed">Detaylı plan</option>
          </select>
        </div>
        <div>
          <label htmlFor="defaultProfileId" className="block text-sm font-medium text-slate-800">
            Varsayılan profil
          </label>
          <select
            id="defaultProfileId"
            name="defaultProfileId"
            defaultValue={defaultProfileId ?? ""}
            disabled={!personal}
            className={inputClass}
          >
            <option value="">Seçili gelmesin</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {!personal && <input type="hidden" name="defaultProfileId" value={defaultProfileId ?? ""} />}
        </div>
      </div>

      <Feedback state={state} />
      <SubmitButton pendingText="Kaydediliyor…">Ayarları kaydet</SubmitButton>
    </form>
  );
}

// ----------------------------------------------------------- veri & gizlilik

export function ClearMemoriesForm() {
  const [state, action] = useActionState(clearAllMemoriesAction, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Tüm profillerindeki hafıza kayıtları kalıcı olarak silinsin mi?")) e.preventDefault();
      }}
      className="space-y-3"
    >
      <Feedback state={state} />
      <SubmitButton className="!bg-white !text-red-700 ring-1 ring-red-300 hover:!bg-red-50" pendingText="Siliniyor…">
        Tüm hafızayı sil
      </SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, {});
  const [confirmation, setConfirmation] = useState("");

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="confirmation" className="block text-sm font-medium text-slate-800">
          Onaylamak için <strong>{ACCOUNT_DELETE_CONFIRMATION}</strong> yaz
        </label>
        <input
          id="confirmation"
          name="confirmation"
          autoComplete="off"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="deletePassword" className="block text-sm font-medium text-slate-800">
          Şifren
        </label>
        <input id="deletePassword" name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </div>
      <Feedback state={state} />
      <SubmitButton
        disabled={confirmation !== ACCOUNT_DELETE_CONFIRMATION}
        className="!bg-red-600 hover:!bg-red-500"
        pendingText="Hesap siliniyor…"
      >
        Hesabımı kalıcı olarak sil
      </SubmitButton>
    </form>
  );
}
