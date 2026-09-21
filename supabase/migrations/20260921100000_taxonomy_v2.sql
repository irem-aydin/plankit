-- =====================================================================
-- Taksonomi v2: başlıklar "bilgi alanı" yerine "çıktı adı" oldu.
-- Kullanıcılar "Entegrasyon Yönetimi" değil "Proje Beratı" arıyor.
-- Eski başlıklar silinmez, pasife alınır (geçmiş çıktılar bozulmasın).
-- =====================================================================

alter table public.subcategories
  add column if not exists is_active boolean not null default true;

create index if not exists subcategories_active_idx
  on public.subcategories (category_id, is_active, sort_order);

-- ---------------------------------------------------------------------
-- 1) Mevcut başlıkları yeniden adlandır / sırala
-- ---------------------------------------------------------------------
with renames(category_slug, slug, new_slug, name, description, sort_order) as (values
  -- İş Analizi
  ('is-analizi', 'paydas-analizi',             'paydas-analizi',             'Paydaş Analizi',                          'Paydaş kaydı, güç/ilgi matrisi, RACI ve iletişim planı.', 2),
  ('is-analizi', 'surec-analizi',              'surec-analizi',              'Süreç Analizi (As-Is / To-Be)',           'Mevcut ve hedef süreç haritası, darboğazlar ve iyileştirme fırsatları.', 5),
  ('is-analizi', 'strateji-analizi',           'strateji-analizi',           'Strateji Analizi',                        'Mevcut durum, hedefler, alternatifler, aksiyon planı ve riskler.', 6),
  ('is-analizi', 'gereksinim-toplama',         'gereksinim-toplama',         'Gereksinim Toplama Atölyesi',             'Görüşme ve atölye hazırlığı: sorular, katılımcılar, çıktılar.', 8),
  ('is-analizi', 'cozum-degerlendirme',        'cozum-degerlendirme',        'Çözüm Değerlendirme',                     'Uygulanan çözümün performansı, fayda ölçümü ve iyileştirme fırsatları.', 9),
  ('is-analizi', 'veri-analizi-raporlama',     'veri-analizi-raporlama',     'Veri ve Raporlama İhtiyaçları',           'Rapor, metrik ve veri kaynağı gereksinimlerinin tanımı.', 10),

  -- Proje Yönetimi
  ('proje-yonetimi', 'entegrasyon-yonetimi', 'degisiklik-yonetimi',   'Değişiklik Talebi ve Yönetimi',   'Kapsam/bütçe/takvim değişikliklerinin değerlendirilmesi ve onayı.', 9),
  ('proje-yonetimi', 'kapsam-yonetimi',      'is-kirilim-yapisi',     'İş Kırılım Yapısı (WBS)',         'Kapsamın paketlere ayrılması, teslimatlar ve kabul kriterleri.', 2),
  ('proje-yonetimi', 'zaman-yonetimi',       'proje-plani-takvim',    'Proje Planı ve Takvim',           'Faaliyetler, süre tahmini, bağımlılıklar ve kritik yol.', 3),
  ('proje-yonetimi', 'risk-yonetimi',        'risk-yonetimi',         'Risk Yönetimi Kontrol Listesi',   'Risk belirleme, analiz, yanıt planlama ve izleme adımları.', 6),
  ('proje-yonetimi', 'maliyet-yonetimi',     'butce-takibi',          'Bütçe ve Maliyet Takibi',         'Bütçe kalemleri, tahmin, gerçekleşen ve sapma analizi.', 7),
  ('proje-yonetimi', 'iletisim-yonetimi',    'iletisim-plani',        'Paydaş İletişim Planı',           'Kime, hangi bilgiyi, hangi kanaldan ve hangi sıklıkta.', 8),
  ('proje-yonetimi', 'kalite-yonetimi',      'kalite-kontrol',        'Kalite Kontrol Listesi',          'Kalite planlama, güvence ve kontrol adımları.', 10),
  ('proje-yonetimi', 'kaynak-yonetimi',      'ekip-kaynak-plani',     'Ekip ve Kaynak Planı',            'Roller, kapasite, atama ve kaynak çakışmaları.', 11),
  ('proje-yonetimi', 'tedarik-yonetimi',     'tedarikci-secimi',      'Tedarikçi Seçimi ve Sözleşme',    'Teklif değerlendirme, seçim kriterleri ve sözleşme kontrolleri.', 12),
  ('proje-yonetimi', 'cevik-uygulamalar',    'sprint-planlama',       'Sprint Planlama ve Retrospektif', 'Çevik ekipler için sprint hazırlığı ve değerlendirme.', 13),

  -- Ürün Yönetimi
  ('urun-yonetimi', 'yol-haritasi',              'yol-haritasi',            'Ürün Yol Haritası ve Önceliklendirme', 'RICE / MoSCoW ile özellik önceliklendirme ve dönemlik plan.', 2),
  ('urun-yonetimi', 'pazar-kullanici-arastirma', 'kullanici-arastirmasi',   'Kullanıcı Araştırması ve Görüşme Planı', 'Araştırma soruları, görüşme rehberi ve bulguların değerlendirilmesi.', 5),
  ('urun-yonetimi', 'urun-kesfi',                'urun-kesfi',              'Ürün Keşfi ve Hipotez Testleri',       'Problem/çözüm uyumu, varsayım testleri ve prototipleme.', 6),
  ('urun-yonetimi', 'buyume-metrikler',          'okr-metrikler',           'OKR ve Ürün Metrikleri',               'Hedefler, anahtar sonuçlar, huni metrikleri ve elde tutma.', 7),
  ('urun-yonetimi', 'go-to-market',              'go-to-market',            'Go-to-Market ve Lansman Planı',        'Lansman adımları, mesajlar, kanallar ve hazırlık kontrolleri.', 8),
  ('urun-yonetimi', 'urun-teslimati',            'surum-plani',             'Sprint / Sürüm Planı',                 'Kapsam, bağımlılıklar, çıkış kriterleri ve sürüm notları.', 9),
  ('urun-yonetimi', 'urun-stratejisi',           'urun-stratejisi',         'Ürün Stratejisi ve Vizyonu',           'Misyon, hedef pazar, konumlandırma ve stratejik bahisler.', 10),
  ('urun-yonetimi', 'fiyatlandirma-paketleme',   'fiyatlandirma-paketleme', 'Fiyatlandırma ve Paketleme',           'Fiyat modelleri, paket tasarımı ve değer bazlı fiyatlama.', 11),
  ('urun-yonetimi', 'urun-yasam-dongusu',        'urun-yasam-dongusu',      'Ürün Yaşam Döngüsü Kararları',         'Büyüme, olgunluk ve sonlandırma evrelerinde karar çerçevesi.', 12),

  -- İş Geliştirme
  ('is-gelistirme', 'satis-stratejisi',        'is-gelistirme-plani',   'İş Geliştirme ve Satış Planı',      'Hedef segmentler, kanallar, gelir hedefleri ve aksiyon planı.', 3),
  ('is-gelistirme', 'firsat-lead-yonetimi',    'satis-pipeline',        'Satış Hunisi ve Pipeline Yönetimi', 'Aşamalar, nitelendirme kriterleri, dönüşüm oranları ve takip.', 2),
  ('is-gelistirme', 'ortaklik-ittifaklar',     'ortaklik-teklifi',      'Ortaklık / İş Birliği Teklifi',     'Ortaklık modeli, karşılıklı değer, şartlar ve başarı ölçütleri.', 4),
  ('is-gelistirme', 'musteri-iliskileri',      'anahtar-hesap-plani',   'Anahtar Müşteri (Key Account) Planı', 'Müşteri haritası, büyüme fırsatları, riskler ve temas planı.', 5),
  ('is-gelistirme', 'pazar-genisleme',         'yeni-pazara-giris',     'Yeni Pazara Giriş Planı',           'Pazar seçimi, giriş modeli, yerelleştirme ve ilk 12 ay planı.', 7),
  ('is-gelistirme', 'gelir-modeli',            'gelir-modeli',          'Gelir Modeli ve Fiyatlandırma',     'Gelir akışları, fiyatlama yaklaşımı ve çeşitlendirme.', 8),
  ('is-gelistirme', 'rakip-pazar-istihbarati', 'pazar-istihbarati',     'Rakip ve Pazar İstihbaratı',        'Rakip izleme, pazar trendleri ve fırsat/tehdit değerlendirmesi.', 9),
  ('is-gelistirme', 'birlesme-satin-alma',     'birlesme-satin-alma',   'Satın Alma / M&A Değerlendirme',    'Hedef şirket değerlendirmesi, sinerji ve risk analizi.', 10)
)
update public.subcategories s
set slug = r.new_slug,
    name = r.name,
    description = r.description,
    sort_order = r.sort_order,
    is_active = true
