import { CalendarRange, Grid2x2, LayoutGrid, PieChart } from "lucide-react";
import {
  detectCharts,
  type ChartColumn,
  type ChartRow,
  type DistributionChart,
  type MatrixChart,
  type SwotChart,
  type TableChart,
  type TimelineChart,
} from "@/core/output/charts";

/**
 * Tablonun altındaki veriden otomatik görsel özet (SWOT kutusu, risk/paydaş
 * matrisi, zaman çizelgesi, durum dağılımı). Hook kullanmaz; hem sunucu hem
 * istemci bileşenlerinde çalışır ve yazdırmada (PDF) da görünür.
 */
export function TableCharts({ table }: { table: { columns: ChartColumn[]; rows: ChartRow[] } }) {
  const charts = detectCharts(table);
  if (charts.length === 0) return null;
  return (
    <div className="mb-4 space-y-4">
      {charts.map((chart, i) => (
        <ChartFrame key={`${chart.kind}-${i}`} chart={chart} />
      ))}
    </div>
  );
}

const TITLES: Record<TableChart["kind"], { title: string; Icon: typeof Grid2x2 }> = {
  swot: { title: "SWOT görünümü", Icon: Grid2x2 },
  matrix: { title: "Matris görünümü", Icon: LayoutGrid },
  timeline: { title: "Zaman çizelgesi", Icon: CalendarRange },
  distribution: { title: "Dağılım", Icon: PieChart },
};

function ChartFrame({ chart }: { chart: TableChart }) {
  const { title, Icon } = TITLES[chart.kind];
  return (
    <figure className="break-inside-avoid rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-4 print:border-slate-300 print:bg-white">
      <figcaption className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        <Icon className="size-3.5" aria-hidden />
        {title}
      </figcaption>
      {chart.kind === "swot" && <Swot chart={chart} />}
      {chart.kind === "matrix" && <Matrix chart={chart} />}
      {chart.kind === "timeline" && <Timeline chart={chart} />}
      {chart.kind === "distribution" && <Distribution chart={chart} />}
    </figure>
  );
}

// ------------------------------------------------------------------- SWOT

const SWOT_STYLE: Record<SwotChart["quadrants"][number]["key"], string> = {
  strengths: "border-emerald-200 bg-emerald-50 text-emerald-950 [--dot:var(--color-emerald-500)]",
  weaknesses: "border-amber-200 bg-amber-50 text-amber-950 [--dot:var(--color-amber-500)]",
  opportunities: "border-sky-200 bg-sky-50 text-sky-950 [--dot:var(--color-sky-500)]",
  threats: "border-red-200 bg-red-50 text-red-950 [--dot:var(--color-red-500)]",
};

