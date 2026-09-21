# PlanKit

İş analizi, proje yönetimi, ürün yönetimi ve iş geliştirme alanlarında kullanıcının seçtiği alt başlıklara göre birleştirilmiş, düzenlenebilir şablon / checklist / rehber dokümanı üreten platform.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth) · Stripe Billing · Vercel

> Uygulama adı `src/config/app.ts` içindeki `APP_NAME` sabitinden değiştirilebilir.

---

## Mimari

```
src/
├─ core/                      ← SAF İŞ MANTIĞI (Next.js / Supabase / React bilmez)
│  ├─ ai/                      ← Yapay zekâ: bağlam (intake), şablon doldurma, şablon tasarlama,
│  │                             dosya ekleri (attachments), karar çıkarımı (decisions)
│  ├─ profile/profile.ts      ← Bağlam profilleri (bellek): alanlar, bağlam üretimi
│  ├─ account/security.ts     ← Şifre kuralı, güvenli yönlendirme
│  ├─ output/
│  │  ├─ generator.ts         ← ÇIKTI ÜRETİM MOTORU: generateOutput(input, repository)
│  │  ├─ content-schema.ts    ← output_templates.content JSON şemaları (template/checklist/guide)
│  │  ├─ document.ts          ← Üretilen, doldurulabilir doküman şeması
│  │  ├─ markdown.ts          ← Doküman → Markdown
│  │  ├─ catalog-repository.ts← Motorun veri kaynağı arayüzü
│  │  └─ errors.ts            ← GenerationError (kodlu, taşıma katmanından bağımsız)
│  └─ billing/entitlements.ts ← Deneme/abonelik hak kuralları, Stripe durum eşlemesi
│
├─ services/                  ← KULLANIM SENARYOLARI (core + altyapıyı birleştirir)
│  ├─ generation-service.ts   ← generateForUser / refineSectionForUser (soru cevaplarıyla güncelleme)
│  ├─ context-service.ts      ← Profil + hafızadan bağlam kurma, otomatik hatırlama
│  ├─ account-service.ts      ← Veri dışa aktarma, hesap silme
│  ├─ billing-service.ts      ← Checkout, müşteri portalı, webhook senkronizasyonu
│  └─ session.ts              ← Oturumdaki kullanıcı + hesap + haklar
│
├─ infrastructure/            ← DIŞ SİSTEM ADAPTÖRLERİ
│  ├─ ai/claude-personalizer.ts ← ContentPersonalizer'ın Claude (claude-opus-5) uygulaması
│  ├─ supabase/               ← İstemciler, repository'ler, proxy oturum yenileme
│  └─ stripe.ts
│
├─ app/                       ← UI + TAŞIMA KATMANI (ince; iş mantığı içermez)
│  ├─ (auth)/giris, kayit     ← E-posta/şifre ile giriş ve kayıt
│  ├─ (app)/panel             ← Giriş sonrası panel: son planlar, profiller, durum
│  ├─ (app)/olustur           ← 1) kategori 2) alt başlıklar 3) profil/durum + plan uzunluğu
│  ├─ (app)/profiller         ← Profiller ve hafıza yönetimi
│  ├─ (app)/ayarlar           ← Hesap, güvenlik, kişiselleştirme, veri ve gizlilik
│  ├─ (app)/ciktilar/[id]     ← Çıktı görüntüleme/düzenleme, PDF ve Markdown dışa aktarma
│  ├─ (app)/abonelik          ← Deneme durumu, Stripe Checkout, müşteri portalı
│  ├─ api/stripe/webhook      ← Stripe olayları
│  └─ auth/callback, cikis
└─ proxy.ts                   ← (Next 16'da middleware'in yeni adı) oturum yenileme + koruma
```

### Çıktı üretim akışı

Üretim **arka plan işi** olarak çalışır: istek işi kaydeder ve hemen yanıt döner,
plan yanıt gönderildikten sonra sunucuda hazırlanır. Kullanıcı sayfayı kapatsa da
plan hazırlanmaya devam eder.

```
Web formu ──► server action (app/(app)/olustur/actions.ts)
                    │  startGenerationJob → generation_jobs kaydı (services/job-service.ts)
                    │  after(job.run)     → yanıt sonrası çalışır (maxDuration = 300 sn)
                    │  redirect           → /ciktilar/hazirlaniyor/[jobId]
                    │                        (bekleme ekranı GET /api/isler/[id] ile durumu sorar)
                    ▼
         services/generation-service.ts ── generateForUser(userId, { subcategoryIds }, ek, { onProgress })
            1. hesap + hak kontrolü           (core/billing/entitlements)
            2. generateOutput(...)            (core/output/generator — yan etkisiz)
            3. consume_generation_credit RPC  (atomik; eşzamanlı istekte limit aşılamaz)
            4. generated_outputs + user_selections kaydı
         iş durumu: queued → running → succeeded | failed
         (15 dk içinde bitmeyen iş "yarıda kesildi" sayılır; hak yalnızca başarıda düşer)
```

