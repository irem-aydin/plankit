-- =====================================================================
-- Sahada en çok kullanılan 5 çıktı için elle hazırlanmış şablonlar:
-- Proje Beratı, İş Kırılım Yapısı (WBS), RACI Matrisi, Proje Durum Raporu,
-- Ürün Gereksinim Dokümanı (PRD).
-- Ayrıca plan/analiz niteliğindeki başlıkların çıktı tipi düzeltilir.
-- =====================================================================

-- Doldurulabilir tablo/alan yapısı bu başlıklarda checklist veya rehberden daha uygun
update public.subcategories s
set output_type = 'template'
from public.categories c
where c.id = s.category_id
  and (c.slug, s.slug) in (
    ('proje-yonetimi', 'sprint-planlama'),
    ('urun-yonetimi', 'go-to-market'),
    ('urun-yonetimi', 'surum-plani'),
    ('urun-yonetimi', 'urun-stratejisi'),
    ('urun-yonetimi', 'fiyatlandirma-paketleme'),
    ('urun-yonetimi', 'urun-yasam-dongusu'),
    ('is-gelistirme', 'satis-pipeline'),
    ('is-gelistirme', 'ortaklik-teklifi'),
    ('is-gelistirme', 'yeni-pazara-giris'),
    ('is-gelistirme', 'gelir-modeli'),
    ('is-gelistirme', 'birlesme-satin-alma')
  );