function Swot({ chart }: { chart: SwotChart }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {chart.quadrants.map((q) => (
        <div key={q.key} className={`rounded-lg border p-3 ${SWOT_STYLE[q.key]}`}>
          <p className="text-sm font-semibold">{q.title}</p>
          {q.items.length === 0 ? (
            <p className="mt-1.5 text-xs opacity-60">—</p>
          ) : (
            <ul className="mt-1.5 space-y-1 text-xs leading-snug">
              {q.items.map((item, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--dot)]" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ matris

/** Sağ üst (yüksek × yüksek) kırmızı, sol alt yeşil. */
function cellTone(x: number, y: number) {
  const score = x + y;
  if (score >= 3) return "bg-red-100 border-red-200";
  if (score === 2) return "bg-amber-100 border-amber-200";
  return "bg-emerald-50 border-emerald-200";
}

function Matrix({ chart }: { chart: MatrixChart }) {
  const numbered = chart.points.map((p, i) => ({ ...p, n: i + 1 }));
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,20rem)_1fr]">
      <div className="flex gap-2">
        <div className="flex items-center">
          <span className="-rotate-180 text-xs font-medium text-slate-600 [writing-mode:vertical-rl]">{chart.yLabel} →</span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-1">
            {[2, 1, 0].map((y) => (
              <Row key={y} y={y} chart={chart} points={numbered} />
            ))}
            <span />
            {chart.levels.map((l) => (
              <span key={l} className="pt-1 text-center text-[10px] text-slate-500">
                {l}
              </span>
            ))}
          </div>
          <p className="mt-1 text-center text-xs font-medium text-slate-600">{chart.xLabel} →</p>
        </div>
      </div>
      <ol className="space-y-1 self-center text-xs text-slate-700">
        {numbered.map((p) => (
          <li key={p.n} className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
              {p.n}
            </span>
            <span className="pt-0.5">{p.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Row({ y, chart, points }: { y: number; chart: MatrixChart; points: (MatrixChart["points"][number] & { n: number })[] }) {
  return (
    <>
      <span className="flex items-center justify-end pr-1 text-[10px] text-slate-500">{chart.levels[y]}</span>
      {[0, 1, 2].map((x) => (
        <div key={x} className={`flex min-h-14 flex-wrap content-center justify-center gap-1 rounded-md border p-1 ${cellTone(x, y)}`}>
          {points
            .filter((p) => p.x === x && p.y === y)
            .map((p) => (
              <span
                key={p.n}
                title={p.label}
                className="flex size-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white"
              >
                {p.n}
              </span>
            ))}
        </div>
      ))}
    </>
  );
}

// ------------------------------------------------------------ zaman çizelgesi

const UNIT_DAYS = { gün: 1, hafta: 7, ay: 30 } as const;
const monthFormat = new Intl.DateTimeFormat("tr-TR", { month: "short", timeZone: "UTC" });

function ticks(chart: TimelineChart): { at: number; label: string }[] {
  const step = UNIT_DAYS[chart.unit];
  const count = Math.ceil(chart.span / step);
  // Çok sık etiket olmasın: en fazla ~8 etiket.
  const every = Math.max(1, Math.ceil(count / 8));
  const result: { at: number; label: string }[] = [];
  for (let i = 0; i < count; i += every) {
    const at = i * step;
    const label =
      chart.origin !== null
        ? monthFormat.format(new Date((chart.origin + at) * 86_400_000))
        : chart.unit === "gün"
          ? `${i + 1}. gün`
          : chart.unit === "hafta"
            ? `H${i + 1}`
            : `${i + 1}. ay`;
    result.push({ at, label });
  }
  return result;
}

function Timeline({ chart }: { chart: TimelineChart }) {
  const pct = (days: number) => `${Math.min(100, (days / chart.span) * 100)}%`;
  const axis = ticks(chart);
  return (
    <div className="text-xs">
      {chart.startLabel && <p className="mb-2 text-slate-500">Başlangıç: {chart.startLabel}</p>}
      <div className="grid grid-cols-[minmax(0,11rem)_1fr] gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,16rem)_1fr]">
        <span />
        <div className="relative h-4 border-b border-slate-200">
          {axis.map((t) => (
            <span key={t.at} className="absolute top-0 -translate-x-0 text-[10px] whitespace-nowrap text-slate-500" style={{ left: pct(t.at) }}>
              {t.label}
            </span>
          ))}
        </div>
        {chart.items.map((item, i) => (
          <TimelineRow key={i} item={item} pct={pct} axis={axis} index={i} />
        ))}
      </div>
    </div>
  );
}

const BAR_COLORS = ["bg-rose-500", "bg-pink-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-red-500"];

function TimelineRow({
  item,
  pct,
  axis,
  index,
}: {
  item: TimelineChart["items"][number];
  pct: (d: number) => string;
  axis: { at: number }[];
  index: number;
}) {
  const width = Math.max(item.end - item.start, 0);
  return (
    <>
      <span className="truncate py-0.5 text-slate-700" title={item.label}>
        {item.label}
      </span>
      <div className="relative h-5 rounded bg-slate-100/70">
        {axis.map((t) => (
          <span key={t.at} className="absolute inset-y-0 w-px bg-slate-200" style={{ left: pct(t.at) }} aria-hidden />
        ))}
        <span
          title={item.raw}
          className={`absolute inset-y-0.5 rounded ${BAR_COLORS[index % BAR_COLORS.length]}`}
          style={{ left: pct(item.start), width: `max(0.5rem, ${pct(width)})` }}
        />
      </div>
    </>
  );
}

// ----------------------------------------------------------------- dağılım

function optionTone(option: string, index: number) {
  const o = option.toLocaleLowerCase("tr-TR");
  if (/tamam|yolunda|önerilen|olmazsa|done|on track|recommended/.test(o)) return "bg-emerald-500";
  if (/risk|dikkat|koşullu|önemli|alternatif|at risk/.test(o)) return "bg-amber-500";
  if (/gecik|önerilmi|kritik|blocked|late/.test(o)) return "bg-red-500";
  return ["bg-rose-500", "bg-sky-500", "bg-pink-500", "bg-slate-400"][index % 4];
}

function Distribution({ chart }: { chart: DistributionChart }) {
  const visible = chart.counts.filter((c) => c.count > 0);
  return (
    <div>
      <p className="mb-2 text-xs text-slate-600">
        {chart.label} · {chart.total} satır
      </p>
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
        {visible.map((c) => (
          <span
            key={c.option}
            className={optionTone(c.option, chart.counts.indexOf(c))}
            style={{ width: `${(c.count / chart.total) * 100}%` }}
            title={`${c.option}: ${c.count}`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
        {visible.map((c) => (
          <li key={c.option} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${optionTone(c.option, chart.counts.indexOf(c))}`} aria-hidden />
            {c.option} <span className="text-slate-500">({c.count})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
