/**
 * Lightweight, dependency-free chart primitives for the CRM dashboard and
 * reports. Pure CSS/SVG, theme-token driven. Intentionally simple — these are
 * static-prototype visualizations, not an analytics engine.
 */

import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- funnel */

export interface FunnelDatum {
  label: string;
  count: number;
  pct: number;
}

export function FunnelChart({ stages }: { stages: FunnelDatum[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {stages.map((s, i) => (
        <div
          key={s.label}
          className="bg-surface-container-low relative flex min-h-[116px] flex-col justify-between overflow-hidden rounded-lg border p-3"
        >
          <span
            className="bg-brand-fixed-dim/25 absolute inset-x-0 bottom-0"
            style={{ height: `${s.pct}%` }}
            aria-hidden
          />
          <span className="text-muted-foreground relative z-10 font-mono text-[11px] font-bold tracking-wider uppercase">
            {s.label}
          </span>
          <span className="relative z-10">
            <span className="font-headline block text-2xl font-semibold">{s.count}</span>
            <span className="text-muted-foreground text-xs">
              {i === 0 ? "100%" : `${s.pct}% of new`}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- donut */

export interface DonutSlice {
  label: string;
  count: number;
  pct: number;
  color: string;
}

export function DonutChart({ slices }: { slices: DonutSlice[] }) {
  let acc = 0;
  const stops = slices
    .map((s) => {
      const start = acc;
      acc += s.pct;
      return `${s.color} ${start}% ${acc}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div
        className="relative size-[150px] shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops})` }}
        role="img"
        aria-label="Lead source distribution"
      >
        <div className="bg-card absolute inset-[34px] rounded-full ring-1 ring-border/60" />
      </div>
      <div className="min-w-[9rem] flex-1 space-y-2">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="text-muted-foreground font-semibold">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- horizontal bars */

export function HBarList({ data, max }: { data: { label: string; value: number }[]; max?: number }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d, index) => (
        <div key={`${d.label}-${index}`} className="grid grid-cols-[1fr_auto] items-center gap-2">
          <div className="min-w-0">
            <p className="mb-1 truncate text-xs font-medium">{d.label}</p>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div className="bg-brand h-full rounded-full" style={{ width: `${(d.value / top) * 100}%` }} />
            </div>
          </div>
          <span className="text-muted-foreground w-8 text-right text-sm font-semibold tabular-nums">
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------- mini vertical bars */

export function MiniBars({
  values,
  labels,
  className,
}: {
  values: number[];
  labels?: string[];
  className?: string;
}) {
  const max = Math.max(1, ...values);
  return (
    <div className={cn("flex h-24 items-end gap-1.5 pt-2", className)}>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn("flex-1 rounded-t", i % 2 === 0 ? "bg-brand" : "bg-brand-fixed-dim")}
          style={{ height: `${Math.max(12, (v / max) * 100)}%` }}
          title={labels?.[i]}
          aria-label={labels?.[i]}
        />
      ))}
    </div>
  );
}
