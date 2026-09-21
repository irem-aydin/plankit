/**
 * Tablolardan otomatik grafik çıkarımı (saf fonksiyonlar).
 *
 * Hazır şablonlar da yapay zekânın tasarladığı tablolar da farklı sütun
 * adları kullanabilir; bu yüzden grafikler sütun adlarından ve seçenek
 * listelerinden tanınır. Emin olunamayan durumda grafik üretilmez (yanlış
 * grafik göstermektense hiç göstermemek tercih edilir).
 */

export interface ChartColumn {
  id: string;
  label: string;
  type?: "text" | "select";
  options?: string[];
}

export type ChartRow = Record<string, string>;

export interface SwotChart {
  kind: "swot";
  quadrants: { key: "strengths" | "weaknesses" | "opportunities" | "threats"; title: string; items: string[] }[];
}

export interface MatrixChart {
  kind: "matrix";
  xLabel: string;
  yLabel: string;
  /** Düşükten yükseğe seviye adları (eksen etiketleri) */
  levels: [string, string, string];
  points: { label: string; x: 0 | 1 | 2; y: 0 | 1 | 2 }[];
}

export interface TimelineChart {
  kind: "timeline";
  /** Eksendeki birim: göreli planlarda "hafta"/"ay", tarihlerde "ay" */
  unit: "gün" | "hafta" | "ay";
  /** Başlangıç noktası tarih ise ilk ayın adı (ör. "Mart 2027") */
  startLabel: string | null;
  /** Tarihli planlarda başlangıç günü (1970'ten bu yana gün); göreli planlarda null */
  origin: number | null;
  /** Gün cinsinden toplam süre */
  span: number;
  items: { label: string; start: number; end: number; raw: string }[];
}

export interface DistributionChart {
  kind: "distribution";
  label: string;
  counts: { option: string; count: number }[];
  total: number;
}

export type TableChart = SwotChart | MatrixChart | TimelineChart | DistributionChart;

// ------------------------------------------------------------ yardımcılar

const lower = (s: string) => s.toLocaleLowerCase("tr-TR").trim();

function filledRows(rows: ChartRow[], columns: ChartColumn[]) {
  return rows.filter((r) => columns.some((c) => (r[c.id] ?? "").trim() !== ""));
}

/** Satırı temsil eden metin: adım/görev/risk gibi adlı sütun, yoksa ilk metin sütunu. */
export function labelColumn(columns: ChartColumn[], exclude: string[] = []): ChartColumn | undefined {
  const candidates = columns.filter((c) => c.type !== "select" && !exclude.includes(c.id));
  const preferred = /adım|aksiyon|görev|faaliyet|iş paketi|kilometre|risk|faktör|paydaş|başlık|madde|konu|hedef|girişim|step|task|action|item|milestone|name/;
  return candidates.find((c) => preferred.test(lower(c.label))) ?? candidates[0];
}

function shorten(text: string, max = 70) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

// ------------------------------------------------------------------ SWOT

const SWOT_KEYS = [
  { key: "strengths", title: "Güçlü yönler", pattern: /^(güçlü|strength)/ },
  { key: "weaknesses", title: "Zayıf yönler", pattern: /^(zayıf|weakness)/ },
  { key: "opportunities", title: "Fırsatlar", pattern: /^(fırsat|opportunit)/ },
  { key: "threats", title: "Tehditler", pattern: /^(tehdit|threat)/ },
] as const;

function swotKey(value: string) {
  return SWOT_KEYS.find((k) => k.pattern.test(lower(value)));
}

function detectSwot(columns: ChartColumn[], rows: ChartRow[]): SwotChart | null {
  const typeColumn =
    columns.find(
      (c) => c.type === "select" && (c.options ?? []).length >= 4 && SWOT_KEYS.every((k) => (c.options ?? []).some((o) => k.pattern.test(lower(o)))),
    ) ??
    // Yapay zekânın tasarladığı tablolarda seçenek listesi olmayabilir: değerlerin çoğu SWOT türüyse o sütundur.
    columns.find((c) => {
      const values = rows.map((r) => (r[c.id] ?? "").trim()).filter(Boolean);
      return values.length >= 2 && mostly(values, (v) => Boolean(swotKey(v)));
    });
  if (!typeColumn) return null;
  const label = labelColumn(columns, [typeColumn.id]);
  if (!label) return null;

  const quadrants = SWOT_KEYS.map((k) => ({ key: k.key, title: k.title, items: [] as string[] }));
  for (const row of rows) {
    const key = swotKey(row[typeColumn.id] ?? "");
    const text = (row[label.id] ?? "").trim();
    if (key && text) quadrants.find((q) => q.key === key.key)!.items.push(shorten(text));
  }
  const filled = quadrants.filter((q) => q.items.length > 0).length;
  return filled >= 2 ? { kind: "swot", quadrants } : null;
}

