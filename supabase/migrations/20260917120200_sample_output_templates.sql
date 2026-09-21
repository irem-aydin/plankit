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
