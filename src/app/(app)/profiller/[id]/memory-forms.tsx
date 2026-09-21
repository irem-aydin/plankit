"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { ProfileFormState } from "../actions";

export function AddMemoryForm({
  action,
}: {
  action: (prev: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
}) {
  const [state, formAction] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-5">
      <label htmlFor="memory-content" className="block text-sm font-medium text-slate-800">
        Hatırlanmasını istediğin bir bilgi ekle
      </label>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <textarea
          id="memory-content"
          name="content"
          rows={1}
          maxLength={2000}
          required
          placeholder="Örn. Yıllık pazarlama bütçemiz 2027 için 1,2 milyon TL olarak onaylandı."
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm field-sizing-content focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
        />
        <SubmitButton pendingText="Ekleniyor…" className="shrink-0">
          Ekle
        </SubmitButton>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
    </form>
  );
}

export function ConfirmSubmit({
  children,
  message,
  className,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