// ------------------------------------------------------ seviye matrisi

const LEVEL_WORDS: Record<string, 0 | 1 | 2> = {
  düşük: 0, low: 0,
  orta: 1, medium: 1, moderate: 1,
  yüksek: 2, high: 2, kritik: 2, critical: 2,
};

/** "Yüksek", "orta risk", "High", ya da 1-5 ölçeğinde puan → 0/1/2 */
function levelOf(value: string): 0 | 1 | 2 | null {
  const text = lower(value);
  const score = text.match(/^([1-5])(?:\b|$)/);
  if (score) {
    const n = Number(score[1]);
    return n <= 2 ? 0 : n === 3 ? 1 : 2;
  }
  // "Çok yüksek" / "very high" gibi pekiştirmelerde asıl kelimeye bakılır.
  const first = text.replace(/^(çok|very)\s+/, "").split(/[\s/,(—-]+/)[0];
  return first in LEVEL_WORDS ? LEVEL_WORDS[first] : null;
}

/** Değerlerin en az %80'i koşulu sağlıyor mu? */
function mostly(values: string[], test: (v: string) => boolean) {
  return values.length > 0 && values.filter(test).length / values.length >= 0.8;
}

interface LevelAxis {
  label: string;
  /** Eksenin dayandığı sütun (etiket sütunu seçilirken hariç tutulur) */
  columnId: string;
  get: (row: ChartRow) => 0 | 1 | 2 | null;
}

/** "O" / "E" gibi kısaltmaları okunur eksen adına çevirir. */
function axisName(part: string) {
  const p = lower(part);
  if (p === "o" || p === "p") return "Olasılık";
  if (p === "e" || p === "i") return "Etki";
  return part.trim();
}

function levelAxes(columns: ChartColumn[], rows: ChartRow[]): LevelAxis[] {
  const axes: LevelAxis[] = [];
  for (const c of columns) {
    const values = rows.map((r) => (r[c.id] ?? "").trim()).filter(Boolean);

    // Önce birleşik sütun: "Olasılık / Etki" → "Yüksek / Orta", "O/E/Skor" → "3/5/15".
    // (Bu değerler tek bir seviye gibi de okunabildiği için ilk bakılır.)
    const parts = c.label.split("/").map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2 && values.length >= 2) {
      const split = (v: string) => v.split("/").map((x) => x.trim());
      const combined = mostly(values, (v) => {
        const [a, b] = split(v);
        return a !== undefined && b !== undefined && levelOf(a) !== null && levelOf(b) !== null;
      });
      if (combined) {
        axes.push({ label: axisName(parts[0]), columnId: c.id, get: (r) => levelOf(split(r[c.id] ?? "")[0] ?? "") });
        axes.push({ label: axisName(parts[1]), columnId: c.id, get: (r) => levelOf(split(r[c.id] ?? "")[1] ?? "") });
        continue;
      }
    }

    const options = c.options ?? [];
    const isLevel =
      (c.type === "select" && options.length >= 3 && options.length <= 4 && options.every((o) => levelOf(o) !== null)) ||
      (c.type !== "select" &&
        values.length >= 2 &&
        // Yalnızca sayı içeren sütunlar (sıra no vb.) ancak adı eksen adıysa seviye sayılır.
        mostly(values, (v) => levelOf(v) !== null && v.length <= 24 && (!/^\d/.test(v) || isAxisLabel(c.label))));
    if (isLevel) axes.push({ label: c.label, columnId: c.id, get: (r) => levelOf(r[c.id] ?? "") });
  }
  return axes;
}

/** X ekseni tercihleri: olasılık/ilgi; Y ekseni: etki/güç. */
const X_AXIS = /olasılık|ihtimal|probab|likelihood|ilgi|interest|etkilen|maliyet|effort|çaba/;
// "güç" çekimlerde "gücü" olur (ç → c); ikisi de aranır.
const Y_AXIS = /etki|impact|güç|güc|power|değer|value|önem/;

function isAxisLabel(label: string) {
  const l = lower(label);
  return X_AXIS.test(l) || Y_AXIS.test(l);
}

