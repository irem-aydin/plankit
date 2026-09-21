-- PlanKit — TEK SEFERDE VERİTABANI KURULUMU
-- Bu dosyanın TAMAMINI kopyalayıp Supabase > SQL Editor'e yapıştırın ve Run'a basın.
-- Yalnızca BİR KEZ çalıştırın.

-- ===== supabase/migrations/20260917120000_initial_schema.sql =====
-- =====================================================================
-- PlanKit — başlangıç şeması
-- categories → subcategories → output_templates (içerik kataloğu)
-- users (auth.users ile 1-1), generated_outputs, user_selections
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enum tipleri
-- ---------------------------------------------------------------------
create type public.output_type as enum ('template', 'checklist', 'guide');
create type public.subscription_status as enum ('trial', 'active', 'expired');

-- ---------------------------------------------------------------------
-- Ortak: updated_at tetikleyicisi
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- subcategories
-- ---------------------------------------------------------------------
create table public.subcategories (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  slug        text not null,
  name        text not null,
  description text,
  output_type public.output_type not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (category_id, slug)
);

create index subcategories_category_id_idx on public.subcategories (category_id);

-- ---------------------------------------------------------------------
-- output_templates
-- content JSON'unun şekli subcategory.output_type'a göre değişir
-- (bkz. src/core/content-schema.ts). Bir alt başlığın birden fazla
-- versiyonu olabilir; aynı anda yalnızca biri aktiftir.
-- ---------------------------------------------------------------------
create table public.output_templates (
  id             uuid primary key default gen_random_uuid(),
  subcategory_id uuid not null references public.subcategories (id) on delete cascade,
  version        int  not null default 1,
  is_active      boolean not null default true,
  content        jsonb not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (subcategory_id, version)
);

create unique index output_templates_one_active_per_subcategory
  on public.output_templates (subcategory_id)
  where is_active;

create trigger output_templates_set_updated_at
  before update on public.output_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- users (auth.users ile 1-1 profil + abonelik durumu)
