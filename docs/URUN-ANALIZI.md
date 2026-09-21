# PlanKit — Ürün Analizi ve Yol Haritası

**Tarih:** 21 Eylül 2026 · **Hazırlayan:** geliştirme oturumu · **Durum:** geliştirme aşaması, henüz yayında değil

Bu doküman üç soruya cevap verir: bugün elimizde ne var, yayına almadan önce ne düzeltilmeli, sonra ne eklemeliyiz.

---

## 1. Bugün elimizde ne var?

| Alan | Durum |
|---|---|
| Kod | 78 dosya, ~7.800 satır; tip kontrolü ve lint temiz |
| İçerik | 4 kategori, 46 aktif başlık, 8 elle hazırlanmış şablon |
| Yapay zekâ | Hazır şablonu doldurma, şablonu sıfırdan tasarlama, soru-cevapla güncelleme, karar çıkarımı |
| Bellek | Profiller (iş/kişisel), otomatik hatırlama, plandaki kararların hafızası |
| Dosya | Görsel, PDF ve metin dosyası okuma (saklanmadan) |
| Hesap | Kayıt, giriş, şifre sıfırlama, ayarlar, veri indirme, hesap silme |
| Güvenlik | Satır bazlı veri izolasyonu (RLS), güvenlik başlıkları, şifre kuralı |
| Ödeme | Kod hazır, Stripe hesabına bağlı değil |
| Yayın | Yok; yalnızca geliştirme bilgisayarında çalışıyor |

**Ölçülen performans** (zeytinyağı ve kreş vakalarıyla, Eylül 2026):

| İşlem | Süre | Maliyet |
|---|---|---|
| Hazır şablonu doldurma (özet) | ~2,5 dk | ~0,25 $ |
| Yapay zekânın şablonu tasarlayıp doldurması | ~1 dk | ~0,13 $ |
| Dosya ekli üretim | ~1,5 dk | ~0,17 $ |
| Cevaplarla güncelleme | ~5 dk | ~0,67 $ |
| Karar çıkarımı | ~2 dk | ~0,06 $ |

Bugüne kadar 11 plan üretildi (hepsi test amaçlı).

---

## 2. Yayına almadan önce çözülmesi gerekenler

### 2.1 🟡 Sunucu zaman sınırı — büyük ölçüde çözüldü (21.09.2026)

**Yapıldı (seçenek B):** plan üretimi ve güncellemesi artık **arka plan işi** olarak çalışıyor. İstek yalnızca işi kaydeder (`generation_jobs` tablosu) ve kullanıcıyı bekleme sayfasına yönlendirir; üretim yanıt gönderildikten sonra sunucuda sürer (Next.js `after`). Kullanıcı sayfayı kapatabilir, bağlantısı kopabilir; plan hazırlanmaya devam eder ve Planlarım'da görünür. Bekleme ekranı gerçek ilerlemeyi gösterir ("1 / 2 bölüm hazır"). Kullanım hakkı yalnızca plan başarıyla hazırlanırsa düşer. Aynı anda en fazla 2 iş çalışabilir; deneme kullanıcısı kalan hakkından fazla işi aynı anda başlatamaz.

**Kalan sınır:** arka plan işi de Vercel'in azami çalışma süresine tabidir (`maxDuration = 300` sn; Fluid Compute ile ücretsiz planda da 300 sn, Pro'da 800 sn'ye kadar). Özet planlar (1-2,5 dk) rahat sığar; çok başlıklı detaylı planlar 5 dakikaya yaklaşabilir. Süre aşılırsa iş "yarıda kesildi" olarak gösterilir, hak düşmez. Yayından sonra detaylı planlarda süre aşımı görülürse: Vercel Pro (800 sn) veya ayrı bir kuyruk servisi (Inngest, QStash, Supabase Edge Functions).

*Aşağıdaki değerlendirme ilk analizden (çözüm öncesi) kalmıştır.*

Plan üretimi 1-5 dakika sürüyor. Vercel'de bir isteğin azami süresi **ücretsiz planda 60 saniye**, Pro planda 300 saniye. Bugünkü kurguyla yayına alırsak **planların çoğu "zaman aşımı" hatası verir.**

Üç seçenek var:

| Seçenek | Ne yapılır | Artı | Eksi |
|---|---|---|---|
| A) Vercel Pro + süre uzatma | Aylık 20 $ plan, istek süresi 300 sn | En hızlı çözüm, kod değişikliği az | Detaylı planlar yine sınıra yaklaşır (5 dk) |
| B) Arka plan işi + bekleme ekranı | Üretim arka planda başlar, sayfa "hazırlanıyor" der, bitince bildirir | Sınır tamamen kalkar, kullanıcı sekmeyi kapatabilir | 1-2 günlük geliştirme |
| C) Parça parça üretim | Bölümler ayrı ayrı üretilip birleştirilir | Sınır aşılmaz | Karmaşık, tutarlılık zorlaşır |

