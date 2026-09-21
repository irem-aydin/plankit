import { describe, expect, it } from "vitest";
import { SAMPLE_PLAN } from "@/content/sample-plan";
import { detectCharts, parseTime, type ChartColumn, type ChartRow, type MatrixChart, type TimelineChart } from "@/core/output/charts";

const LEVELS = ["Yüksek", "Orta", "Düşük"];

describe("parseTime", () => {
  it.each([
    ["1. hafta", 0, 7],
    ["4. hafta", 21, 28],
    ["1. ay", 0, 30],
    ["2-5. ay", 30, 150],
    ["3-6 ay", 90, 180],
    ["0-30 gün", 0, 30],
    ["31-90 gün", 31, 90],
    ["12+ ay", 360, 390],
    ["Hafta 3", 14, 21],
    ["Q2", 91, 182],
  ])("%s → %i..%i gün", (raw, start, end) => {
    expect(parseTime(raw)).toMatchObject({ kind: "relative", start, end });
  });

  it("tarihleri tanır", () => {
    const iso = parseTime("2027-03-15");
    const tr = parseTime("15.03.2027");
    const named = parseTime("15 Mart 2027");
    expect(iso?.kind).toBe("absolute");
    expect(tr?.start).toBe(iso?.start);
    expect(named?.start).toBe(iso?.start);
    const month = parseTime("Mayıs 2027");
    expect(month && month.end - month.start).toBe(31);
  });

  it.each(["", "Belirsiz", "Sürekli", "Her ay", "2027 yılı içinde", "Aylık", "ASAP"])("tanımadığını null döner: %s", (raw) => {
    expect(parseTime(raw)).toBeNull();
  });
});

describe("detectCharts — SWOT", () => {
  it("örnek plandaki SWOT tablosundan 4'lü kutu çıkarır", () => {
    const body = SAMPLE_PLAN.sections[0].body;
    if (body.kind !== "template") throw new Error();
    const swot = body.sections.find((s) => s.id === "swot")!.table!;
    const [chart] = detectCharts(swot);
    expect(chart.kind).toBe("swot");
    if (chart.kind !== "swot") return;
    expect(chart.quadrants.map((q) => q.items.length)).toEqual([2, 2, 2, 2]);
    expect(chart.quadrants[0].items[0]).toContain("Hafta sonu tam kapasite");
  });

  it("yalnızca tek tür doluysa SWOT çizmez", () => {
    const columns: ChartColumn[] = [
      { id: "f", label: "Faktör" },
      { id: "t", label: "Tür", type: "select", options: ["Güçlü yön", "Zayıf yön", "Fırsat", "Tehdit"] },
    ];
    const rows = [{ f: "A", t: "Fırsat" }, { f: "B", t: "Fırsat" }];
    expect(detectCharts({ columns, rows })).toEqual([]);
  });
});

describe("detectCharts — seviye matrisi", () => {
  const columns: ChartColumn[] = [
    { id: "risk", label: "Risk" },
    { id: "etki", label: "Etki", type: "select", options: LEVELS },
    { id: "olasilik", label: "Olasılık", type: "select", options: LEVELS },
    { id: "onlem", label: "Önlem" },
  ];
  const rows: ChartRow[] = [
    { risk: "Kur artışı", etki: "Yüksek", olasilik: "Orta", onlem: "x" },
    { risk: "Personel ayrılığı", etki: "Orta", olasilik: "Düşük", onlem: "y" },
    { risk: "Yarım kalan satır", etki: "", olasilik: "Orta", onlem: "" },
  ];

  it("olasılığı yatay, etkiyi dikey eksene koyar; eksik satırı atlar", () => {
    const [chart] = detectCharts({ columns, rows }) as MatrixChart[];
    expect(chart.kind).toBe("matrix");
    expect(chart.xLabel).toBe("Olasılık");
    expect(chart.yLabel).toBe("Etki");
    expect(chart.points).toEqual([
      { label: "Kur artışı", x: 1, y: 2 },
      { label: "Personel ayrılığı", x: 0, y: 1 },
    ]);
  });

  it("paydaş tablosunda ilgi × güç matrisi kurar", () => {
    const stakeholder: ChartColumn[] = [
      { id: "p", label: "Paydaş" },
      { id: "g", label: "Güç / etki", type: "select", options: LEVELS },
      { id: "i", label: "İlgi", type: "select", options: LEVELS },
    ];
    const [chart] = detectCharts({ columns: stakeholder, rows: [{ p: "CEO", g: "Yüksek", i: "Düşük" }, { p: "Ekip", g: "Düşük", i: "Yüksek" }] }) as MatrixChart[];
    expect(chart.xLabel).toBe("İlgi");
    expect(chart.yLabel).toBe("Güç / etki");
  });

  it("tek seviye sütunu varsa matris çizmez", () => {
    expect(detectCharts({ columns: columns.filter((c) => c.id !== "etki"), rows }).some((c) => c.kind === "matrix")).toBe(false);
  });
});

