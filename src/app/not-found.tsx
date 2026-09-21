import type { Metadata } from "next";
import { StatusLink, StatusMessage } from "@/components/status-message";

export const metadata: Metadata = { title: "Sayfa bulunamadı" };

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <StatusMessage
        icon="🧭"
        title="Bu sayfa bulunamadı"
        text="Adres yanlış yazılmış ya da sayfa kaldırılmış olabilir."
      >
        <StatusLink href="/panel" primary>
          Panele dön
        </StatusLink>
        <StatusLink href="/">Ana sayfa</StatusLink>
      </StatusMessage>
    </main>
  );
}