-- ---------------------------------------------------------------------
-- 1) Proje Beratı (Project Charter)
-- ---------------------------------------------------------------------
insert into public.output_templates (subcategory_id, version, content)
select s.id, 1, $json$
{
  "kind": "template",
  "summary": "Projeyi resmen başlatan, amacını ve sınırlarını tek sayfada netleştiren doküman. Sponsor onayıyla yürürlüğe girer; kapsam tartışmalarında başvurulacak referanstır.",
  "sections": [
    {
      "id": "identity",
      "title": "1. Proje Künyesi",
      "description": "Projenin kimlik bilgileri. Berat onaylandıktan sonra bu bilgiler değişiklik talebiyle güncellenir.",
      "fields": [
        { "id": "project_name", "label": "Proje adı", "type": "text" },
        { "id": "sponsor", "label": "Sponsor (bütçe sahibi)", "type": "text" },
        { "id": "manager", "label": "Proje yöneticisi", "type": "text" },
        { "id": "dates", "label": "Planlanan başlangıç ve bitiş", "type": "text", "placeholder": "Örn. 01.10.2026 – 30.06.2027" },
        { "id": "budget", "label": "Onaylanan bütçe", "type": "text" },
        { "id": "priority", "label": "Kurumsal öncelik", "type": "select", "options": ["Kritik", "Yüksek", "Orta", "Düşük"] }
      ]
    },
    {
      "id": "purpose",
      "title": "2. Amaç ve İş Gerekçesi",
      "description": "Bu proje neden yapılıyor? Yapılmazsa ne olur? Gerekçeyi mümkünse rakamla ifade edin.",
      "fields": [
        { "id": "problem", "label": "Çözülecek problem / yakalanacak fırsat", "type": "textarea" },
        { "id": "objective", "label": "Projenin amacı", "type": "textarea", "help": "Tek cümlede: ne yapılacak ve ne sağlanacak." },
        { "id": "benefits", "label": "Beklenen fayda ve ölçütü", "type": "textarea", "placeholder": "Örn. Sipariş işleme süresi 48 saatten 8 saate iner; yıllık ~1,2 milyon TL işçilik tasarrufu" },
        { "id": "do_nothing", "label": "Yapılmazsa maliyeti", "type": "textarea" }
      ]
    },
    {
      "id": "scope",
      "title": "3. Kapsam ve Teslimatlar",
      "description": "Kapsam dışını yazmak, kapsam içini yazmak kadar önemlidir. Her teslimatın kabul kriteri olmalıdır.",
      "fields": [
        { "id": "in_scope", "label": "Kapsam içi", "type": "textarea" },
        { "id": "out_scope", "label": "Kapsam dışı", "type": "textarea" }
      ],
      "table": {
        "columns": [
          { "id": "deliverable", "label": "Ana teslimat" },
          { "id": "description", "label": "Açıklama" },
          { "id": "acceptance", "label": "Kabul kriteri" },
          { "id": "due", "label": "Hedef tarih" }
        ],
        "emptyRows": 4,
        "exampleRows": [
          { "deliverable": "Yeni sipariş ekranı", "description": "Bayilerin sipariş girdiği web arayüzü", "acceptance": "10 bayi ile UAT tamamlandı, kritik hata yok", "due": "15.02.2027" }
        ]
      }
    },
    {
      "id": "milestones",
      "title": "4. Kilometre Taşları",
      "description": "Faz geçişleri ve karar noktaları. Detaylı takvim ayrı dokümanda tutulur.",
      "table": {
        "columns": [
          { "id": "milestone", "label": "Kilometre taşı" },
          { "id": "date", "label": "Tarih" },
          { "id": "output", "label": "Çıktı / karar" }
        ],
        "emptyRows": 4,
        "exampleRows": []
      }
    },
    {
      "id": "stakeholders",
      "title": "5. Paydaşlar ve Karar Yetkileri",
      "description": "Kim karar verir, kim onaylar, kim bilgilendirilir? Karar yetkisi belirsizse proje gecikir.",
      "table": {
        "columns": [
          { "id": "name", "label": "Paydaş / rol" },
          { "id": "unit", "label": "Birim" },
          { "id": "responsibility", "label": "Projedeki sorumluluğu" },
          { "id": "authority", "label": "Karar yetkisi", "type": "select", "options": ["Onaylar", "Danışılır", "Bilgilendirilir"] }
        ],
        "emptyRows": 4,
        "exampleRows": []
      }
    },
    {
      "id": "budget_resources",
      "title": "6. Bütçe ve Kaynaklar",
      "table": {
        "columns": [
          { "id": "item", "label": "Kalem" },
          { "id": "amount", "label": "Tahmini tutar" },
          { "id": "source", "label": "Kaynak / bütçe kodu" },
          { "id": "note", "label": "Not" }
        ],
        "emptyRows": 3,
        "exampleRows": []
      },
      "fields": [
        { "id": "team", "label": "Ekip ve ayrılan kapasite", "type": "textarea", "placeholder": "Örn. 1 PM (%50), 2 geliştirici (tam zamanlı), 1 iş analisti (%30)" }
      ]
    },
    {
      "id": "risks",
      "title": "7. Riskler, Varsayımlar ve Kısıtlar",
      "description": "Berat aşamasındaki üst düzey maddeler; detay risk kaydında izlenir.",
      "table": {
        "columns": [
          { "id": "type", "label": "Tür", "type": "select", "options": ["Risk", "Varsayım", "Kısıt", "Bağımlılık"] },
          { "id": "description", "label": "Açıklama" },
          { "id": "impact", "label": "Etki", "type": "select", "options": ["Yüksek", "Orta", "Düşük"] },
          { "id": "action", "label": "Önlem / sahibi" }
        ],
        "emptyRows": 4,
        "exampleRows": [
          { "type": "Bağımlılık", "description": "ERP ekibinin entegrasyon servisini Kasım sonuna kadar açması gerekiyor", "impact": "Yüksek", "action": "Haftalık takip — Proje Yöneticisi" }
        ]
      }
    },
    {
      "id": "approval",
      "title": "8. Yönetişim ve Onay",
      "fields": [
        { "id": "governance", "label": "Takip ritmi ve karar mekanizması", "type": "textarea", "placeholder": "Örn. Haftalık ekip toplantısı; ayda bir yönlendirme komitesi" },
        { "id": "change_rule", "label": "Değişiklik kuralı", "type": "textarea", "help": "Hangi büyüklükteki değişiklik kimin onayını gerektirir?" },
        { "id": "approved_by", "label": "Onaylayan (sponsor)", "type": "text" },
        { "id": "approval_date", "label": "Onay tarihi", "type": "text" }
      ]
    }
  ]
}
$json$::jsonb
from public.subcategories s join public.categories c on c.id = s.category_id
where c.slug = 'proje-yonetimi' and s.slug = 'proje-berati'
on conflict (subcategory_id, version) do nothing;

