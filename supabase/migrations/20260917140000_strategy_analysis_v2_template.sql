-- =====================================================================
-- Strateji Analizi v2: rehber (guide) → yapay zekâ ile doldurulabilen
-- strateji raporu şablonu (template). v1 pasife alınır, silinmez.
-- =====================================================================

update public.subcategories s
set output_type = 'template',
    description = 'Mevcut durum, hedefler, stratejik alternatifler, aksiyon planı ve riskler — durumuna özel.'
from public.categories c
where c.id = s.category_id and c.slug = 'is-analizi' and s.slug = 'strateji-analizi';

update public.output_templates t
set is_active = false
from public.subcategories s
join public.categories c on c.id = s.category_id
where t.subcategory_id = s.id
  and c.slug = 'is-analizi' and s.slug = 'strateji-analizi'
  and t.is_active;

insert into public.output_templates (subcategory_id, version, content)
select s.id, 2, $json$
{
  "kind": "template",
  "summary": "İş ihtiyacından yola çıkarak mevcut durumu, hedeflenen geleceği ve aradaki boşluğu ortaya koyan; alternatifleri karşılaştırıp önerilen stratejiyi, somut aksiyon planını ve riskleri tanımlayan strateji analizi raporu (BABOK v3 Strateji Analizi yaklaşımı).",
  "sections": [
    {
      "id": "executive_summary",
      "title": "1. Yönetici Özeti",
      "description": "Karar vericinin 1 dakikada okuyacağı özet: sorun, önerilen yol ve beklenen sonuç.",
      "fields": [
        { "id": "business_need", "label": "İş ihtiyacı (sorun / fırsat)", "type": "textarea", "help": "Çözüm değil ihtiyaç; mümkünse rakamla ve çözülmezse maliyetiyle." },
        { "id": "recommendation", "label": "Önerilen strateji (özet)", "type": "textarea" },
        { "id": "expected_outcome", "label": "Beklenen sonuç ve zaman çerçevesi", "type": "textarea" }
      ]
    },
    {
      "id": "swot",
      "title": "2. Mevcut Durum Analizi (SWOT)",
      "description": "İç güçlü/zayıf yönler ve dış fırsat/tehditler. Her maddenin stratejiye ne anlama geldiğini yazın.",
      "table": {
        "columns": [
          { "id": "type", "label": "Tür", "type": "select", "options": ["Güçlü yön", "Zayıf yön", "Fırsat", "Tehdit"] },
          { "id": "item", "label": "Madde" },
          { "id": "impact", "label": "Etki", "type": "select", "options": ["Yüksek", "Orta", "Düşük"] },
          { "id": "implication", "label": "Stratejiye etkisi" }
        ],
        "emptyRows": 4,
        "exampleRows": [
          { "type": "Zayıf yön", "item": "Sipariş verisi yalnızca kasada tutuluyor", "impact": "Yüksek", "implication": "Online kanala geçmeden önce ürün/satış verisi merkezileştirilmeli" }
        ]
      }
    },
    {
      "id": "objectives",
      "title": "3. Hedef Durum ve Başarı Ölçütleri",
      "description": "Değişim tamamlandığında ulaşılacak ölçülebilir hedefler (SMART).",
      "table": {
        "columns": [
          { "id": "objective", "label": "Hedef" },
          { "id": "kpi", "label": "Ölçüt (KPI)" },
          { "id": "baseline", "label": "Mevcut değer" },
          { "id": "target", "label": "Hedef değer" },
          { "id": "deadline", "label": "Hedef tarih" }
        ],
        "emptyRows": 3,
        "exampleRows": [
          { "objective": "Online satış kanalını büyütmek", "kpi": "Online satışların toplam ciroya oranı", "baseline": "%0", "target": "%20", "deadline": "Eylül 2027" }
        ]
      }
    },
    {
      "id": "gap_analysis",
      "title": "4. Boşluk (Gap) Analizi",
      "description": "Mevcut ve hedef durum arasındaki farklar; her boşluk bir değişim ihtiyacıdır.",
      "table": {
        "columns": [
          { "id": "dimension", "label": "Boyut", "type": "select", "options": ["Süreç", "İnsan / yetkinlik", "Teknoloji", "Veri", "Organizasyon", "Müşteri / pazar", "Finans"] },
          { "id": "current", "label": "Mevcut durum" },
          { "id": "future", "label": "Hedef durum" },
          { "id": "change", "label": "Gereken değişim" }
        ],
        "emptyRows": 4,
        "exampleRows": []
      }
    },
    {
      "id": "options",
      "title": "5. Stratejik Alternatifler",
      "description": "En az üç seçeneği (\"hiçbir şey yapmamak\" dahil) karşılaştırın.",
      "table": {
        "columns": [
          { "id": "option", "label": "Seçenek" },
          { "id": "pros", "label": "Artıları" },
          { "id": "cons", "label": "Eksileri" },
          { "id": "cost", "label": "Maliyet", "type": "select", "options": ["Düşük", "Orta", "Yüksek"] },
          { "id": "risk", "label": "Risk", "type": "select", "options": ["Düşük", "Orta", "Yüksek"] },
          { "id": "verdict", "label": "Değerlendirme", "type": "select", "options": ["Önerilen", "Alternatif", "Önerilmiyor"] }
        ],
        "emptyRows": 3,
        "exampleRows": []
      }
    },
    {
      "id": "strategy",
      "title": "6. Önerilen Strateji ve Gerekçesi",
      "fields": [
        { "id": "strategy", "label": "Strateji", "type": "textarea", "help": "Ne yapılacak, hangi sırayla, hangi geçiş aşamalarıyla." },
        { "id": "rationale", "label": "Neden bu seçenek?", "type": "textarea" },
        { "id": "out_of_scope", "label": "Bilinçli olarak kapsam dışı bırakılanlar", "type": "textarea" },
        { "id": "resources", "label": "Gerekli kaynaklar (bütçe, ekip, araç)", "type": "textarea" }
      ]
    },
    {
      "id": "action_plan",
      "title": "7. Aksiyon Planı",
      "description": "Stratejiyi hayata geçirecek somut adımlar. Her adımın sorumlusu ve başarı ölçütü olmalı.",
      "table": {
        "columns": [
          { "id": "phase", "label": "Dönem", "type": "select", "options": ["0-30 gün", "31-90 gün", "3-6 ay", "6-12 ay", "12+ ay"] },
          { "id": "action", "label": "Aksiyon" },
          { "id": "owner", "label": "Sorumlu (rol)" },
          { "id": "deliverable", "label": "Çıktı / teslimat" },
          { "id": "priority", "label": "Öncelik", "type": "select", "options": ["Kritik", "Yüksek", "Orta", "Düşük"] },
          { "id": "success", "label": "Başarı ölçütü" }
        ],
        "emptyRows": 6,
        "exampleRows": [
          { "phase": "0-30 gün", "action": "Son 12 ayın satış verisini ürün bazında çıkar, en kârlı 20 ürünü belirle", "owner": "Operasyon Müdürü", "deliverable": "Ürün kârlılık listesi", "priority": "Kritik", "success": "Liste yönetim toplantısında onaylandı" }
        ]
      }
    },
    {
      "id": "risks",
      "title": "8. Riskler ve Önlemler",
      "table": {
        "columns": [
          { "id": "risk", "label": "Risk" },
          { "id": "probability", "label": "Olasılık", "type": "select", "options": ["Yüksek", "Orta", "Düşük"] },
          { "id": "impact", "label": "Etki", "type": "select", "options": ["Yüksek", "Orta", "Düşük"] },
          { "id": "mitigation", "label": "Önlem" },
          { "id": "owner", "label": "Sorumlu" }
        ],
        "emptyRows": 4,
        "exampleRows": []
      }
    },
    {
      "id": "governance",
      "title": "9. Takip ve İlk Adımlar",
      "fields": [
        { "id": "first_steps", "label": "Bu hafta atılacak ilk 3 adım", "type": "textarea" },
        { "id": "review_rhythm", "label": "Takip ritmi ve karar mekanizması", "type": "textarea", "help": "Kim, ne sıklıkla, hangi göstergelere bakarak karar verecek?" },
        { "id": "decision_points", "label": "Stratejiyi yeniden değerlendirme noktaları", "type": "textarea", "help": "Hangi sonuç görülürse yön değiştirilmeli?" }
      ]
    }
  ]
}
$json$::jsonb
from public.subcategories s
join public.categories c on c.id = s.category_id
where c.slug = 'is-analizi' and s.slug = 'strateji-analizi';
