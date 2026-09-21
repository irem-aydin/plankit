import { StatusLink, StatusMessage } from "@/components/status-message";

export default function OutputNotFound() {
  return (
    <StatusMessage
      icon="📄"
      title="Plan bulunamadı"
      text="Bu plan silinmiş olabilir ya da başka bir hesaba ait. Planlarım sayfasından planlarına ulaşabilirsin."
    >
      <StatusLink href="/ciktilar" primary>
        Planlarım
      </StatusLink>
      <StatusLink href="/olustur">Yeni plan oluştur</StatusLink>
    </StatusMessage>
  );
}