**Önerim: B.** Kullanıcı "planın hazırlanıyor, bitince haber vereceğiz" görür; istersen e-posta da gönderilir. Bu, 4 dakika ekran başında bekletmekten de iyi bir deneyim.

### 2.2 🔴 Maliyet koruması yok

Şu an bir kullanıcı abone olduğunda **sınırsız** plan üretebiliyor. Her plan bize 0,13-0,67 $ arası maliyet çıkarıyor. Kötü niyetli ya da aşırı hevesli tek kullanıcı aylık yüzlerce dolar zarar yazdırabilir.

Gerekenler:
- Abonelik başına **aylık üretim tavanı** (ör. 50 plan) ve tavana yaklaşınca uyarı
- Kısa sürede çok istek atılmasını engelleyen basit hız sınırı
- Anthropic panelinde **aylık harcama limiti** tanımlanması (bugün yok)

### 2.3 ✅ Yasal metinler (21.09.2026'da eklendi — taslak)

Türkiye'de kişisel veri işleyen bir hizmet için asgari gereksinimler:
- **KVKK aydınlatma metni** — hangi veriler, ne amaçla, nereye (Anthropic/ABD) gönderiliyor
- **Açık rıza** — yurt dışına veri aktarımı için
- **Kullanım koşulları** — yapay zekâ çıktılarının sorumluluğu ("karar desteği, uzman görüşü yerine geçmez")
- **Çerez bilgilendirmesi** — oturum çerezleri için
- Para almaya başlayınca: **mesafeli satış sözleşmesi** ve **iptal/iade koşulları**

**Yapıldı:** `/yasal` sayfası eklendi; kullanım koşulları, KVKK aydınlatma metni, yurt dışına aktarım (Anthropic/Supabase/Vercel/Stripe), çerez politikası ve sorumluluk reddi bölümleriyle. Kayıt ekranına onay bildirimi, uygulama alt bilgisine ve her çıktının sonuna (yazdırmada da görünen) sorumluluk notu eklendi.

**Kalan iş:** köşeli parantezli alanların (unvan, adres, e-posta) doldurulması ve yayın öncesi hukukçu kontrolü. Ücret tahsil edilmeye başlandığında mesafeli satış sözleşmesi ve iptal/iade koşulları eklenmeli.

### 2.4 ✅ Hata ve yükleniyor ekranları (21.09.2026'da eklendi)

Sayfa geçişlerinde iskelet görünüm, beklenmeyen hatalarda "Tekrar dene" düğmeli Türkçe hata ekranı, olmayan sayfa ve silinmiş plan için Türkçe "bulunamadı" sayfaları eklendi.

### 2.5 ✅ Otomatik testler (21.09.2026'da eklendi)