-- ---------------------------------------------------------------------
-- 2) İş Kırılım Yapısı (WBS)
-- ---------------------------------------------------------------------
insert into public.output_templates (subcategory_id, version, content)
select s.id, 1, $json$
{
  "kind": "template",
  "summary": "Kapsamı yönetilebilir iş paketlerine bölen yapı. Her paketin sorumlusu, eforu ve kabul kriteri olur; planlama, bütçeleme ve takip bunun üzerine kurulur.",
  "sections": [
    {
      "id": "scope",
      "title": "1. Kapsam Özeti",
      "fields": [
        { "id": "project", "label": "Proje / teslimat", "type": "text" },
        { "id": "scope_statement", "label": "Kapsam ifadesi", "type": "textarea", "help": "Bu projenin ürettiği sonuç tek paragrafta." },
        { "id": "out_scope", "label": "Kapsam dışı", "type": "textarea" }
      ]
    },
    {
      "id": "wbs",
      "title": "2. İş Kırılım Yapısı",
      "description": "Numaralandırma hiyerarşiyi gösterir (1, 1.1, 1.2…). Bir iş paketi tek sorumluya verilebilecek ve eforu tahmin edilebilecek kadar küçük olmalıdır (pratikte 8-80 saat).",
      "table": {
        "columns": [
          { "id": "no", "label": "WBS No" },
          { "id": "package", "label": "İş paketi" },
          { "id": "description", "label": "Kapsadığı işler" },
          { "id": "owner", "label": "Sorumlu (rol)" },
          { "id": "effort", "label": "Tahmini efor (adam-gün)" },
          { "id": "depends", "label": "Bağımlı olduğu paket" }
        ],
        "emptyRows": 8,
        "exampleRows": [
          { "no": "1.2", "package": "Gereksinim analizi", "description": "Bayi görüşmeleri, süreç haritası, BRD hazırlanması", "owner": "İş Analisti", "effort": "12", "depends": "1.1" }
        ]
      }
    },
    {
      "id": "deliverables",
      "title": "3. Teslimatlar ve Kabul Kriterleri",
      "description": "\"Bitti\" ne demek? Kabul kriteri yazılmayan teslimat, tartışmaya açık kalır.",
      "table": {
        "columns": [
          { "id": "deliverable", "label": "Teslimat" },
          { "id": "wbs", "label": "İlgili WBS No" },
          { "id": "acceptance", "label": "Kabul kriteri" },
          { "id": "approver", "label": "Onaylayan" }
        ],
        "emptyRows": 4,
        "exampleRows": []
      }
    },
    {
      "id": "assumptions",
      "title": "4. Varsayımlar ve Kapsam Dışı Netleştirmeler",
      "fields": [
        { "id": "assumptions", "label": "Varsayımlar", "type": "textarea", "help": "Doğru çıkmazsa efor ve takvim değişir." },
        { "id": "exclusions", "label": "Sık karıştırılan kapsam dışı işler", "type": "textarea" }
      ]
    },
    {
      "id": "control",
      "title": "5. Kapsam Doğrulama ve Değişiklik",
      "fields": [
        { "id": "verification", "label": "Doğrulama yöntemi", "type": "textarea", "placeholder": "Örn. Her iş paketi sonunda demo; teslimat onayı e-posta ile kayıt altına alınır." },
        { "id": "change_process", "label": "Değişiklik süreci", "type": "textarea", "help": "Yeni bir talep geldiğinde kim değerlendirir, nasıl onaylanır?" }
      ]
    }
  ]
}
$json$::jsonb
from public.subcategories s join public.categories c on c.id = s.category_id
where c.slug = 'proje-yonetimi' and s.slug = 'is-kirilim-yapisi'
on conflict (subcategory_id, version) do nothing;