function detectMatrix(columns: ChartColumn[], rows: ChartRow[]): MatrixChart | null {
  const axes = levelAxes(columns, rows);
  // Anlamlı bir matris için iki eksen de tanınan adlar taşımalı (ör. olasılık × etki, ilgi × güç).
  const x = axes.find((a) => X_AXIS.test(lower(a.label)));
  const y = axes.find((a) => a !== x && Y_AXIS.test(lower(a.label)) && !X_AXIS.test(lower(a.label)));
  if (!x || !y) return null;
  const label = labelColumn(columns, [x.columnId, y.columnId]);
  if (!label) return null;

  const points: MatrixChart["points"] = [];
  for (const row of rows) {
    const xv = x.get(row);
    const yv = y.get(row);
    const text = (row[label.id] ?? "").trim();
    if (xv !== null && yv !== null && text) points.push({ label: shorten(text, 50), x: xv, y: yv });
  }
  if (points.length < 2) return null;
  const english = rows.some((r) => /^(low|medium|high)/i.test((r[x.columnId] ?? "").trim()));
  return {
    kind: "matrix",
    xLabel: x.label,
    yLabel: y.label,
    levels: english ? ["Low", "Medium", "High"] : ["Düşük", "Orta", "Yüksek"],
    points,
  };
}

// ----------------------------------------------------------- zaman çizelgesi

const UNIT_DAYS: Record<string, number> = {
  gün: 1, gun: 1, day: 1, days: 1,
  hafta: 7, week: 7, weeks: 7, hf: 7,
  ay: 30, month: 30, months: 30,
  çeyrek: 91, quarter: 91, q: 91,
  yıl: 365, year: 365, years: 365,
};

