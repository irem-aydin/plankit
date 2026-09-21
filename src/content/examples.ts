/**
 * Herkese açık örnek plan galerisi (/ornekler). Her örnek kurgusal bir
 * senaryodur; içerikleri scripts/generate-examples.mts ile gerçek plan
 * motorundan bir kez üretilip src/content/examples/<slug>.json olarak
 * kaydedilir ve elle gözden geçirilir. Sayfalar arama motorlarına açıktır.
 */
import type { CategorySlug } from "@/core/ai/preview";

export interface ExampleMeta {
  slug: string;
  category: CategorySlug;
  /** Sayfa başlığı (arama sonuçlarında görünür) */
  title: string;
  /** Arama sonuçlarındaki açıklama; 150-160 karakter civarı */
  description: string;
  /** Plan motoruna verilen serbest istek (ve "bu şablonla başla" ön doldurması) */
  request: string;
  /** Kurgusal durum anlatımı */
  scenario: string;
}

export const EXAMPLES: ExampleMeta[] = [
  {
    slug: "swot-analizi-ornegi",
    category: "is-analizi",
    title: "SWOT Analizi Örneği: Mahalle Fırını",
    description:
      "Bir mahalle fırını için hazırlanmış örnek SWOT analizi: güçlü ve zayıf yönler, fırsatlar, tehditler ve bunlardan çıkan strateji önerileri.",
    request: "Mahalle fırınım için SWOT analizi ve buna dayalı strateji önerileri",
    scenario:
      "Ankara Çankaya'da 12 yıldır açık, 6 çalışanlı bir mahalle fırınıyız. Ekmek ve simit satışlarımız sabit ama zincir marketlerin taze ekmek reyonları ve online sipariş uygulamaları nedeniyle yeni müşteri kazanamıyoruz. Aylık ciromuz yaklaşık 450.000 TL. Ekşi mayalı ekmek ve pastane ürünlerine talep görüyoruz ama fırın kapasitemiz sınırlı. Önümüzdeki 1 yıl için yön belirlemek istiyoruz.",
  },
  {
    slug: "paydas-analizi-ornegi",
    category: "is-analizi",
    title: "Paydaş Analizi Örneği: Hastane Randevu Sistemi Yenileme",
    description:
      "Özel bir hastanenin randevu sistemi yenileme projesi için örnek paydaş analizi: güç/ilgi matrisi, beklentiler, riskler ve iletişim planı.",
    request: "Randevu sistemi yenileme projesi için paydaş analizi ve iletişim planı",
    scenario:
      "İzmir'de 180 yataklı özel bir hastanede bilgi işlem müdürüyüm. 10 yıllık randevu sistemimizi yeni bir bulut tabanlı sistemle değiştireceğiz. Hekimler, çağrı merkezi, hasta hakları birimi, yönetim kurulu, BT ekibi, yazılım tedarikçisi ve hastalar etkilenecek. Bazı kıdemli hekimler değişime dirençli. Proje 8 ay sürecek.",
  },
  {
    slug: "proje-berati-ornegi",
    category: "proje-yonetimi",
    title: "Proje Beratı Örneği: E-ticaret Ödeme Altyapısı Yenileme",
    description:
      "E-ticaret şirketi için örnek proje beratı (project charter): amaç, kapsam, hedefler, başarı ölçütleri, paydaşlar, bütçe, kilometre taşları ve riskler.",
    request: "Ödeme altyapısı yenileme projesi için proje beratı (project charter)",
    scenario:
      "Ev tekstili satan, aylık 25.000 siparişi olan bir e-ticaret şirketiyiz. Mevcut ödeme altyapımızda sepet terk oranı %71 ve ödeme hataları sık. Yeni bir ödeme sağlayıcısına geçip taksit, cüzdan ve tek tıkla ödeme eklemek istiyoruz. Bütçe 1,2 milyon TL, süre 5 ay. Ekip: 1 proje yöneticisi, 3 yazılımcı, 1 test uzmanı, 1 tasarımcı.",
  },
  {
    slug: "risk-yonetim-plani-ornegi",
    category: "proje-yonetimi",
    title: "Risk Yönetim Planı Örneği: Ofis Taşınma Projesi",
    description:
      "120 kişilik bir şirketin ofis taşınma projesi için örnek risk yönetim planı: risk kaydı, olasılık ve etki değerlendirmesi, önlemler ve sorumlular.",
    request: "Ofis taşınma projesi için risk yönetim planı ve risk kaydı",
    scenario:
      "120 çalışanlı bir yazılım şirketiyiz. 3 ay sonra İstanbul Maslak'taki ofisimizden Levent'teki yeni ofise taşınacağız. Sunucu odası, ağ altyapısı, mobilya, kira sözleşmesi devri ve çalışanların uyumu gibi konular var. Taşınma sırasında müşterilerimize hizmet kesintisi olmamalı. Taşınma bütçesi 2,5 milyon TL.",
  },
  {
    slug: "urun-gereksinim-dokumani-prd-ornegi",
    category: "urun-yonetimi",
    title: "PRD Örneği: Mobil Uygulamaya Abonelik Özelliği",
    description:
      "Mobil fitness uygulaması için örnek ürün gereksinim dokümanı (PRD): problem, hedefler, kullanıcı hikâyeleri, gereksinimler, başarı metrikleri ve kapsam dışı.",
    request: "Mobil uygulamamıza premium abonelik özelliği için PRD (ürün gereksinim dokümanı)",
    scenario:
      "80.000 aktif kullanıcısı olan ücretsiz bir mobil fitness uygulamasıyız. Gelirimiz yalnızca reklamdan geliyor ve yetersiz. Kişisel antrenman programları, reklamsız kullanım ve beslenme takibi içeren aylık 149 TL'lik premium abonelik eklemek istiyoruz. iOS ve Android için. İlk 6 ayda kullanıcıların %4'ünü aboneye çevirmeyi hedefliyoruz.",
  },
  {
    slug: "urun-yol-haritasi-ornegi",
    category: "urun-yonetimi",
    title: "Ürün Yol Haritası Örneği: KOBİ Muhasebe Yazılımı",
    description:
      "B2B SaaS muhasebe yazılımı için 12 aylık örnek ürün yol haritası: temalar, çeyreklik hedefler, öncelikler, bağımlılıklar ve başarı ölçütleri.",
    request: "KOBİ muhasebe yazılımımız için 12 aylık ürün yol haritası",
    scenario:
      "KOBİ'lere bulut tabanlı ön muhasebe yazılımı sunuyoruz; 3.200 ücretli müşterimiz var. Müşteriler e-fatura/e-arşiv entegrasyonunda sorun yaşıyor, mobil uygulamamız yok ve banka entegrasyonları eksik. Rakipler yapay zekâ ile gider sınıflandırma sunmaya başladı. Ürün ekibimiz 12 kişi. Önümüzdeki 12 ayın önceliklerini belirlemek istiyoruz.",
  },
  {
    slug: "satis-stratejisi-ornegi",
    category: "is-gelistirme",
    title: "Satış Stratejisi Örneği: Endüstriyel Ekipman Distribütörü",
    description:
      "Endüstriyel ekipman distribütörü için örnek satış stratejisi: hedef segmentler, satış kanalları, fiyatlandırma, satış ekibi yapısı, hedefler ve aksiyon planı.",
    request: "Endüstriyel kompresör distribütörlüğümüz için satış stratejisi",
    scenario:
      "Bursa'da endüstriyel kompresör ve yedek parça distribütörüyüz. Yıllık ciromuz 85 milyon TL, müşterilerimizin %70'i otomotiv yan sanayi. 4 kişilik saha satış ekibimiz var ve satışlar büyük ölçüde mevcut müşterilere tekrar satıştan geliyor. Gıda ve ilaç sektörüne açılmak, bakım sözleşmesi gelirlerini artırmak istiyoruz. Hedef: 2 yılda ciroyu %40 büyütmek.",
  },
  {
    slug: "pazara-giris-plani-ornegi",
    category: "is-gelistirme",
    title: "Pazara Giriş Planı Örneği: Zeytinyağı İhracatı (Almanya)",
    description:
      "Aile şirketinin Almanya'ya zeytinyağı ihracatı için örnek pazara giriş planı: pazar analizi, giriş stratejisi, kanal seçimi, mevzuat, bütçe ve takvim.",
    request: "Zeytinyağımızı Almanya pazarına sokmak için pazara giriş planı",
    scenario:
      "Ayvalık'ta 3 kuşaktır zeytinyağı üreten bir aile şirketiyiz. Yıllık 180 ton sızma zeytinyağı üretiyoruz, tamamını yurt içinde satıyoruz. Almanya'daki Türk ve Alman tüketicilere premium şişelenmiş ürünle girmek istiyoruz. İhracat deneyimimiz yok. İlk yıl için ayırabileceğimiz bütçe 1,5 milyon TL.",
  },
];

export function findExample(slug: string): ExampleMeta | undefined {
  return EXAMPLES.find((e) => e.slug === slug);
}