-- ---------------------------------------------------------------------
-- 3) RACI / Sorumluluk Matrisi
-- ---------------------------------------------------------------------
insert into public.output_templates (subcategory_id, version, content)
select s.id, 1, $json$
{
  "kind": "template",
  "summary": "Her faaliyet için kim sorumlu (R), kim hesap verir (A), kime danışılır (C), kim bilgilendirilir (I). Rol belirsizliğinden doğan gecikmeleri ve çifte işi önler.",
  "sections": [
    {
      "id": "scope",
      "title": "1. Kapsam",
      "fields": [
        { "id": "subject", "label": "Proje / süreç", "type": "text" },
        { "id": "period", "label": "Geçerlilik dönemi", "type": "text" },
        { "id": "note", "label": "Notlar", "type": "textarea" }
      ]
    },
    {
      "id": "roles",
      "title": "2. Roller",
      "description": "Matriste kullanılacak rolleri önce tanımlayın; kişi değişse de rol kalır.",
      "table": {
        "columns": [
          { "id": "role", "label": "Rol" },
          { "id": "person", "label": "Kişi" },
          { "id": "unit", "label": "Birim" },
          { "id": "scope", "label": "Sorumluluk alanı" }
        ],
        "emptyRows": 5,
        "exampleRows": []
      }
    },
    {
      "id": "matrix",
      "title": "3. RACI Matrisi",
      "description": "Her satırda yalnızca bir A (hesap veren) olmalıdır. R olmayan satır sahipsizdir; çok sayıda C süreci yavaşlatır.",
      "table": {
        "columns": [
          { "id": "activity", "label": "Faaliyet / karar / teslimat" },
          { "id": "r", "label": "R — Sorumlu" },
          { "id": "a", "label": "A — Hesap veren" },
          { "id": "c", "label": "C — Danışılan" },
          { "id": "i", "label": "I — Bilgilendirilen" }
        ],
        "emptyRows": 8,
        "exampleRows": [
          { "activity": "Gereksinim dokümanının onayı", "r": "İş Analisti", "a": "Ürün Sahibi", "c": "Operasyon Müdürü, BT Mimarı", "i": "Proje Ekibi" }
        ]
      }
    },
    {
      "id": "checks",
      "title": "4. Çakışma ve Boşluk Kontrolü",
      "description": "Matris tamamlandıktan sonra bu kontrolleri yapın; en sık hatalar burada çıkar.",
      "fields": [
        { "id": "multiple_a", "label": "Birden fazla A olan satırlar", "type": "textarea" },
        { "id": "no_r", "label": "Sorumlusu (R) olmayan faaliyetler", "type": "textarea" },
        { "id": "overloaded", "label": "Aşırı yüklenmiş roller", "type": "textarea" },
        { "id": "actions", "label": "Düzeltme aksiyonları", "type": "textarea" }
      ]
    },
    {
      "id": "escalation",
      "title": "5. Eskalasyon Yolu",
      "description": "Karar çıkmadığında veya anlaşmazlıkta devreye girecek sıra.",
      "table": {
        "columns": [
          { "id": "topic", "label": "Konu türü" },
          { "id": "level1", "label": "1. seviye" },
          { "id": "level2", "label": "2. seviye" },
          { "id": "sla", "label": "Azami süre" }
        ],
        "emptyRows": 3,
        "exampleRows": [
          { "topic": "Kapsam değişikliği", "level1": "Proje Yöneticisi", "level2": "Yönlendirme Komitesi", "sla": "5 iş günü" }
        ]
      }
    }
  ]
}
$json$::jsonb
from public.subcategories s join public.categories c on c.id = s.category_id
where c.slug = 'proje-yonetimi' and s.slug = 'raci-matrisi'
on conflict (subcategory_id, version) do nothing;