describe("detectCharts — zaman çizelgesi", () => {
  it("örnek plandaki aksiyon planından hafta/ay karışık çizelge çıkarır", () => {
    const body = SAMPLE_PLAN.sections[0].body;
    if (body.kind !== "template") throw new Error();
    const table = body.sections.find((s) => s.id === "aksiyon")!.table!;
    const [chart] = detectCharts(table) as TimelineChart[];
    expect(chart.kind).toBe("timeline");
    expect(chart.items).toHaveLength(6);
    expect(chart.items[0]).toMatchObject({ start: 0, end: 7 });
    expect(chart.span).toBe(180);
    expect(chart.unit).toBe("ay");
  });

  it("tarihli planı ilk tarihe göre hizalar", () => {
    const columns: ChartColumn[] = [{ id: "a", label: "Aksiyon" }, { id: "t", label: "Son tarih" }];
    const rows = [
      { a: "Teklif al", t: "01.03.2027" },
      { a: "Sözleşme", t: "15 Mart 2027" },
      { a: "Açılış", t: "Mayıs 2027" },
    ];
    const [chart] = detectCharts({ columns, rows }) as TimelineChart[];
    expect(chart.items[0].start).toBe(0);
    expect(chart.items[1].start).toBe(14);
    expect(chart.startLabel).toBe("Mart 2027");
  });

  it("satırların çoğu tanınmıyorsa çizelge çizmez", () => {
    const columns: ChartColumn[] = [{ id: "a", label: "Adım" }, { id: "t", label: "Zaman" }];
    const rows = [
      { a: "A", t: "1. ay" },
      { a: "B", t: "Sürekli" },
      { a: "C", t: "İhtiyaç halinde" },
    ];
    expect(detectCharts({ columns, rows })).toEqual([]);
  });

  it("zaman sütunu olmayan tabloda çizelge çizmez", () => {
    const columns: ChartColumn[] = [{ id: "a", label: "Adım" }, { id: "n", label: "Not" }];
    expect(detectCharts({ columns, rows: [{ a: "A", n: "1. ay" }, { a: "B", n: "2. ay" }] })).toEqual([]);
  });
});

describe("detectCharts — dağılım", () => {
  const columns: ChartColumn[] = [
    { id: "i", label: "İş" },
    { id: "d", label: "Durum", type: "select", options: ["Tamamlandı", "Yolunda", "Risk altında", "Gecikti"] },
  ];

  it("durum sütunundan dağılım çıkarır", () => {
    const rows = [{ i: "A", d: "Tamamlandı" }, { i: "B", d: "Yolunda" }, { i: "C", d: "Yolunda" }, { i: "D", d: "Gecikti" }];
    const [chart] = detectCharts({ columns, rows });
    expect(chart).toMatchObject({ kind: "distribution", label: "Durum", total: 4 });
    if (chart.kind === "distribution") expect(chart.counts.find((c) => c.option === "Yolunda")?.count).toBe(2);
  });

  it("tek seçenek kullanılmışsa dağılım çizmez", () => {
    const rows = [{ i: "A", d: "Yolunda" }, { i: "B", d: "Yolunda" }, { i: "C", d: "Yolunda" }];
    expect(detectCharts({ columns, rows })).toEqual([]);
  });
});

it("boş veya tek satırlık tabloda grafik üretmez", () => {
  expect(detectCharts({ columns: [{ id: "a", label: "Adım" }], rows: [] })).toEqual([]);
  expect(detectCharts({ columns: [{ id: "a", label: "Adım" }], rows: [{ a: "" }, { a: "tek" }] })).toEqual([]);
});