from renames r
join public.categories c on c.slug = r.category_slug
where s.category_id = c.id and s.slug = r.slug;

-- ---------------------------------------------------------------------
-- 2) Karşılığı yeni başlıklarda olan eski kayıtları gizle
-- ---------------------------------------------------------------------
update public.subcategories s
set is_active = false
from public.categories c
where c.id = s.category_id
  and (c.slug, s.slug) in (
    ('is-analizi', 'planlama-ve-izleme'),          -- Paydaş Analizi + İş Gerekçesi kapsıyor
    ('is-analizi', 'gereksinim-yasam-dongusu'),    -- Gereksinim Dokümanı kapsıyor
    ('is-analizi', 'gereksinim-analizi-tasarim'),  -- Gereksinim Dokümanı + Kullanıcı Hikâyeleri kapsıyor
    ('proje-yonetimi', 'paydas-yonetimi')          -- RACI + Paydaş Analizi kapsıyor
  );

-- ---------------------------------------------------------------------
-- 3) Sahada en çok kullanılan, eksik olan çıktılar
-- ---------------------------------------------------------------------
with c as (select id, slug from public.categories)
insert into public.subcategories (category_id, slug, name, description, output_type, sort_order)
select c.id, s.slug, s.name, s.description, s.output_type::public.output_type, s.sort_order
from (values
  ('is-analizi', 'is-gerekcesi',        'İş Gerekçesi (Business Case)',            'Yatırım kararını gerekçelendiren analiz: problem, seçenekler, fayda-maliyet, öneri.', 'template', 1),
  ('is-analizi', 'gereksinim-dokumani', 'Gereksinim Dokümanı (BRD)',               'İş, paydaş ve çözüm gereksinimleri; kapsam, kurallar ve kabul kriterleri.', 'template', 3),
  ('is-analizi', 'kullanici-hikayeleri','Kullanıcı Hikâyeleri ve Kabul Kriterleri','Epik ve hikâye kırılımı, kabul kriterleri ve önceliklendirme.', 'template', 4),
  ('is-analizi', 'bosluk-analizi',      'Boşluk (Gap) Analizi',                    'Mevcut ve hedef durum farkları; kapatılması gereken yetkinlik ve süreç boşlukları.', 'template', 7),

  ('proje-yonetimi', 'proje-berati',  'Proje Beratı (Project Charter)', 'Projenin amacı, kapsamı, paydaşları, bütçesi ve onay çerçevesi.', 'template', 1),
  ('proje-yonetimi', 'raci-matrisi',  'RACI / Sorumluluk Matrisi',      'Faaliyet bazında kim sorumlu, kim hesap verir, kime danışılır, kim bilgilendirilir.', 'template', 4),
  ('proje-yonetimi', 'durum-raporu',  'Proje Durum Raporu',             'Dönemsel ilerleme, kilometre taşları, riskler, sorunlar ve kararlar.', 'template', 5),
  ('proje-yonetimi', 'alinan-dersler','Alınan Dersler ve Kapanış',      'Neyin işe yaradığı, neyin yaramadığı ve sonraki projelere aktarılacaklar.', 'checklist', 14),

  ('urun-yonetimi', 'prd',                  'Ürün Gereksinim Dokümanı (PRD)', 'Problem, hedef kullanıcı, kapsam, gereksinimler, metrikler ve sürüm planı.', 'template', 1),
  ('urun-yonetimi', 'persona-yolculuk',     'Persona ve Müşteri Yolculuğu',   'Hedef kullanıcı profilleri, ihtiyaçlar ve uçtan uca yolculuk haritası.', 'template', 3),
  ('urun-yonetimi', 'rakip-analizi',        'Rakip Analizi',                  'Rakip karşılaştırması, farklılaşma alanları ve konumlandırma.', 'template', 4),

  ('is-gelistirme', 'teklif-hazirlama', 'Teklif (Proposal) Hazırlama', 'Müşteri ihtiyacı, çözüm, kapsam, fiyat, şartlar ve sonraki adımlar.', 'template', 1),
  ('is-gelistirme', 'musteri-kaybi',    'Müşteri Kaybı (Churn) Analizi', 'Kayıp nedenleri, risk altındaki müşteriler ve elde tutma aksiyonları.', 'template', 6)
) as s(category_slug, slug, name, description, output_type, sort_order)
join c on c.slug = s.category_slug
on conflict (category_id, slug) do nothing;
