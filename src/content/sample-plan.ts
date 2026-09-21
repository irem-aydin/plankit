/**
 * Örnek plan: yeni kullanıcıya, hakkını harcamadan "ne alacağım?" sorusunun
 * cevabını göstermek için. Kurgusal bir işletmedir; gerçek kullanıcı verisi
 * içermez. Gerçek bir üretimle aynı yapıdadır (generatedDocumentSchema).
 */
import type { GeneratedDocument } from "@/core/output/document";

const MODEL = "örnek";

export const SAMPLE_PLAN: GeneratedDocument = {
  schemaVersion: 1,
  title: "Mavi Fincan Kahve — İkinci Şube Kararı",
  generatedAt: "2026-09-15T10:00:00.000Z",
  missing: [],
  attachments: [],
  context: {
    mode: "free",
    detail: "summary",
    language: "tr",
    entries: [
      {
        question: "Kullanıcının kendi anlatımı",
        answer:
          "İzmir Alsancak'ta 3 yıldır 40 kişilik bir kahve dükkânı işletiyoruz. Aylık ciro ortalama 520.000 TL, hafta sonları kapasite doluyor. Bornova'da üniversiteye yakın bir dükkân kiralık çıktı (aylık 65.000 TL). Elimizde 1,8 milyon TL birikim var. İkinci şubeyi açmalı mıyız, yoksa mevcut dükkâna paket servis ve kavrulmuş çekirdek satışı mı eklemeliyiz? Ekip: ben, ortağım ve 6 çalışan.",
      },
    ],
  },
  sections: [
    {
      subcategoryId: "ornek-strateji",
      subcategoryName: "Strateji Analizi",
      categoryId: "ornek-is-analizi",
      categoryName: "İş Analizi",
      templateId: "ornek",
      templateVersion: 1,
      personalization: {
        model: MODEL,
        keyFindings: [
          "Alsancak dükkânı hafta sonu kapasitede; büyüme talebi var ama hafta içi doluluk bilinmiyor. Karar bu veriye bağlı.",
          "Bornova şubesinin tahmini kurulum maliyeti (≈1,4 milyon TL) birikimin %78'ini tüketiyor; beklenmedik giderler için pay çok az kalıyor.",
          "Paket servis + çekirdek satışı, kurulum maliyetinin yaklaşık onda biriyle 2-3 ayda test edilebilir. Önerilen yol: önce düşük riskli büyüme, 6 ay sonra şube kararı.",
        ],
        assumptions: [
          "Kurulum maliyeti (tadilat, ekipman, depozito) sektör ortalamasına göre tahmin edildi; teklif alınmadı.",
          "Bornova'da öğrenci ağırlıklı müşterinin sepet ortalaması Alsancak'tan %25 düşük kabul edildi.",
          "Mevcut kâr marjı %18 varsayıldı (anlatımda belirtilmedi).",
        ],
        openQuestions: [
          "Hafta içi ortalama doluluk oranınız nedir?",
          "Mevcut aylık net kârınız yaklaşık ne kadar?",
          "Bornova dükkânının kira sözleşmesi kaç yıllık ve kira artış koşulu ne?",
          "Ortağınızla birlikte ikinci şubeyi kimin yöneteceği belli mi?",
        ],
      },
      body: {
        kind: "template",
        summary:
          "İkinci şube ile mevcut dükkânı büyütme seçeneklerinin maliyet, risk ve getiri açısından karşılaştırması ve 6 aylık aksiyon planı.",
        sections: [
          {
            id: "durum",
            title: "Mevcut Durum",
            fields: [
              {
                id: "ozet",
                label: "İşletme özeti",
                type: "textarea",
                value:
                  "3 yıllık, 40 kişilik kahve dükkânı (Alsancak). Aylık ciro ≈520.000 TL; hafta sonları tam kapasite. 2 ortak + 6 çalışan. Kullanılabilir birikim 1,8 milyon TL.",
              },
              {
                id: "karar",
                label: "Verilmesi gereken karar",
                type: "textarea",
                value:
                  "Büyüme için (A) Bornova'da ikinci şube mi açılmalı, yoksa (B) mevcut dükkâna paket servis ve kavrulmuş çekirdek satışı mı eklenmeli?",
              },
            ],
          },
          {
            id: "swot",
            title: "SWOT Analizi",
            fields: [],
            table: {
              columns: [
                { id: "faktor", label: "Faktör", type: "text" },
                { id: "tur", label: "Tür", type: "select", options: ["Güçlü yön", "Zayıf yön", "Fırsat", "Tehdit"] },
                { id: "etki", label: "Etki", type: "select", options: ["Yüksek", "Orta", "Düşük"] },
              ],
              exampleRows: [],
              rows: [
                { faktor: "Hafta sonu tam kapasite, sadık müşteri kitlesi", tur: "Güçlü yön", etki: "Yüksek" },
                { faktor: "3 yıllık işletme deneyimi ve oturmuş tedarikçiler", tur: "Güçlü yön", etki: "Orta" },
                { faktor: "Yönetim iki ortağa bağlı; ikinci şubede yönetici açığı", tur: "Zayıf yön", etki: "Yüksek" },
                { faktor: "Hafta içi doluluk verisi takip edilmiyor", tur: "Zayıf yön", etki: "Orta" },
                { faktor: "Bornova'da üniversite çevresinde yoğun yaya trafiği", tur: "Fırsat", etki: "Yüksek" },
                { faktor: "Paket kahve ve çekirdek satışında artan talep", tur: "Fırsat", etki: "Orta" },
                { faktor: "Kira ve süt/kahve fiyatlarındaki hızlı artış", tur: "Tehdit", etki: "Yüksek" },
                { faktor: "Bornova'da zincir kahvecilerin yoğunluğu", tur: "Tehdit", etki: "Orta" },
              ],
            },
          },
          {
            id: "alternatifler",
            title: "Alternatiflerin Karşılaştırması",
            fields: [],
            table: {
              columns: [
                { id: "secenek", label: "Seçenek", type: "text" },
                { id: "maliyet", label: "Tahmini maliyet", type: "text" },
                { id: "arti", label: "Artıları", type: "text" },
                { id: "eksi", label: "Eksileri", type: "text" },
                { id: "sonuc", label: "Değerlendirme", type: "select", options: ["Önerilen", "Koşullu", "Önerilmez"] },
              ],
              exampleRows: [],
              rows: [
                {
                  secenek: "A) Bornova'da ikinci şube",
                  maliyet: "≈1,4 milyon TL kurulum + 65.000 TL/ay kira (tahmini)",
                  arti: "Ciroyu iki katına çıkarma potansiyeli; yeni müşteri kitlesi",
                  eksi: "Birikimin çoğu bağlanır; yönetici bulunmazsa kalite düşer; başabaş noktası 14-18 ay",
                  sonuc: "Koşullu",
                },
                {
                  secenek: "B) Paket servis + çekirdek satışı",
                  maliyet: "≈150.000 TL (paketleme, öğütücü, platform komisyonu)",
                  arti: "Düşük risk; 2-3 ayda sonuç verir; mevcut ekip yeterli",
                  eksi: "Büyüme potansiyeli sınırlı (tahmini +%15-20 ciro)",
                  sonuc: "Önerilen",
                },
                {
                  secenek: "C) Önce B, 6 ay sonra A'yı yeniden değerlendir",
                  maliyet: "B'nin maliyeti; A için birikim korunur",
                  arti: "Veriye dayalı karar; yönetici adayı bu sürede yetiştirilebilir",
                  eksi: "Bornova'daki bu dükkân kaçabilir",
                  sonuc: "Önerilen",
                },
              ],
            },
          },
          {
            id: "aksiyon",
            title: "Aksiyon Planı (ilk 6 ay)",
            fields: [],
            table: {
              columns: [
                { id: "adim", label: "Adım", type: "text" },
                { id: "sorumlu", label: "Sorumlu", type: "text" },
                { id: "tarih", label: "Hedef tarih", type: "text" },
                { id: "olcut", label: "Başarı ölçütü", type: "text" },
              ],
              exampleRows: [],
              rows: [
                { adim: "Kasa sisteminden saatlik doluluk ve ciro raporu almaya başla", sorumlu: "Ortak 1", tarih: "1. hafta", olcut: "4 haftalık veri" },
                { adim: "Paket servis platformlarına kayıt ve paketleme tedariki", sorumlu: "Ortak 2", tarih: "1. ay", olcut: "Platformda aktif menü" },
                { adim: "250 g kavrulmuş çekirdek paketlerini kasaya ve online satışa koy", sorumlu: "Ortak 1", tarih: "2. ay", olcut: "Ayda 300 paket" },
                { adim: "Kıdemli bir çalışanı vardiya sorumlusu olarak yetiştir", sorumlu: "Ortak 2", tarih: "2-5. ay", olcut: "Ortaklar olmadan 1 hafta sorunsuz işletme" },
                { adim: "Bornova için 3 kurulum teklifi al, kira koşullarını netleştir", sorumlu: "Ortak 1", tarih: "4. ay", olcut: "Teklifler ve sözleşme taslağı" },
                { adim: "Karar toplantısı: veriler hedefi tuttuysa ikinci şubeye geç", sorumlu: "İki ortak", tarih: "6. ay", olcut: "Yazılı karar ve bütçe" },
              ],
            },
          },
          {
            id: "riskler",
            title: "Riskler ve Önlemler",
            fields: [],
            table: {
              columns: [
                { id: "risk", label: "Risk", type: "text" },
                { id: "olasilik", label: "Olasılık", type: "select", options: ["Yüksek", "Orta", "Düşük"] },
                { id: "etki", label: "Etki", type: "select", options: ["Yüksek", "Orta", "Düşük"] },
                { id: "onlem", label: "Önlem", type: "text" },
              ],
              exampleRows: [],
              rows: [
                { risk: "Paket servis komisyonları kârı eritir", olasilik: "Orta", etki: "Orta", onlem: "Platform fiyatlarını %15 yüksek belirle; kendi sipariş hattını tanıt" },
                { risk: "Bornova dükkânı başkasına kiralanır", olasilik: "Orta", etki: "Yüksek", onlem: "Bölgede 2 alternatif dükkânı da takipte tut; bu dükkâna bağımlı kalma" },
                { risk: "Maliyet artışları marjı düşürür", olasilik: "Yüksek", etki: "Yüksek", onlem: "Çeyrek başı menü fiyat gözden geçirmesi; tedarikçiyle 6 aylık fiyat anlaşması" },
              ],
            },
          },
        ],
      },
    },
  ],
};
