import type { OutputType } from "@/core/output/content-schema";

const LABELS: Record<OutputType, { label: string; className: string }> = {
  template: { label: "Şablon", className: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  checklist: { label: "Checklist", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  guide: { label: "Rehber", className: "bg-amber-50 text-amber-800 ring-amber-200" },
};

export function OutputTypeBadge({ type }: { type: OutputType }) {
  const { label, className } = LABELS[type];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}
