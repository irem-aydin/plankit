"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { Project } from "@/core/project/project";
import type { ProjectFormState } from "./actions";

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none";

export function ProjectForm({
  action,
  project,
  profiles,
  initialProfileId = "",
}: {
  action: (prev: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  project?: Project;
  profiles: { id: string; name: string }[];
  /** Profil sayfasından gelindiyse önceden seçili profil */
  initialProfileId?: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="project-name" className="block text-sm font-medium text-slate-800">
          Proje adı
        </label>
        <input
          id="project-name"
          name="name"
          required
          maxLength={80}
          defaultValue={project?.name}
          placeholder="Örn. Yeni şube açılışı"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="project-description" className="block text-sm font-medium text-slate-800">
          Açıklama <span className="font-normal text-slate-500">(isteğe bağlı)</span>
        </label>
        <textarea
          id="project-description"
          name="description"
          rows={2}
          maxLength={500}
          defaultValue={project?.description}
          placeholder="Bu projede neyi hedefliyorsun?"
          className={`${inputClass} field-sizing-content min-h-16`}
        />
      </div>

      <div>
        <label htmlFor="project-profile" className="block text-sm font-medium text-slate-800">
          Bu proje kimin için? <span className="font-normal text-slate-500">(isteğe bağlı)</span>
        </label>
        <select
          id="project-profile"
          name="profileId"
          defaultValue={project?.profileId ?? initialProfileId}
          className={`${inputClass} sm:max-w-sm`}
        >
          <option value="">Profil yok</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              🧠 {p.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          {profiles.length === 0
            ? "Henüz profilin yok. Profil oluşturursan projedeki planlar seni tanıyarak hazırlanır."
            : "Bu projede plan oluştururken profil otomatik seçilir; yapay zekâ profil bilgilerini ve proje açıklamasını birlikte kullanır."}
        </p>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Proje kaydedildi.
        </p>
      )}

      <SubmitButton pendingText="Kaydediliyor…">{project ? "Değişiklikleri kaydet" : "Projeyi oluştur"}</SubmitButton>
    </form>
  );
}