-- ---------------------------------------------------------------------
-- 4) Proje Durum Raporu
-- ---------------------------------------------------------------------
insert into public.output_templates (subcategory_id, version, content)
select s.id, 1, $json$
{
  "kind": "template",
  "summary": "Yöneticinin 2 dakikada okuyup karar verebileceği dönemsel rapor: genel durum, ilerleme, bütçe, riskler ve karar bekleyen konular.",
  "sections": [
    {
      "id": "header",
      "title": "1. Rapor Künyesi",
      "fields": [
        { "id": "project", "label": "Proje", "type": "text" },
        { "id": "period", "label": "Raporlama dönemi", "type": "text", "placeholder": "Örn. 15-30 Eylül 2026" },
        { "id": "author", "label": "Hazırlayan", "type": "text" },
        { "id": "status", "label": "Genel durum", "type": "select", "options": ["Yolunda", "Dikkat gerektiriyor", "Riskli / gecikmede"] },
        { "id": "status_reason", "label": "Durumun gerekçesi", "type": "textarea", "help": "Sarı veya kırmızıysa nedenini ve toparlanma planını tek cümlede yazın." }
      ]
    },
    {
      "id": "summary",
      "title": "2. Yönetici Özeti",
      "fields": [
        { "id": "done", "label": "Bu dönem tamamlananlar", "type": "textarea" },
        { "id": "next", "label": "Sonraki dönem planı", "type": "textarea" },
        { "id": "help", "label": "Yönetimden beklenen destek", "type": "textarea" }
      ]
    },
    {
      "id": "milestones",
      "title": "3. Kilometre Taşı Durumu",
      "table": {
        "columns": [
          { "id": "milestone", "label": "Kilometre taşı" },
          { "id": "planned", "label": "Planlanan tarih" },
          { "id": "forecast", "label": "Tahmini / gerçekleşen" },
          { "id": "status", "label": "Durum", "type": "select", "options": ["Tamamlandı", "Yolunda", "Risk altında", "Gecikti"] },
          { "id": "note", "label": "Not" }
        ],
        "emptyRows": 5,
        "exampleRows": []
      }
    },
    {
      "id": "budget",
      "title": "4. Bütçe ve Efor",
      "table": {
        "columns": [
          { "id": "item", "label": "Kalem" },
          { "id": "budget", "label": "Bütçe" },
          { "id": "spent", "label": "Harcanan" },
          { "id": "remaining", "label": "Kalan" },
          { "id": "variance", "label": "Sapma ve açıklaması" }
        ],
        "emptyRows": 3,
        "exampleRows": []
      }
    },
    {
      "id": "risks",
      "title": "5. Riskler ve Sorunlar",
      "description": "Risk henüz gerçekleşmemiş olasılıktır; sorun gerçekleşmiş ve müdahale bekliyordur.",
      "table": {
        "columns": [
          { "id": "type", "label": "Tür", "type": "select", "options": ["Risk", "Sorun"] },
          { "id": "description", "label": "Açıklama" },
          { "id": "impact", "label": "Etki", "type": "select", "options": ["Yüksek", "Orta", "Düşük"] },
          { "id": "action", "label": "Aksiyon" },
          { "id": "owner", "label": "Sahip" },
          { "id": "due", "label": "Tarih" }
        ],
        "emptyRows": 4,
        "exampleRows": []
      }
    },
    {
      "id": "decisions",
      "title": "6. Karar Bekleyen Konular",
      "description": "Raporun en önemli bölümü: yöneticinin bu toplantıda vermesi gereken kararlar.",
      "table": {
        "columns": [
          { "id": "topic", "label": "Konu" },
          { "id": "options", "label": "Seçenekler" },
          { "id": "recommendation", "label": "Önerimiz" },
          { "id": "decider", "label": "Karar mercii" },
          { "id": "deadline", "label": "Son tarih" }
        ],
        "emptyRows": 3,
        "exampleRows": [
          { "topic": "Entegrasyon gecikmesi", "options": "A) Canlıya geçişi 3 hafta ertele B) Manuel geçici çözümle devam et", "recommendation": "B — maliyeti düşük, tarih korunur", "decider": "Sponsor", "deadline": "10.10.2026" }
        ]
      }
    }
  ]
}
$json$::jsonb
from public.subcategories s join public.categories c on c.id = s.category_id
where c.slug = 'proje-yonetimi' and s.slug = 'durum-raporu'
on conflict (subcategory_id, version) do nothing;

