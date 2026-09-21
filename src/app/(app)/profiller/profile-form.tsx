"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import {
  PROFILE_FIELDS,
  PROFILE_KIND_META,
  PROFILE_KINDS,
  type ContextProfile,
  type ProfileKind,
} from "@/core/profile/profile";
import type { ProfileFormState } from "./actions";

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none";

export function ProfileForm({
  action,
  profile,
  initialKind,
}: {
  action: (prev: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  profile?: ContextProfile;
  initialKind?: ProfileKind;
}) {
  const [state, formAction] = useActionState(action, {});
  const [kind, setKind] = useState<ProfileKind>(profile?.kind ?? initialKind ?? "work");

  return (
    <form action={formAction} className="space-y-6">
      {!profile && (
        <fieldset>
          <legend className="text-sm font-medium text-slate-800">Bu profil ne için?</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {PROFILE_KINDS.map((k) => (
              <label
                key={k}
                className={`flex cursor-pointer gap-3 rounded-xl border bg-white p-4 transition ${
                  kind === k ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="mt-1 accent-rose-600"
                />
                <span>
                  <span className="block font-semibold text-slate-900">
                    {PROFILE_KIND_META[k].icon} {PROFILE_KIND_META[k].label}
                  </span>
                  <span className="block text-sm text-slate-600">{PROFILE_KIND_META[k].description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {profile && <input type="hidden" name="kind" value={profile.kind} />}

      <div>
        <label htmlFor="profile-name" className="block text-sm font-medium text-slate-800">
          Profil adı
        </label>
        <input
          id="profile-name"
          name="name"
          required
          maxLength={80}
          defaultValue={profile?.name}
          placeholder={kind === "work" ? "Örn. İş yerim – Ege Zeytincilik" : "Örn. Kariyer planım"}
          className={inputClass}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {PROFILE_FIELDS[kind].map((field) => (
          <div key={`${kind}-${field.id}`} className={field.multiline ? "sm:col-span-2" : ""}>
            <label htmlFor={`f-${field.id}`} className="block text-sm font-medium text-slate-800">
              {field.label}
            </label>
            {field.multiline ? (
              <textarea
                id={`f-${field.id}`}
                name={`d.${field.id}`}
                rows={2}
                maxLength={2000}
                defaultValue={profile?.details[field.id]}
                placeholder={field.placeholder}
                className={`${inputClass} field-sizing-content min-h-16`}
              />
            ) : (
              <input
                id={`f-${field.id}`}
                name={`d.${field.id}`}
                maxLength={2000}
                defaultValue={profile?.details[field.id]}
                placeholder={field.placeholder}
                className={inputClass}
              />
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Tüm alanlar isteğe bağlı. Ne kadar çok bilgi verirsen planlar o kadar kişisel olur. Bu bilgiler yalnızca senin
        hesabında saklanır ve yalnızca plan oluştururken kullanılır.
      </p>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Profil kaydedildi.
        </p>
      )}

      <SubmitButton pendingText="Kaydediliyor…">{profile ? "Değişiklikleri kaydet" : "Profili oluştur"}</SubmitButton>
    </form>
  );
}