`npm test` ile 95 test çalışır (~6 sn): hak kuralları, arka plan işi kuralları, plan motoru (sahte yapay zekâ ile), güncelleme, dosya/şifre/yönlendirme kuralları, Markdown ve Word çıktısı, ve **veritabanı testleri** (tüm migration'lar bellek içi Postgres'e uygulanır; kullanıcıların birbirinin verisini göremediği, deneme hakkının 3'te durduğu, hesap silinince tüm verinin silindiği doğrulanır). Testler bilinçli bir hatayı yakaladığı kontrol edilerek doğrulandı.

Eski durum: şu ana kadar her değişikliği elle test ettik. Kritik akışlar (üretim motoru, hak düşme, veri izolasyonu) için otomatik test yazılmazsa, ileride bir değişiklik sessizce bir şeyi bozabilir. Çekirdek katman saf fonksiyonlardan oluştuğu için test yazmak kolay.

---

## 2.6 ✅ Çözülen iki sorun (21.09.2026)

- **Tekrar soru sorma:** "Ne oluşturmak istiyorsun?" kutusuna yazan kullanıcıya bir sonraki adımda aynı sorular tekrar soruluyordu. Artık isteğin kendisi bağlam sayılıyor; yalnızca "eklemek istediğin bir şey var mı?" diye tek bir isteğe bağlı alan gösteriliyor.
- **Dil seçeneği:** Plan dili (Türkçe / English) eklendi. İngilizce seçilirse hazır Türkçe şablonlar kullanılmaz; çerçeveyi de yapay zekâ İngilizce kurar. **Not:** arayüz hâlâ yalnızca Türkçedir; arayüzün de İngilizceye çevrilmesi ayrı bir iştir (bkz. 3.8).

## 3. Ürün olarak eksikler

Öncelik sırasına göre:

### 3.1 ✅ İlk kullanım deneyimi (21.09.2026)
**Yapıldı:** panelde "Başlarken" rehberi (örnek plan → profil → ilk plan) ve herkese açık `/ornek-plan` sayfası (kurgusal kahve dükkânı). Ana sayfada da "Örnek planı gör" bağlantısı var.

Eski durum: yeni kullanıcı giriş yapınca boş bir panel görüyordu. Ne yapacağını anlatan kısa bir karşılama akışı ve **örnek bir plan** (hazır, okunabilir) dönüşümü ciddi artırır. Şu an kullanıcı "bu ne üretecek?" sorusunun cevabını ancak hakkını harcayarak öğreniyor.

### 3.2 ✅ Üretim sırasında ilerleme (21.09.2026)
**Yapıldı:** plan hazırlanırken ve güncellenirken aşamalı ilerleme kartı (geçen süre, ilerleme çubuğu, aşama listesi). Aşamalar süreye göre ilerler; arka plan üretimiyle birlikte gerçek ilerleme de gösteriliyor ("1 / 2 bölüm hazır").

Eski durum: 4 dakikalık dönen çarkı izlemek uzun. "Durum analizi yapılıyor → alternatifler değerlendiriliyor → aksiyon planı yazılıyor" gibi aşamalı mesajlar beklemeyi kısaltır. (Madde 2.1'deki arka plan işiyle birlikte yapılmalı.)

### 3.3 ✅ Planlarım sayfası (21.09.2026)
**Yapıldı:** arama (Türkçe karakter duyarsız), alana ve profile göre filtre, sıralama, yeniden adlandırma ve kopyalama (kopyalama hak düşürmez).

Eski durum: 11 plana kadar idare eder, 50 planda kaybolur. Eksikler: **arama**, kategoriye/profile göre **filtre**, **kopyalama** ("geçen ayki planı güncelle"), yeniden adlandırma.

### 3.4 Paylaşım ve dışa aktarma
**Word (.docx) indirme ve bağlantıyla paylaşma 21.09.2026'da eklendi.** Paylaşılan plan giriş yapmadan salt okunur görüntülenir; anlatılan durum, profil ve dosya adları paylaşılmaz; sayfa arama motorlarına kapalıdır; görüntülenme sayılır; paylaşım kapatılınca bağlantı çalışmaz. Sayfanın altındaki "Senin işin için de hazırlayalım" çağrısı yeni kullanıcı kazanımının ana kanalıdır. Kalan: e-posta ile gönderme.

İlk durumda yalnızca PDF ve Markdown vardı. Eklenebilecekler: **bağlantıyla paylaşma** (salt okunur), **Word (.docx)** çıktısı, e-posta ile gönderme. İş dünyasında Word hâlâ standart.

### 3.5 Düzenleme geçmişi
Kullanıcı planı düzenleyip kaydedince eski hali kayboluyor. Sürüm geçmişi ve "geri al" eklenebilir.

### 3.6 Ekip kullanımı
Bugün her hesap tek kişilik. Şirketler için: aynı profili paylaşan ekip üyeleri, plan üzerinde yorum, rol yetkileri. Bu, en yüksek fiyatlı planın gerekçesi olur.

### 3.7 Kalan 38 başlık için hazır şablon
Şu an 8 başlığın elle hazırlanmış şablonu var; diğerlerinde çerçeveyi yapay zekâ kuruyor. Kalite farkı var: elle hazırlanmışlar daha tutarlı ve örnek satırlı. En çok kullanılanlardan devam edilmeli.

### 3.8 Arayüz dili (i18n) — sonraya bırakıldı (21.09.2026 kararı)
Plan dili seçilebiliyor ama **arayüz metinleri hâlâ Türkçe sabit.** Yurt dışı kullanıcı hedefleniyorsa tüm metinlerin çeviri dosyalarına taşınması gerekir (yaklaşık 400-500 metin, 2-3 günlük iş). Öncelik, hedef pazara göre belirlenmeli: yalnızca Türkiye ise ertelenebilir.

### 3.9 ✅ Öneri ve şikâyet kutusu (21.09.2026)
Uygulama içinde sağ altta sabit "Öneri / Şikâyet" düğmesi. Kullanıcı türü seçer (öneri, şikâyet, hata, diğer), mesajını yazar, isterse e-postayla dönüş ister. Mesajlar Supabase'deki `feedback` tablosunda toplanır (Table Editor'den okunur). Hesap silinince kullanıcının mesajları da silinir.

### 3.12 ✅ Görsel yenileme (21.09.2026)
- **Marka:** logo ve site ikonu; ana renk gül/pembe (rose–pink) tonları; emojiler yerine çizgi ikonlar (lucide).
- **Planlara grafikler:** tablolar otomatik olarak SWOT dört kutusuna, olasılık × etki (veya ilgi × güç) matrisine, zaman çizelgesine ve durum dağılımına dönüşür. Tablo düzenlendikçe grafik güncellenir; PDF'te ve paylaşım sayfasında da görünür. Emin olunamayan tablolarda grafik çizilmez. Word çıktısında grafikler henüz yok.
- **Panel:** özet kartları (toplam, bu ay, görüntülenme, kalan hak), son 6 ay grafiği, alanlara göre dağılım, hızlı başla kartları.
- **Ana sayfa:** canlı ürün önizlemesi (istek yazılır → plan belirir), görsel plan örnekleri, kimler için, sık sorulanlar.
- **Kalan:** karanlık mod (tüm sayfalara dokunduğu için ayrı iş).

### 3.13 ✅ Kullanıcı kazanımı: kayıtsız deneme ve örnek galerisi (21.09.2026)
- **Kayıt olmadan dene (ana sayfa):** ziyaretçi durumunu yazar, ~15 sn'de kısa önizleme (bulgular, ilk adımlar, açık soru) görür; "Planın tamamını oluştur" kayda götürür ve isteği plan formuna hazır taşır. Model: Sonnet 5 (Haiku denendi, Türkçe yazım hataları nedeniyle bırakıldı); istek başına ~0,01-0,02 $. Kota: ziyaretçi başına günde 1 (21.09.2026'da 3'ten indirildi), site geneli günde 200 (en kötü durumda ~3 $/gün). Metin saklanmaz; IP'nin günlük değişen özeti 2 gün tutulur.
- **Örnek plan galerisi (/ornekler):** 4 alanda 8 örnek + kahve örneği; her biri arama motorlarına açık, açıklamalı, yapılandırılmış veri (JSON-LD) içeren ayrı sayfa. Örnekler gerçek plan motoruyla üretildi (scripts/generate-examples.mts). sitemap.xml ve robots.txt eklendi (kullanıcıya özel sayfalar ve paylaşım bağlantıları taranmaz).
- **Grafik algılayıcı geliştirildi:** yapay zekânın düz metin tablolarında da SWOT, "Olasılık / Etki" birleşik sütunları, 1-5 puanları ve "Çok yüksek" gibi ifadeler tanınıyor.

### 3.10 Mobil deneyim
Sayfalar mobil uyumlu ama uzun tabloların düzenlenmesi telefonda zor. Öncelik düşük: bu ürün masaüstünde kullanılır.

---

## 3.11 Çıkarılması veya sadeleştirilmesi gerekenler

**21.09.2026'da yapıldı:** "Boş şablon olarak al" kaldırıldı; Şablon/Checklist/Rehber rozetleri kaldırıldı, yerine yalnızca "⭐ Hazır şablon" etiketi; başlık listesi ilk 6 başlığı gösteriyor, gerisi "Tüm başlıkları gör" altında. Rehber tipinin koddan çıkarılması veritabanı değişikliği gerektirdiği için ertelendi; Markdown küçük bir düğme olarak kaldı.

Ürüne eklemek kadar, gereksiz olanı çıkarmak da önemli. İlk analizde fazlalık gördüklerim:

| Ne | Neden | Öneri |
|---|---|---|
| "Boş şablon olarak al" seçeneği | Yapay zekâsız boş şablon, ürünün değer önerisiyle çelişiyor; kullanıcı doldurmak için zaten uğraşmak istemiyor | Gizlenebilir veya "şablonu önizle" haline getirilebilir |
| Çıktı tipi rozetleri (Şablon / Checklist / Rehber) | Kullanıcı için anlam taşımıyor; hepsi sonuçta "doküman" | Kaldırılabilir; yerine "hazır şablon" / "yapay zekâ kurar" ayrımı gösterilebilir |
| Rehber (guide) çıktı tipi | Artık aktif kullanılan içerik yok; tüm başlıklar template/checklist | İleride kullanılmayacaksa koddan çıkarılabilir |
| Markdown indirme | İş kullanıcısı Markdown bilmiyor | Word eklendi; Markdown küçük bir ".md" düğmesine indirildi, tamamen kaldırılabilir |
| 46 başlığın tamamının listelenmesi | Uzun liste seçim yorgunluğu yaratıyor | En çok kullanılan 6-8 başlık öne çıkarılıp gerisi "tümünü gör" altına alınabilir |

## 4. İş modeli analizi

**Maliyet gerçeği:** Bir aktif kullanıcı ayda 10 plan üretirse bize ~3-4 $ maliyeti olur. Fiyatlandırma bunun üzerine kurulmalı.

Öneri:

| Plan | Fiyat (öneri) | İçerik |
|---|---|---|
| Ücretsiz deneme | 0 | 1 plan (21.09.2026'da 3'ten 1'e indirildi) |
| Bireysel | ~500-750 TL/ay | Ayda 30 plan, tüm başlıklar, dosya ekleme |
| Profesyonel | ~1.500-2.000 TL/ay | Ayda 100 plan, ekip üyesi ekleme, öncelikli destek |
| Kurumsal | Görüşmeye bağlı | API erişimi, özel şablonlar, sınırsıza yakın kullanım |

Dikkat edilecekler:
- Fiyat, plan başına maliyetin en az 5-10 katını karşılamalı (destek, altyapı, kâr).
- "Sınırsız" demek riskli; tavanlı ama cömert limit daha güvenli.
- Yıllık ödemede indirim nakit akışını rahatlatır.

---

## 5. Önerilen sıra

**Aşama 1 — Şimdi (ürünü güçlendir)**
1. ~~Yasal metinler~~ ✅ (21.09.2026)
2. ~~Serbest istekte tekrar soru sorulmaması~~ ✅ (21.09.2026)
3. ~~Plan dili seçeneği~~ ✅ (21.09.2026)
4. ~~Hata ve yükleniyor ekranları~~ ✅ (21.09.2026)
5. ~~İlk kullanım rehberi + örnek plan~~ ✅ (21.09.2026)
6. ~~Planlarım: arama, filtre, kopyalama~~ ✅ (21.09.2026)
7. ~~Aşamalı ilerleme ekranı~~ ✅ · ~~Word indirme~~ ✅ · ~~Öneri/şikâyet kutusu~~ ✅ (21.09.2026)
8. ~~Arayüzün sadeleştirilmesi~~ ✅ (21.09.2026)
9. ~~Otomatik testler~~ ✅ (21.09.2026, 95 test)

**Aşama 2 — Yayın hazırlığı**
10. ~~Arka plan üretimi~~ ✅ (21.09.2026; uzun detaylı planlar için bkz. 2.1 "kalan sınır")
11. Maliyet koruması: aylık tavan, hız sınırı, Anthropic harcama limiti
12. Yasal metinlerin doldurulması ve hukukçu kontrolü
13. Vercel'e yayın + alan adı

**Aşama 3 — Para kazanma**
14. Stripe bağlantısı ve fiyat planları
15. ~~Bağlantıyla paylaşma~~ ✅ (21.09.2026)
16. Kalan başlıklar için hazır şablonlar
17. Arayüzün İngilizceye çevrilmesi (hedef pazara göre)

**Aşama 4 — Büyüme**
18. Ekip hesapları ve yorumlar
19. Düzenleme geçmişi
20. Kurumsal API

---

## 6. Ne ölçmeliyiz?

Yayına alınca ilk günden izlenmesi gerekenler:
- Kayıt olan kullanıcıların **ilk planını üretme oranı** (ürünün değeri burada anlaşılır)
- Deneme hakkını bitirenlerin **abone olma oranı**
- Kullanıcı başına **aylık plan sayısı** ve **yapay zekâ maliyeti**
- Planların **düzenlenme ve indirilme oranı** (kullanılmayan plan, değersiz plandır)
- **"Cevaplarımla güncelle"** ve **"kararları hatırla"** kullanım oranı (ayırt edici özellikler bunlar)

---

## 7. Özet görüş

Ürünün çekirdeği — kullanıcının durumunu anlayıp profesyonel çerçevede somut plan üretmesi — **çalışıyor ve iyi çalışıyor.** Testlerde yapay zekâ, verilen rakamlardan doğru çıkarımlar yaptı, eksik bilgiyi sordu, mevzuat ayrımını gözetti ve gereksiz bir yatırımı planın dışına çıkardı.

Eksikler ürünün özünde değil, **çevresinde**. İlk kullanım, bekleme ekranı, hata ekranları ve yasal zemin (taslak) tamamlandı; kalan kritik konular maliyet koruması ve arka plan üretimi. Bunlar tamamlanmadan yayına alınırsa ürün teknik olarak çalışsa bile kullanıcıya kötü görünür.

Plan üretimi arka plana alındı; yayın önündeki en kritik kalan madde artık **maliyet koruması** (aylık tavan ve Anthropic harcama limiti).