"Cevaplarımla planı güncelle" de aynı şekilde arka plan işi olarak çalışır (`startRefineJob`).

**İleride şirket entegrasyonu (API)** için yeni iş mantığı yazmak gerekmez; yalnızca yeni bir taşıma katmanı eklenir. Örnek:

```ts
// src/app/api/v1/outputs/route.ts
export async function POST(req: Request) {
  const client = await authenticateApiKey(req);          // yeni: API anahtarı → kullanıcı/şirket
  const body = generateOutputInputSchema.parse(await req.json());
  const { outputId, document } = await generateForUser(client.userId, body);
  return Response.json({ id: outputId, document, markdown: renderDocumentMarkdown(document) });
}
```

Entegrasyon verisi (ör. CRM'den gelen paydaş listesi) ile ön doldurma gerekirse, bu da `core/output` içinde `instantiate` sonrası uygulanan saf bir fonksiyon olarak eklenir.

---

## Veri modeli

| Tablo | Açıklama | İstemci erişimi (RLS) |
|---|---|---|
| `categories` | Ana başlıklar (slug, name, description, sort_order) | Herkes okur |
| `subcategories` | Alt başlıklar, `output_type` enum: `template` \| `checklist` \| `guide` | Herkes okur |
| `output_templates` | İçerik kalıbı (`content` JSONB), versiyonlu; alt başlık başına 1 aktif | **Kapalı** — yalnızca sunucu, hak kontrolünden sonra |
| `users` | `auth.users` ile 1-1; `subscription_status`, `trial_started_at`, `trial_limit_used`, Stripe alanları | Yalnızca kendi satırını **okur**; yazma yalnızca sunucu |
| `generated_outputs` | Üretilen ve düzenlenen dokümanlar | Kendi kayıtlarını okur/günceller/siler |
| `user_selections` | Raporlama: hangi üretimde hangi alt başlık seçildi | Kendi kayıtlarını okur |
| `context_profiles` | Kullanıcının iş/kişisel bağlam profilleri (bellek) | Kendi kayıtlarında tam yetki |
| `profile_memories` | Profile ait öğrenilen bilgiler (plan cevapları + elle eklenen) | Kendi kayıtlarını okur/ekler/siler |
| `user_preferences` | Görünen ad, kişiselleştirme ve otomatik hatırlama açık/kapalı, varsayılanlar | Kendi satırını okur/günceller |

Migration'lar (`supabase/migrations/`):

1. `…_initial_schema.sql` — tablolar, enum'lar, RLS, kayıtta otomatik profil tetikleyicisi, `consume_generation_credit` fonksiyonu
2. `…_seed_catalog.sql` — taksonomi dokümanındaki 4 kategori ve 37 alt başlık
3. `…_sample_output_templates.sql` — örnek içerikler: **Paydaş Analizi** (şablon), **Risk Yönetimi** (checklist), **Strateji Analizi** (rehber)
4. `…_strategy_analysis_v2_template.sql` — Strateji Analizi: yapay zekânın doldurduğu strateji raporu şablonu
5. `…_profiles_memory_settings.sql` — profiller, hafıza, kullanıcı tercihleri ve RLS politikaları

**İçerik stratejisi — üç kademe:**

1. **Elle hazırlanmış şablon** (`output_templates`): varsa her zaman bu kullanılır; yapay zekâ yalnızca doldurur.
2. **Yapay zekânın tasarladığı şablon**: alt başlığın hazır içeriği yoksa, adı ve açıklamasından yola çıkarak çerçeveyi Claude tasarlar ve doldurur (`core/ai/custom-document.ts`). Böylece 37 alt başlığın tamamı ilk günden kullanılabilir.
3. **Serbest istek**: kullanıcı kategori sayfasında ne istediğini kendi cümlesiyle yazar; listede karşılığı olmayan ihtiyaçlar da karşılanır. Bu bölümler kataloğa bağlı olmadığı için `user_selections` raporlamasına girmez (`isCatalogSection`).

Zamanla en çok kullanılan başlıkların elle hazırlanmış sürümü eklenir; kod değişikliği gerekmez, yeni satır eklendiği anda 1. kademe devreye girer. Yeni içerik için `src/core/output/content-schema.ts` şemasına uygun JSON yeterlidir.

### Yapay zekâ ile kişiselleştirme

- Kullanıcı durumunu **kısa sorular**, **detaylı sorular**, **serbest metin** ya da kayıtlı bir **profil** ile verir; plan uzunluğunu (özet/detaylı) seçer.
- `core/ai/template-fill.ts`: sistem talimatı (danışman rolü + doğruluk kuralları), şablondan bağımsız küçük yanıt şeması ve yanıtın şablona uygulanması. Şablona özel şema, API'nin `compiled grammar is too large` sınırına takıldığı için bilinçli olarak kullanılmaz.
- Model: `claude-opus-5`, akışlı (streaming) istek, `effort`: özet planda `medium`, detaylı planda `high`. Ölçülen (Eylül 2026): hazır şablonu doldurma ~2,5 dk / ~0,25 $; yapay zekânın şablonu tasarlayıp doldurması ~1 dk / ~0,13 $.
- Yanıt şemaları küçük ve şablondan bağımsızdır; şablona özel şema API'nin `compiled grammar is too large` sınırına takılır.
- Yapay zekâ her bölüm için **öne çıkan 3 bulgu**, **varsayımlar** ve **açık sorular** döner. Kullanıcı soruları cevaplayınca `core/output/refiner.ts` planı mevcut içeriği koruyarak revize eder; cevaplar (otomatik hatırlama açıksa) profil hafızasına eklenir.
- Kişiselleştirme ve otomatik hatırlama Ayarlar'dan kapatılabilir; hafıza ve veriler indirilebilir veya silinebilir.

**Tutarlılık (kararların hafızası).** Her plan ayrı üretildiği için birbirinden habersizdir; ikinci plan birincinin bütçe dağılımını bozabilir. Çıktı sayfasındaki "Bu planın kararlarını hatırla" bölümü, `core/ai/decisions.ts` ile dokümandan kalıcı kararları (bütçe dağılımı, tarihler, eşikler, kapsam dışı) çıkarır; kullanıcı onaylar ve seçilenler profil hafızasına `source: 'decision'` olarak yazılır. Sistem talimatı bu kararları bağlayıcı sayar: "çelişme; çelişmen gerekiyorsa gerekçesini açıkça yaz."

**Dosya ekleri.** Plan oluştururken görsel (JPG/PNG/GIF/WEBP), PDF ve metin dosyası (TXT/CSV/MD/JSON) eklenebilir; en fazla 5 dosya, dosya başına 8 MB, toplam 20 MB (`core/ai/attachments.ts`). Dosyalar Claude'a görsel/doküman içerik bloğu olarak iletilir. **Saklanmazlar**: yalnızca üretim anında kullanılır, dokümana sadece adı/türü/boyutu yazılır. Sunucu action gövde sınırı bu nedenle `next.config.ts` içinde 22 MB'a çıkarılmıştır.

### Ücretlendirme kuralları

- Kayıtta `subscription_status = 'trial'`, `trial_limit_used = 0`.
- Her başarılı üretim deneme hakkından 1 düşer (limit: `TRIAL_GENERATION_LIMIT = 3`, `src/core/billing/entitlements.ts`). 3. üretimden sonra durum `expired` olur ve kullanıcı `/abonelik`'e yönlendirilir.
- Hata alan (boş seçim, içerik yok vb.) üretimler hak düşürmez. Soru cevaplarıyla yapılan güncelleme 1 hak sayılır (yapay zekâ maliyeti oluşur).
- Stripe aboneliği `active`/`trialing`/`past_due` → `active` (sınırsız); `canceled`/`unpaid`/`incomplete_expired`/`paused` → `expired`.

---

## Kurulum

### 1. Bağımlılıklar

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase

1. [supabase.com](https://supabase.com)'da proje oluştur.
2. **Project Settings → API Keys**'ten URL, publishable key ve secret key'i `.env.local`'e yaz.
3. Migration'ları uygula:
   ```bash
   npx supabase login
   npx supabase link --project-ref <proje-ref>
   npx supabase db push
   ```
4. **Authentication → URL Configuration**: Site URL = `http://localhost:3000` (canlıda Vercel adresi), Redirect URLs'e `http://localhost:3000/auth/callback` ve canlı karşılığını ekle.
5. İstersen geliştirme sırasında **Authentication → Providers → Email → Confirm email**'i kapatarak doğrulama e-postası beklemeden test edebilirsin.

### 3. Stripe

1. **Product catalog**'da iki ürün oluştur (Başlangıç, Profesyonel); her birine aylık ve yıllık yinelenen fiyat ekle. Tutarlar `src/core/billing/plans.ts` ile aynı olmalı (249 / 2.388 TL ve 499 / 4.788 TL). Dört `price_…` kimliğini `STRIPE_PRICE_STARTER_MONTHLY`, `STRIPE_PRICE_STARTER_YEARLY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`'ye yaz. Ayrıca "Tek seferlik paket" ürünü için **tek seferlik** (one-off) 149 TL fiyat oluşturup kimliğini `STRIPE_PRICE_PACK`'e yaz. Fiyatı tanımlanmayan plan/paket ekranda "yakında" görünür.
2. `STRIPE_SECRET_KEY` = test modu secret key.
3. **Settings → Billing → Customer portal**'ı etkinleştir; "Customers can switch plans" seçeneğinde iki ürünün dört fiyatını ekle (plan değişikliği portal üzerinden yapılır).
4. Yerelde webhook:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Çıktıdaki `whsec_…` değerini `STRIPE_WEBHOOK_SECRET`'a yaz.
5. Canlıda **Developers → Webhooks**'ta `https://<alan-adı>/api/stripe/webhook` uç noktasını şu olaylarla ekle:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`.

Test kartı: `4242 4242 4242 4242`, ileri bir tarih, herhangi bir CVC.

### Maliyet koruması

- Abonelikte aylık kredi kotası (Başlangıç 10, Profesyonel 30); detaylı plan 2, özet plan ve güncelleme 1 kredi. Düşüm veritabanında atomik (`consume_credits`), yalnızca üretim başarılıysa.
- Kullanıcı başına en fazla 2 eşzamanlı iş ve saatte 10 iş; site geneli 24 saatte `AI_GLOBAL_DAILY_JOB_LIMIT` (varsayılan 100; kullanıcı arttıkça yükseltin).
- Kayıtsız önizleme: ziyaretçi başına günde 1, site geneli günde 200.
- **Anthropic Console → Settings → Limits**'ten aylık harcama limiti tanımla (son güvenlik ağı).

### 4. Çalıştır

```bash
npm run dev
```

### 5. Vercel'e dağıtım

Repoyu Vercel'e bağla, `.env.example`'daki tüm değişkenleri **Project Settings → Environment Variables**'a ekle (`NEXT_PUBLIC_SITE_URL` = canlı adres) ve Supabase/Stripe'taki URL'leri canlı adresle güncelle.

---

## Güvenlik

- Tüm tablolarda RLS; kullanıcı yalnızca kendi verisini görür. `output_templates` istemciye tamamen kapalıdır.
- `users` tablosuna yazma yalnızca sunucu (service role) üzerinden; abonelik durumu istemciden değiştirilemez.
- Şifre kuralı: en az 8 karakter, en az bir harf ve bir rakam (`core/account/security.ts`). Şifre değişikliği ve hesap silme işlemleri mevcut şifre doğrulanarak yapılır.
- "Şifremi unuttum" akışı; hesabın varlığını açığa çıkarmayan tek tip yanıt.
- Tüm cihazlardan çıkış (`signOut({ scope: "global" })`).
- Güvenlik başlıkları `next.config.ts` içinde: `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` ve üretimde HSTS.
- Yönlendirmelerde yalnızca site içi yollar kabul edilir (açık yönlendirme koruması).

## Notlar ve sonraki adımlar

- **PDF dışa aktarma** şu an tarayıcının yazdırma → "PDF olarak kaydet" özelliğini, yazdırmaya özel CSS ile kullanır (bağımlılık yok, Türkçe karakterler sorunsuz). Sunucu tarafında PDF dosyası üretmek gerekirse (ör. API çıktısı) `@react-pdf/renderer` veya headless Chromium eklenebilir.
- Word/Excel dosyaları doğrudan desteklenmez (PDF'e çevirip yüklemek gerekir); gerekirse sunucu tarafı dönüştürme eklenebilir.
- **Testler:** `npm test` (Vitest). `tests/core` çekirdek kuralları ve plan motorunu sahte yapay zekâ ile, `tests/db` tüm migration'ları bellek içi Postgres'e (PGlite) uygulayıp RLS izolasyonunu ve deneme hakkı fonksiyonunu test eder. Değişiklikten sonra ve GitHub'a kaydetmeden önce çalıştırılmalı.
- İçerik yönetimi için basit bir admin paneli (output_templates CRUD + şema doğrulama) sonraki mantıklı adımdır.