-- ---------------------------------------------------------------------
-- 5) Ürün Gereksinim Dokümanı (PRD)
-- ---------------------------------------------------------------------
insert into public.output_templates (subcategory_id, version, content)
select s.id, 1, $json$
{
  "kind": "template",
  "summary": "Bir ürün veya özelliğin neden, kim için ve ne kapsamda yapılacağını tanımlayan doküman. Tasarım ve mühendislik ekibinin ortak referansıdır.",
  "sections": [
    {
      "id": "overview",
      "title": "1. Özet",
      "fields": [
        { "id": "name", "label": "Ürün / özellik adı", "type": "text" },
        { "id": "problem", "label": "Çözülen problem", "type": "textarea", "help": "Kullanıcının bugün yaşadığı zorluk; çözüm değil problem yazın." },
        { "id": "audience", "label": "Hedef kullanıcı", "type": "textarea" },
        { "id": "hypothesis", "label": "Başarı hipotezi", "type": "textarea", "placeholder": "Örn. Sipariş akışını 3 adıma indirirsek tamamlanma oranı %60'tan %75'e çıkar." }
      ]
    },
    {
      "id": "goals",
      "title": "2. Hedefler ve Metrikler",
      "description": "Ölçülemeyen hedef, tartışmaya açık hedeftir. Karşı metrik (guardrail) eklemeyi unutmayın.",
      "table": {
        "columns": [
          { "id": "goal", "label": "Hedef" },
          { "id": "metric", "label": "Metrik" },
          { "id": "baseline", "label": "Mevcut" },
          { "id": "target", "label": "Hedef" },
          { "id": "method", "label": "Ölçüm yöntemi" }
        ],
        "emptyRows": 4,
        "exampleRows": [
          { "goal": "Sipariş tamamlama oranını artırmak", "metric": "Sepetten ödemeye dönüşüm", "baseline": "%60", "target": "%75", "method": "Ürün analitiği, haftalık" }
        ]
      }
    },
    {
      "id": "scope",
      "title": "3. Kapsam",
      "fields": [
        { "id": "in_scope", "label": "Bu sürümde var", "type": "textarea" },
        { "id": "out_scope", "label": "Bu sürümde yok (sonraya bırakıldı)", "type": "textarea" },
        { "id": "dependencies", "label": "Bağımlılıklar", "type": "textarea", "help": "Başka ekip, sistem veya tedarikçiden beklenenler." }
      ]
    },
    {
      "id": "stories",
      "title": "4. Kullanıcı Hikâyeleri",
      "description": "\"<Kullanıcı> olarak, <ihtiyaç> istiyorum; böylece <fayda>.\" Her hikâyenin kabul kriteri olmalı.",
      "table": {
        "columns": [
          { "id": "priority", "label": "Öncelik", "type": "select", "options": ["Olmazsa olmaz", "Önemli", "İyi olur"] },
          { "id": "story", "label": "Kullanıcı hikâyesi" },
          { "id": "acceptance", "label": "Kabul kriteri" },
          { "id": "note", "label": "Not / tasarım bağlantısı" }
        ],
        "emptyRows": 6,
        "exampleRows": [
          { "priority": "Olmazsa olmaz", "story": "Bayi olarak geçmiş siparişimi tekrarlamak istiyorum; böylece her seferinde ürünleri tek tek seçmem gerekmesin.", "acceptance": "Son 10 sipariş listelenir; seçilen sipariş sepete tek tıkla eklenir; stokta olmayan ürün uyarı verir.", "note": "Tasarım: sipariş detay ekranı" }
        ]
      }
    },
    {
      "id": "requirements",
      "title": "5. Akış ve Teknik Gereksinimler",
      "fields": [
        { "id": "main_flow", "label": "Ana kullanıcı akışı", "type": "textarea" },
        { "id": "edge_cases", "label": "Uç durumlar ve hata halleri", "type": "textarea" },
        { "id": "nfr", "label": "Teknik, performans ve uyumluluk gereksinimleri", "type": "textarea", "placeholder": "Örn. 2 sn'den kısa yanıt; KVKK kapsamında kişisel veri saklama süresi" }
      ]
    },
    {
      "id": "release",
      "title": "6. Sürüm Planı",
      "table": {
        "columns": [
          { "id": "phase", "label": "Aşama", "type": "select", "options": ["Prototip", "İç test", "Beta / pilot", "Genel kullanım"] },
          { "id": "scope", "label": "Kapsam" },
          { "id": "date", "label": "Hedef tarih" },
          { "id": "exit", "label": "Çıkış kriteri" }
        ],
        "emptyRows": 4,
        "exampleRows": []
      }
    },
    {
      "id": "risks",
      "title": "7. Riskler ve Açık Sorular",
      "table": {
        "columns": [
          { "id": "type", "label": "Tür", "type": "select", "options": ["Risk", "Açık soru"] },
          { "id": "description", "label": "Açıklama" },
          { "id": "impact", "label": "Etki", "type": "select", "options": ["Yüksek", "Orta", "Düşük"] },
          { "id": "owner", "label": "Sahip" },
          { "id": "due", "label": "Netleşme tarihi" }
        ],
        "emptyRows": 4,
        "exampleRows": []
      }
    },
    {
      "id": "launch",
      "title": "8. Lansman ve Ölçüm",
      "fields": [
        { "id": "launch_plan", "label": "Lansman planı ve duyuru kanalları", "type": "textarea" },
        { "id": "monitoring", "label": "Lansman sonrası izlenecek metrikler", "type": "textarea" },
        { "id": "rollback", "label": "Geri alma planı", "type": "textarea", "help": "Beklenmeyen sonuçta ne yapılacak, kim karar verecek?" }
      ]
    }
  ]
}
$json$::jsonb
from public.subcategories s join public.categories c on c.id = s.category_id
where c.slug = 'urun-yonetimi' and s.slug = 'prd'
on conflict (subcategory_id, version) do nothing;