-- ---------------------------------------------------------------------
create table public.users (
  id                      uuid primary key references auth.users (id) on delete cascade,
  email                   text,
  subscription_status     public.subscription_status not null default 'trial',
  trial_started_at        timestamptz not null default now(),
  trial_limit_used        int not null default 0 check (trial_limit_used >= 0),
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Yeni kayıt olan her kullanıcı için otomatik profil + deneme başlat
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- generated_outputs — üretilen (ve kullanıcının düzenlediği) çıktılar
-- ---------------------------------------------------------------------
create table public.generated_outputs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  title       text not null,
  document    jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index generated_outputs_user_id_idx on public.generated_outputs (user_id, created_at desc);

create trigger generated_outputs_set_updated_at
  before update on public.generated_outputs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- user_selections — raporlama için: hangi üretimde hangi alt başlık seçildi
-- ---------------------------------------------------------------------
create table public.user_selections (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  output_id      uuid references public.generated_outputs (id) on delete set null,
  category_id    uuid not null references public.categories (id) on delete cascade,
  subcategory_id uuid not null references public.subcategories (id) on delete cascade,
  created_at     timestamptz not null default now()
);

create index user_selections_user_id_idx on public.user_selections (user_id);
create index user_selections_subcategory_id_idx on public.user_selections (subcategory_id);

-- ---------------------------------------------------------------------
-- Deneme hakkını atomik olarak tüketen fonksiyon.
-- Eşzamanlı isteklerde limitin aşılmasını engeller. Yalnızca sunucu
-- (service role) tarafından çağrılır.
--   'active'  → her zaman izin verir, sayaç artmaz
--   'trial'   → trial_limit_used < p_limit ise 1 artırır; limite
--               ulaşınca durumu 'expired' yapar
--   'expired' → izin vermez
-- ---------------------------------------------------------------------
create or replace function public.consume_generation_credit(p_user_id uuid, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.subscription_status;
begin
  select subscription_status into v_status
  from public.users
  where id = p_user_id
  for update;

  if v_status is null then
    return false;
  end if;

  if v_status = 'active' then
    return true;
  end if;

  update public.users
  set trial_limit_used = trial_limit_used + 1,
      subscription_status = case
        when trial_limit_used + 1 >= p_limit then 'expired'::public.subscription_status
        else subscription_status
      end
  where id = p_user_id
    and subscription_status = 'trial'
    and trial_limit_used < p_limit;

  return found;
end;
$$;

revoke all on function public.consume_generation_credit(uuid, int) from public, anon, authenticated;
grant execute on function public.consume_generation_credit(uuid, int) to service_role;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.categories        enable row level security;
alter table public.subcategories     enable row level security;
alter table public.output_templates  enable row level security;
alter table public.users             enable row level security;
alter table public.generated_outputs enable row level security;
alter table public.user_selections   enable row level security;

-- Katalog başlıkları herkese açık (ücretli içerik değil)
create policy "categories are public"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "subcategories are public"
  on public.subcategories for select
  to anon, authenticated
  using (true);

-- output_templates: istemciye politika YOK. İçerik yalnızca sunucudaki
-- çıktı üretim servisi (service role) üzerinden, hak kontrolünden sonra okunur.

-- users: kullanıcı yalnızca kendi satırını okuyabilir. Güncelleme
-- (abonelik durumu vb.) yalnızca service role ile yapılır.
create policy "users can read own profile"
  on public.users for select
  to authenticated
  using ((select auth.uid()) = id);

-- generated_outputs: kendi çıktısını okuyabilir ve düzenleyebilir
create policy "users can read own outputs"
  on public.generated_outputs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can update own outputs"
  on public.generated_outputs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users can delete own outputs"
  on public.generated_outputs for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- user_selections: yalnızca okuma (yazma sunucuda)
create policy "users can read own selections"
  on public.user_selections for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ===== supabase/migrations/20260917120100_seed_catalog.sql =====
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

-- ===== supabase/migrations/20260917120200_sample_output_templates.sql =====
-- =====================================================================
-- Örnek içerik kalıpları (output_templates)
--   İş Analizi > Paydaş Analizi        → template
--   Proje Yönetimi > Risk Yönetimi     → checklist
--   İş Analizi > Strateji Analizi      → guide
-- JSON şekli: src/core/output/content-schema.ts
-- =====================================================================

-- ---------------------------------------------------------------------
-- Paydaş Analizi (BABOK v3 "Plan Stakeholder Engagement" + PMBOK
-- Paydaş Bağlılık Değerlendirme Matrisi + Mendelow Güç/İlgi Matrisi)
-- ---------------------------------------------------------------------
insert into public.output_templates (subcategory_id, version, content)
select s.id, 1, $json$
{
  "kind": "template",
  "summary": "Girişimden etkilenen veya girişimi etkileyebilecek tüm kişi ve grupları belirleyin, etki ve ilgi düzeylerini değerlendirin, mevcut ve hedeflenen bağlılık seviyelerini tanımlayın ve her paydaş için somut bir iletişim ve yönetim stratejisi oluşturun. Analizi proje başında hazırlayın, kilit aşamalarda güncelleyin.",
  "sections": [
    {
      "id": "context",
      "title": "1. Girişim Bilgileri",
      "description": "Analizin hangi bağlamda yapıldığını netleştirin. Kapsam sınırı, kimin paydaş sayılacağını belirler.",
      "fields": [
        { "id": "initiative", "label": "Proje / girişim adı", "type": "text", "placeholder": "Örn. Müşteri Portalı Yenileme" },
        { "id": "purpose", "label": "Analizin amacı", "type": "textarea", "placeholder": "Örn. Yeni portal geçişinde direnç risklerini erken görmek ve iletişim planını oluşturmak" },
        { "id": "scope", "label": "Kapsam ve sınırlar", "type": "textarea", "placeholder": "Dahil olan birimler, süreçler, lokasyonlar; kapsam dışı olanlar" },
        { "id": "sponsor", "label": "Proje sponsoru", "type": "text" },
        { "id": "prepared_by", "label": "Hazırlayan", "type": "text" },
        { "id": "version_date", "label": "Versiyon / tarih", "type": "text", "placeholder": "v1.0 — 17.09.2026" }
      ]
    },
    {
      "id": "register",
      "title": "2. Paydaş Listesi (Stakeholder Register)",
      "description": "Beyin fırtınası, organizasyon şeması, süreç haritaları ve mevcut sözleşmelerden yararlanın. Sponsor, son kullanıcı, müşteri, operasyon, destek, BT, hukuk/uyum, tedarikçi, düzenleyici kurumlar ve iç denetimi atlamayın.",
      "table": {
        "columns": [
          { "id": "name", "label": "Paydaş (kişi / grup)" },
          { "id": "role", "label": "Rol / unvan" },
          { "id": "unit", "label": "Birim / kurum" },
          { "id": "type", "label": "İç / Dış", "type": "select", "options": ["İç", "Dış"] },
          { "id": "interest", "label": "Girişimle ilişkisi / çıkarı" },
          { "id": "expectations", "label": "Beklentileri" },
          { "id": "concerns", "label": "Kaygıları" }
        ],
        "emptyRows": 5,
        "exampleRows": [
          { "name": "Çağrı Merkezi Ekibi", "role": "Müşteri temsilcileri", "unit": "Müşteri Hizmetleri", "type": "İç", "interest": "Portalı günlük kullanacak", "expectations": "Daha az manuel kayıt, hızlı arama", "concerns": "Eğitim süresi, geçişte performans hedeflerinin düşmesi" }
        ]
      }
    },
    {
      "id": "power_interest",
      "title": "3. Güç / İlgi Matrisi",
      "description": "Her paydaşın girişim üzerindeki etkisini (karar, bütçe, kaynak, veto gücü) ve girişime olan ilgisini değerlendirin. Kadran: Yüksek güç + yüksek ilgi → Yakından yönet; yüksek güç + düşük ilgi → Memnun tut; düşük güç + yüksek ilgi → Bilgilendir; düşük güç + düşük ilgi → İzle.",
      "table": {
        "columns": [
          { "id": "name", "label": "Paydaş" },
          { "id": "power", "label": "Güç / etki", "type": "select", "options": ["Yüksek", "Orta", "Düşük"] },
          { "id": "interest", "label": "İlgi", "type": "select", "options": ["Yüksek", "Orta", "Düşük"] },
          { "id": "quadrant", "label": "Strateji kadranı", "type": "select", "options": ["Yakından yönet", "Memnun tut", "Bilgilendir", "İzle"] },
          { "id": "rationale", "label": "Gerekçe" }
        ],
        "emptyRows": 5,
        "exampleRows": [
          { "name": "Operasyon Direktörü", "power": "Yüksek", "interest": "Yüksek", "quadrant": "Yakından yönet", "rationale": "Bütçe onayı ve kaynak tahsisi yetkisi var; süreç değişikliğinden doğrudan etkileniyor" }
        ]
      }
    },
    {
      "id": "engagement",
      "title": "4. Bağlılık Değerlendirme Matrisi",
      "description": "Paydaşın bugünkü tutumunu (M) ve girişimin başarısı için gereken tutumu (H) belirleyin. Aradaki fark, yönetim aksiyonlarının önceliğini gösterir. Seviyeler: Habersiz → Direnç gösteren → Nötr → Destekleyici → Öncü.",
      "table": {
        "columns": [
          { "id": "name", "label": "Paydaş" },
          { "id": "current", "label": "Mevcut tutum", "type": "select", "options": ["Habersiz", "Direnç gösteren", "Nötr", "Destekleyici", "Öncü"] },
          { "id": "desired", "label": "Hedef tutum", "type": "select", "options": ["Habersiz", "Direnç gösteren", "Nötr", "Destekleyici", "Öncü"] },
          { "id": "drivers", "label": "Tutumun nedeni" },
          { "id": "actions", "label": "Açığı kapatacak aksiyonlar" }
        ],
        "emptyRows": 5,
        "exampleRows": [
          { "name": "Çağrı Merkezi Ekibi", "current": "Direnç gösteren", "desired": "Destekleyici", "drivers": "Önceki sistem geçişinde yaşanan kesintiler", "actions": "Pilot kullanıcı grubu oluşturmak, geçiş haftasında hedefleri esnetmek, ekip liderlerini süper kullanıcı yapmak" }
        ]
      }
    },
    {
      "id": "raci",
      "title": "5. RACI Matrisi",
      "description": "Kritik teslimat ve kararlar için rolleri netleştirin. Her satırda yalnızca bir Hesap Veren (A) olmalıdır. R: Sorumlu (işi yapan), A: Hesap veren (onaylayan), C: Danışılan, I: Bilgilendirilen.",
      "table": {
        "columns": [
          { "id": "item", "label": "Faaliyet / karar / teslimat" },
          { "id": "r", "label": "R — Sorumlu" },
          { "id": "a", "label": "A — Hesap veren" },
          { "id": "c", "label": "C — Danışılan" },
          { "id": "i", "label": "I — Bilgilendirilen" }
        ],
        "emptyRows": 4,
        "exampleRows": [
          { "item": "İş gereksinimleri dokümanının onayı", "r": "İş Analisti", "a": "Operasyon Direktörü", "c": "Çağrı Merkezi Takım Liderleri, BT Mimarı", "i": "Proje Ekibi" }
        ]
      }
    },
    {
      "id": "communication",
      "title": "6. İletişim Planı",
      "description": "Her paydaşa doğru bilgiyi, doğru kanaldan, doğru sıklıkta ulaştırın. 'Yakından yönet' kadranındakiler için birebir ve düzenli temas planlayın.",
      "table": {
        "columns": [
          { "id": "audience", "label": "Paydaş / grup" },
          { "id": "information", "label": "İhtiyaç duyduğu bilgi" },
          { "id": "channel", "label": "Kanal", "type": "select", "options": ["Birebir toplantı", "Yönlendirme komitesi", "E-posta / bülten", "Durum raporu", "Atölye çalışması", "Demo", "Intranet / wiki", "Anlık mesajlaşma"] },
          { "id": "frequency", "label": "Sıklık", "type": "select", "options": ["Günlük", "Haftalık", "İki haftada bir", "Aylık", "Kilometre taşlarında", "İhtiyaç halinde"] },
          { "id": "owner", "label": "İletişim sorumlusu" },
          { "id": "feedback", "label": "Geri bildirim yöntemi" }
        ],
        "emptyRows": 5,
        "exampleRows": [
          { "audience": "Operasyon Direktörü", "information": "İlerleme, bütçe sapması, karar gerektiren konular", "channel": "Yönlendirme komitesi", "frequency": "İki haftada bir", "owner": "Proje Yöneticisi", "feedback": "Toplantı karar kaydı" }
        ]
      }
    },
    {
      "id": "risks",
      "title": "7. Paydaş Kaynaklı Riskler",
      "description": "Direnç, bilgi eksikliği, çatışan beklentiler veya kilit kişinin ayrılması gibi paydaş kaynaklı riskleri kaydedin ve proje risk kaydıyla ilişkilendirin.",
      "table": {
        "columns": [
          { "id": "stakeholder", "label": "Paydaş" },
          { "id": "risk", "label": "Risk / olası sorun" },
          { "id": "probability", "label": "Olasılık", "type": "select", "options": ["Yüksek", "Orta", "Düşük"] },
          { "id": "impact", "label": "Etki", "type": "select", "options": ["Yüksek", "Orta", "Düşük"] },
          { "id": "mitigation", "label": "Önleyici aksiyon" },
          { "id": "owner", "label": "Aksiyon sahibi" }
        ],
        "emptyRows": 3,
        "exampleRows": [
          { "stakeholder": "Hukuk ve Uyum", "risk": "KVKK değerlendirmesinin geç tamamlanması canlıya geçişi erteler", "probability": "Orta", "impact": "Yüksek", "mitigation": "Veri akış diyagramını analiz fazının 2. haftasında paylaşmak; haftalık kısa kontrol toplantısı", "owner": "İş Analisti" }
        ]
      }
    },
    {
      "id": "governance",
      "title": "8. Gözden Geçirme ve Onay",
      "description": "Paydaş analizi canlı bir dokümandır; organizasyon değişikliği, kapsam değişikliği ve faz geçişlerinde güncelleyin.",
      "fields": [
        { "id": "review_cadence", "label": "Gözden geçirme sıklığı", "type": "select", "options": ["Her sprint sonunda", "Aylık", "Faz geçişlerinde", "Kapsam değişikliğinde"] },
        { "id": "next_review", "label": "Sonraki gözden geçirme tarihi", "type": "text" },
        { "id": "approved_by", "label": "Onaylayan", "type": "text" },
        { "id": "notes", "label": "Açık konular / notlar", "type": "textarea" }
      ]
    }
  ]
}
$json$::jsonb
from public.subcategories s
join public.categories c on c.id = s.category_id
where c.slug = 'is-analizi' and s.slug = 'paydas-analizi';

-- ---------------------------------------------------------------------
-- Risk Yönetimi (PMBOK risk yönetimi süreçleri)
-- ---------------------------------------------------------------------
insert into public.output_templates (subcategory_id, version, content)
select s.id, 1, $json$
{
  "kind": "checklist",
  "summary": "Proje risklerinin planlanmasından kapanışına kadar atılması gereken temel adımlar. Tamamladığınız maddeleri işaretleyin, gerekirse not ekleyin.",
  "groups": [
    {
      "id": "plan",
      "title": "Risk Yönetimi Planlama",
      "items": [
        { "id": "p1", "text": "Risk yönetimi yaklaşımı, roller ve sorumluluklar tanımlandı", "hint": "Risk sahibi, risk yöneticisi ve eskalasyon yolu belli mi?" },
        { "id": "p2", "text": "Olasılık ve etki ölçekleri (ör. 1-5) ve tanımları belirlendi" },
        { "id": "p3", "text": "Kuruluşun ve sponsorun risk iştahı / toleransı netleştirildi" },
        { "id": "p4", "text": "Risk bütçesi ve yedek (contingency) rezervi planlandı" },
        { "id": "p5", "text": "Risk gözden geçirme toplantı sıklığı belirlendi" }
      ]
    },
    {
      "id": "identify",
      "title": "Risk Belirleme",
      "items": [
        { "id": "i1", "text": "Kapsam, takvim, maliyet, kalite, kaynak ve tedarik alanları için riskler tarandı" },
        { "id": "i2", "text": "Ekip ve kilit paydaşlarla risk atölyesi yapıldı", "hint": "Beyin fırtınası, SWOT, geçmiş proje dersleri, uzman görüşü" },
        { "id": "i3", "text": "Varsayımlar ve kısıtlar listelenip her biri risk açısından değerlendirildi" },
        { "id": "i4", "text": "Fırsatlar (pozitif riskler) de kaydedildi" },
        { "id": "i5", "text": "Her risk 'neden → olay → etki' formatında yazıldı ve risk kaydına eklendi" }
      ]
    },
    {
      "id": "analyze",
      "title": "Risk Analizi",
      "items": [
        { "id": "a1", "text": "Her risk için olasılık ve etki puanlandı" },
        { "id": "a2", "text": "Olasılık-etki matrisiyle riskler önceliklendirildi" },
        { "id": "a3", "text": "Kritik riskler için nicel analiz (beklenen parasal değer, senaryo) yapıldı" },
        { "id": "a4", "text": "Aciliyet ve tetikleyici (erken uyarı) işaretleri tanımlandı" }
      ]
    },
    {
      "id": "respond",
      "title": "Risk Yanıt Planlama",
      "items": [
        { "id": "r1", "text": "Her yüksek öncelikli risk için strateji seçildi", "hint": "Tehditler: kaçın, transfer et, azalt, kabul et. Fırsatlar: kullan, paylaş, artır, kabul et." },
        { "id": "r2", "text": "Her yanıt aksiyonunun sahibi ve son tarihi atandı" },
        { "id": "r3", "text": "Olası durum (contingency) ve B planları hazırlandı" },
        { "id": "r4", "text": "Yanıt aksiyonları proje planına, bütçeye ve takvime işlendi" },
        { "id": "r5", "text": "Yanıtlardan doğabilecek ikincil riskler değerlendirildi" }
      ]
    },
    {
      "id": "monitor",
      "title": "İzleme ve Kontrol",
      "items": [
        { "id": "m1", "text": "Risk kaydı düzenli toplantılarda güncelleniyor" },
        { "id": "m2", "text": "Tetikleyiciler izleniyor ve gerçekleşen riskler sorun kaydına aktarılıyor" },
        { "id": "m3", "text": "Yeni riskler ve kapanan riskler raporlanıyor" },
        { "id": "m4", "text": "Rezerv kullanımı takip ediliyor" },
        { "id": "m5", "text": "Proje kapanışında risk dersleri (lessons learned) kaydedildi" }
      ]
    }
  ]
}
$json$::jsonb
from public.subcategories s
join public.categories c on c.id = s.category_id
where c.slug = 'proje-yonetimi' and s.slug = 'risk-yonetimi';

-- ---------------------------------------------------------------------
-- Strateji Analizi (BABOK v3 Strategy Analysis)
-- ---------------------------------------------------------------------
insert into public.output_templates (subcategory_id, version, content)
select s.id, 1, $json$
{
  "kind": "guide",
  "summary": "Strateji analizi; bir iş ihtiyacını anlamak, mevcut durumu ve hedeflenen geleceği tanımlamak, aradaki boşluğu kapatacak değişim stratejisini ve risklerini ortaya koymak için yapılır. Bu rehber adımları sırasıyla açıklar; sonunda kendi girişiminiz için soruları yanıtlayın.",
  "sections": [
    {
      "id": "need",
      "heading": "1. İş ihtiyacını tanımlayın",
      "paragraphs": [
        "Çözüm tartışmasına geçmeden önce çözülmesi gereken problemi veya yakalanmak istenen fırsatı tek ve net bir cümleyle ifade edin. İhtiyaç; bir müşteri şikâyeti, gelir kaybı, mevzuat değişikliği ya da rekabet baskısından doğabilir.",
        "İhtiyacın kimi etkilediğini, ne sıklıkta ortaya çıktığını ve çözülmezse maliyetini (para, zaman, itibar) mümkün olduğunca sayısal verilerle destekleyin."
      ],
      "tips": [
        "'Yeni bir CRM lazım' bir çözümdür; 'satış fırsatlarının %30'u takip edilmediği için kayboluyor' bir ihtiyaçtır.",
        "Kök nedeni bulmak için 5 Neden veya balık kılçığı (Ishikawa) diyagramını kullanın."
      ]
    },
    {
      "id": "current",
      "heading": "2. Mevcut durumu (As-Is) analiz edin",
      "paragraphs": [
        "Bugünkü süreçleri, organizasyon yapısını, kullanılan teknolojiyi, yetkinlikleri, politikaları ve performans metriklerini inceleyin. Amaç, değişimin hangi zemine uygulanacağını anlamaktır.",
        "İç güçlü/zayıf yönleri ve dış fırsat/tehditleri SWOT ile; dış çevreyi PESTLE ile yapılandırabilirsiniz."
      ],
      "tips": [
        "Varsayımlara değil gözleme dayanın: süreci yerinde izleyin, mevcut raporları ve sistem verisini kullanın.",
        "Mevcut durumun korunması gereken güçlü yanlarını da kaydedin."
      ]
    },
    {
      "id": "future",
      "heading": "3. Hedef durumu (To-Be) tanımlayın",
      "paragraphs": [
        "Değişim tamamlandığında organizasyonun nasıl görüneceğini iş hedefleri, ölçülebilir başarı kriterleri ve kapsam sınırlarıyla tanımlayın. Hedef durum, stratejik yön ve kurum hedefleriyle uyumlu olmalıdır.",
        "Hedefleri SMART (belirli, ölçülebilir, ulaşılabilir, ilgili, zamana bağlı) biçimde yazın ve her hedef için bir KPI belirleyin."
      ],
      "tips": [
        "Hedef durumu çözümden bağımsız tarif edin; teknoloji seçimi bir sonraki adımın konusudur."
      ]
    },
    {
      "id": "gap",
      "heading": "4. Boşluk (gap) analizi yapın",
      "paragraphs": [
        "Mevcut ve hedef durum arasındaki farkları süreç, insan/yetkinlik, teknoloji, veri ve organizasyon başlıklarında listeleyin. Her boşluk, bir değişim ihtiyacına dönüşür.",
        "Boşlukları iş değeri ve kapatma zorluğuna göre önceliklendirin."
      ],
      "tips": [
        "Bir tabloyla çalışın: Boyut | Mevcut | Hedef | Boşluk | Önerilen değişim."
      ]
    },
    {
      "id": "risk",
      "heading": "5. Riskleri değerlendirin",
      "paragraphs": [
        "Değişimi yapmanın ve yapmamanın risklerini birlikte ele alın. Belirsizlikleri, bağımlılıkları, paydaş direncini ve kuruluşun risk toleransını değerlendirin.",
        "Riskin kabul edilemez olduğu durumlarda kapsamı daraltmak, aşamalı geçiş ya da pilot uygulama gibi seçenekleri düşünün."
      ],
      "tips": []
    },
    {
      "id": "strategy",
      "heading": "6. Değişim stratejisini belirleyin",
      "paragraphs": [
        "En az iki alternatif çözüm yaklaşımını (ör. mevcut sistemi iyileştirmek, hazır ürün almak, özel geliştirme) maliyet, fayda, süre ve risk açısından karşılaştırın. Seçilen yaklaşımın gerekçesini kayda geçirin.",
        "Stratejiyi geçiş durumlarına (transition states) bölün: her aşamanın vereceği değeri ve bir sonraki aşamaya geçiş koşullarını tanımlayın."
      ],
      "tips": [
        "Hiçbir şey yapmamayı da bir alternatif olarak değerlendirin; iş gerekçesinin gücünü gösterir."
      ]
    }
  ],
  "reflectionQuestions": [
    { "id": "q1", "question": "Çözülmesi gereken iş ihtiyacı nedir ve çözülmezse maliyeti ne olur?" },
    { "id": "q2", "question": "Mevcut durumun en kritik üç zayıf yönü nedir?" },
    { "id": "q3", "question": "Hedef duruma ulaşıldığını hangi ölçülebilir kriterlerle anlayacağız?" },
    { "id": "q4", "question": "Önceliği en yüksek üç boşluk hangileridir?" },
    { "id": "q5", "question": "Değerlendirdiğiniz alternatif stratejiler nelerdir ve hangisini neden seçtiniz?" }
  ]
}
$json$::jsonb
from public.subcategories s
join public.categories c on c.id = s.category_id
where c.slug = 'is-analizi' and s.slug = 'strateji-analizi';