const MONTHS: Record<string, number> = {
  ocak: 0, şubat: 1, mart: 2, nisan: 3, mayıs: 4, haziran: 5, temmuz: 6, ağustos: 7, eylül: 8, ekim: 9, kasım: 10, aralık: 11,
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export type ParsedTime =
  | { kind: "relative"; start: number; end: number; unit: number }
  | { kind: "absolute"; start: number; end: number };

const DAY_MS = 86_400_000;

/**
 * "1. hafta", "2-5. ay", "0-30 gün", "3-6 ay", "12+ ay", "Hafta 3",
 * "2027-03-15", "15.03.2027", "15 Mart 2027", "Mart 2027" gibi ifadeleri
 * gün aralığına çevirir. Tanınamazsa null.
 */
export function parseTime(raw: string): ParsedTime | null {
  const text = lower(raw).replace(/’|'/g, "");
  if (!text) return null;

  // Unit before number: "hafta 3", "ay 2", "q2"
  let m = text.match(/(?:^|\s)(gün|hafta|ay|week|month|q)\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/);
  if (m) {
    const u = UNIT_DAYS[m[1]];
    const a = Number(m[2]);
    const b = m[3] ? Number(m[3]) : a;
    if (u && a >= 1 && b >= a) return { kind: "relative", start: (a - 1) * u, end: b * u, unit: u };
  }

  // Number before unit: "1. hafta", "2-5. ay", "0-30 gün", "3-6 ay", "12+ ay"
  m = text.match(/(?<!\d)(\d{1,3})\s*(?:([-–])\s*(\d{1,3}))?\s*(\+)?\s*(\.)?\s*(gün|gun|hafta|hf|ay|çeyrek|yıl|days?|weeks?|months?|quarters?|years?)\b/);
  if (m) {
    const u = UNIT_DAYS[m[6]] ?? UNIT_DAYS[m[6].replace(/s$/, "")];
    const a = Number(m[1]);
    const b = m[3] ? Number(m[3]) : a;
    const ordinal = Boolean(m[5]) || (!m[3] && u !== 1);
    if (!u || b < a) return null;
    if (m[4]) return { kind: "relative", start: a * u, end: (a + 1) * u, unit: u }; // "12+ ay"
    if (u === 1) return { kind: "relative", start: m[3] ? a : Math.max(0, a - 1), end: m[3] ? b : a, unit: u };
    return ordinal
      ? { kind: "relative", start: Math.max(0, a - 1) * u, end: b * u, unit: u }
      : { kind: "relative", start: a * u, end: b * u, unit: u };
  }

  // ISO: 2027-03-15
  m = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return absoluteDay(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  // 15.03.2027 / 15/03/2027
  m = text.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (m) return absoluteDay(Number(m[3]), Number(m[2]) - 1, Number(m[1]));

  // 15 Mart 2027 / Mart 2027
  m = text.match(/(?:(\d{1,2})\s+)?([a-zçğıöşü]+)\s+(\d{4})/);
  if (m && m[2] in MONTHS) {
    const year = Number(m[3]);
    const month = MONTHS[m[2]];
    if (m[1]) return absoluteDay(year, month, Number(m[1]));
    const start = Date.UTC(year, month, 1) / DAY_MS;
    const end = Date.UTC(year, month + 1, 1) / DAY_MS;
    return { kind: "absolute", start, end };
  }
  return null;
}

function absoluteDay(year: number, month: number, day: number): ParsedTime | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const start = Date.UTC(year, month, day) / DAY_MS;
  return { kind: "absolute", start, end: start + 7 };
}

const TIME_COLUMN = /tarih|süre|zaman|termin|dönem|takvim|ne zaman|hafta|deadline|date|when|timeline|period|due|schedule/;

function detectTimeline(columns: ChartColumn[], rows: ChartRow[]): TimelineChart | null {
  const timeColumns = columns.filter((c) => TIME_COLUMN.test(lower(c.label)));
  for (const col of timeColumns) {
    const label = labelColumn(columns, [col.id]);
    if (!label) continue;
    const parsed = rows
      .map((r) => ({ label: (r[label.id] ?? "").trim(), raw: (r[col.id] ?? "").trim(), time: parseTime(r[col.id] ?? "") }))
      .filter((p) => p.label && p.raw);
    if (parsed.length < 2) continue;

    const relative = parsed.filter((p) => p.time?.kind === "relative");
    const absolute = parsed.filter((p) => p.time?.kind === "absolute");
    const useRelative = relative.length >= absolute.length;
    const usable = useRelative ? relative : absolute;
    // Satırların çoğu tanınmıyorsa grafik yanıltıcı olur.
    if (usable.length < 2 || usable.length / parsed.length < 0.6) continue;

    const origin = Math.min(...usable.map((p) => p.time!.start));
    const items = usable.map((p) => ({
      label: shorten(p.label, 60),
      start: p.time!.start - (useRelative ? 0 : origin),
      end: p.time!.end - (useRelative ? 0 : origin),
      raw: p.raw,
    }));
    const span = Math.max(...items.map((i) => i.end));
    const units = relative.map((p) => (p.time as { unit: number }).unit);
    const unit: TimelineChart["unit"] = !useRelative
      ? "ay"
      : span <= 21 && units.every((u) => u === 1)
        ? "gün"
        : span <= 16 * 7 && units.every((u) => u <= 7)
          ? "hafta"
          : "ay";
    const startLabel = useRelative
      ? null
      : new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(origin * DAY_MS));
    return { kind: "timeline", unit, startLabel, origin: useRelative ? null : origin, span: Math.max(span, 1), items };
  }
  return null;
}

// ------------------------------------------------------------- dağılım

const STATUS_COLUMN = /durum|öncelik|değerlendirme|status|priority|aşama|stage/;

function detectDistribution(columns: ChartColumn[], rows: ChartRow[], used: Set<string>): DistributionChart | null {
  const col = columns.find(
    (c) => c.type === "select" && !used.has(c.id) && (c.options ?? []).length >= 2 && STATUS_COLUMN.test(lower(c.label)),
  );
  if (!col) return null;
  const values = rows.map((r) => (r[col.id] ?? "").trim()).filter(Boolean);
  if (values.length < 3) return null;
  const counts = (col.options ?? []).map((option) => ({ option, count: values.filter((v) => v === option).length }));
  const total = counts.reduce((n, c) => n + c.count, 0);
  if (total < 3 || counts.filter((c) => c.count > 0).length < 2) return null;
  return { kind: "distribution", label: col.label, counts, total };
}

// --------------------------------------------------------------- giriş

/** Bir tablo için uygun grafikleri döner (en fazla 2; öncelik sırası: SWOT, matris, zaman, dağılım). */
export function detectCharts(table: { columns: ChartColumn[]; rows: ChartRow[] }): TableChart[] {
  const rows = filledRows(table.rows, table.columns);
  if (rows.length < 2) return [];
  const charts: TableChart[] = [];
  const used = new Set<string>();

  const swot = detectSwot(table.columns, rows);
  if (swot) charts.push(swot);

  const matrix = detectMatrix(table.columns, rows);
  if (matrix) {
    charts.push(matrix);
    for (const a of levelAxes(table.columns, rows)) if (a.label === matrix.xLabel || a.label === matrix.yLabel) used.add(a.columnId);
  }

  const timeline = detectTimeline(table.columns, rows);
  if (timeline) charts.push(timeline);

  if (charts.length === 0) {
    const distribution = detectDistribution(table.columns, rows, used);
    if (distribution) charts.push(distribution);
  }
  return charts.slice(0, 2);
}
