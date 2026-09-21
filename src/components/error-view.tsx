"use client";

import { useEffect } from "react";
import { StatusLink, StatusMessage } from "./status-message";

/** error.tsx dosyalarının ortak içeriği. Teknik ayrıntı kullanıcıya gösterilmez. */
export function ErrorView({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusMessage
      icon="⚠️"
      title="Bir şeyler ters gitti"
      text="Sayfa yüklenirken beklenmeyen bir sorun oluştu. Genellikle geçicidir; birkaç saniye sonra tekrar dene."
    >
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Tekrar dene
      </button>
      <StatusLink href="/panel">Panele dön</StatusLink>
      {error.digest && <p className="w-full text-xs text-slate-400">Hata kodu: {error.digest}</p>}
    </StatusMessage>
  );
}
