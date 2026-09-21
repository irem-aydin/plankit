-- =====================================================================
-- Kategori ve alt başlık kataloğu
-- Kaynak: "İş Analizi Platformu — Taksonomi & Ürün Planı"
-- (BABOK v3, PMBOK, modern ürün yönetimi pratiği, iş geliştirme fonksiyonları)
-- =====================================================================

insert into public.categories (slug, name, description, sort_order) values
  ('is-analizi',     'İş Analizi',     'BABOK v3 bilgi alanlarına dayalı gereksinim, strateji ve çözüm analizi araçları.', 1),
  ('proje-yonetimi', 'Proje Yönetimi', 'PMBOK bilgi alanlarına dayalı planlama, kontrol ve teslimat araçları.', 2),
  ('urun-yonetimi',  'Ürün Yönetimi',  'Keşif, strateji, teslimat ve büyüme eksenlerinde ürün yönetimi araçları.', 3),
  ('is-gelistirme',  'İş Geliştirme',  'Satış, ortaklık ve büyüme fonksiyonları için planlama araçları.', 4);

with c as (select id, slug from public.categories)
insert into public.subcategories (category_id, slug, name, description, output_type, sort_order)
select c.id, s.slug, s.name, s.description, s.output_type::public.output_type, s.sort_order
from (values
  -- İş Analizi
  ('is-analizi', 'paydas-analizi',             'Paydaş Analizi',                          'Paydaşları belirleme, etki/ilgi matrisi ve iletişim stratejisi.', 'template', 1),
  ('is-analizi', 'planlama-ve-izleme',         'İş Analizi Planlama ve İzleme',           'Analiz yaklaşımını seçme, analiz sürecini planlama ve yönetme.', 'template', 2),
  ('is-analizi', 'gereksinim-toplama',         'Gereksinim Toplama ve İşbirliği',         'Görüşme, atölye ve anketlerle ihtiyaçları ortaya çıkarma.', 'checklist', 3),
  ('is-analizi', 'gereksinim-yasam-dongusu',   'Gereksinim Yaşam Döngüsü Yönetimi',       'İzlenebilirlik, önceliklendirme, onay ve değişim yönetimi.', 'template', 4),
  ('is-analizi', 'strateji-analizi',           'Strateji Analizi',                        'Mevcut vs. hedef durum, risk değerlendirmesi ve değişim stratejisi.', 'guide', 5),
  ('is-analizi', 'gereksinim-analizi-tasarim', 'Gereksinim Analizi ve Çözüm Tasarımı',    'Modelleme, doğrulama ve çözüm seçeneklerinin tasarlanması.', 'guide', 6),
  ('is-analizi', 'cozum-degerlendirme',        'Çözüm Değerlendirme',                     'Çözüm performansını ölçme ve iyileştirme fırsatlarını belirleme.', 'checklist', 7),
  ('is-analizi', 'surec-analizi',              'Süreç Analizi ve İyileştirme',            'Süreç haritalama (As-Is / To-Be) ve BPM.', 'template', 8),
  ('is-analizi', 'veri-analizi-raporlama',     'Veri Analizi ve Raporlama İhtiyaçları',   'Rapor, metrik ve veri kaynağı gereksinimlerinin tanımı.', 'template', 9),

  -- Proje Yönetimi
  ('proje-yonetimi', 'entegrasyon-yonetimi', 'Entegrasyon Yönetimi',              'Proje beratı, proje planı ve değişiklik yönetimi.', 'template', 1),
  ('proje-yonetimi', 'kapsam-yonetimi',      'Kapsam Yönetimi',                   'İş kırılım yapısı (WBS), kapsam doğrulama ve kontrol.', 'template', 2),
  ('proje-yonetimi', 'zaman-yonetimi',       'Zaman / Takvim Yönetimi',           'Faaliyet planlama, süre tahmini, Gantt ve kritik yol.', 'template', 3),
  ('proje-yonetimi', 'maliyet-yonetimi',     'Maliyet Yönetimi',                  'Bütçeleme, maliyet tahmini ve kontrol.', 'template', 4),
  ('proje-yonetimi', 'kalite-yonetimi',      'Kalite Yönetimi',                   'Kalite planlama, güvence ve kontrol süreçleri.', 'checklist', 5),
  ('proje-yonetimi', 'kaynak-yonetimi',      'Kaynak Yönetimi',                   'Ekip oluşturma, kaynak tahsisi ve performans yönetimi.', 'template', 6),
  ('proje-yonetimi', 'iletisim-yonetimi',    'İletişim Yönetimi',                 'Paydaş raporlama ve bilgi dağıtımı planı.', 'template', 7),
  ('proje-yonetimi', 'risk-yonetimi',        'Risk Yönetimi',                     'Risk belirleme, analiz, yanıt planlama ve izleme.', 'checklist', 8),
  ('proje-yonetimi', 'tedarik-yonetimi',     'Satın Alma / Tedarik Yönetimi',     'Tedarikçi seçimi ve sözleşme yönetimi.', 'checklist', 9),
  ('proje-yonetimi', 'paydas-yonetimi',      'Paydaş Yönetimi',                   'Beklenti yönetimi ve paydaş bağlılık stratejileri.', 'template', 10),
  ('proje-yonetimi', 'cevik-uygulamalar',    'Çevik (Agile) / Scrum / Kanban',    'Hibrit ve çevik yöntemlerin uygulanması.', 'guide', 11),

  -- Ürün Yönetimi
  ('urun-yonetimi', 'urun-stratejisi',          'Ürün Stratejisi ve Vizyonu',        'Misyon, hedef pazar ve konumlandırma.', 'guide', 1),
  ('urun-yonetimi', 'pazar-kullanici-arastirma','Pazar ve Kullanıcı Araştırması',    'Müşteri görüşmeleri, persona ve rakip analizi.', 'template', 2),
  ('urun-yonetimi', 'urun-kesfi',               'Ürün Keşfi (Discovery)',            'Problem/çözüm uyumu, prototipleme ve hipotez testleri.', 'template', 3),
  ('urun-yonetimi', 'yol-haritasi',             'Yol Haritası ve Önceliklendirme',   'RICE / MoSCoW ile özellik önceliklendirme.', 'template', 4),
  ('urun-yonetimi', 'urun-teslimati',           'Ürün Teslimatı (Delivery)',         'Mühendislikle işbirliği, sprint ve sürüm yönetimi.', 'checklist', 5),
  ('urun-yonetimi', 'buyume-metrikler',         'Büyüme ve Metrikler',               'KPI, huni analizi, A/B testleri ve elde tutma.', 'template', 6),
  ('urun-yonetimi', 'fiyatlandirma-paketleme',  'Fiyatlandırma ve Paketleme',        'Fiyat modelleri ve paket/plan tasarımı.', 'guide', 7),
  ('urun-yonetimi', 'go-to-market',             'Go-to-Market Stratejisi',           'Lansman planı; satış ve pazarlamayla koordinasyon.', 'checklist', 8),
  ('urun-yonetimi', 'urun-yasam-dongusu',       'Ürün Yaşam Döngüsü Yönetimi',       'Büyüme, olgunluk ve gerileme evrelerinde karar alma.', 'guide', 9),

  -- İş Geliştirme
  ('is-gelistirme', 'satis-stratejisi',       'Satış Stratejisi ve Kanal Geliştirme',       'Doğrudan satış, bayilik ve online kanallar.', 'template', 1),
  ('is-gelistirme', 'ortaklik-ittifaklar',    'Ortaklık ve İttifaklar',                     'Stratejik ortaklıklar ve entegrasyon anlaşmaları.', 'checklist', 2),
  ('is-gelistirme', 'pazar-genisleme',        'Pazar Genişleme',                            'Yeni coğrafya ve segmentlere giriş stratejileri.', 'guide', 3),
  ('is-gelistirme', 'musteri-iliskileri',     'Müşteri İlişkileri ve Bağlılık',             'CRM süreçleri ve müşteri yaşam boyu değeri (LTV).', 'template', 4),
  ('is-gelistirme', 'gelir-modeli',           'Gelir Modeli ve Fiyatlandırma Stratejisi',   'Gelir akışlarının çeşitlendirilmesi.', 'guide', 5),
  ('is-gelistirme', 'rakip-pazar-istihbarati','Rakip ve Pazar İstihbaratı',                 'Rakip izleme ve pazar trend analizi.', 'template', 6),
  ('is-gelistirme', 'firsat-lead-yonetimi',   'Fırsat / Lead Yönetimi',                     'Potansiyel müşteri/ortak tespiti ve değerlendirmesi.', 'checklist', 7),
  ('is-gelistirme', 'birlesme-satin-alma',    'Stratejik Ortaklıklar ve Satın Alma (M&A)',  'Büyük ölçekli büyüme fırsatları.', 'checklist', 8)
) as s(category_slug, slug, name, description, output_type, sort_order)
join c on c.slug = s.category_slug;
