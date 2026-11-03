import { useState } from "react";
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

// ---------------------------------------------------------------------------
// Horizontal Bars (Top Callers Chart - US-1)
// ---------------------------------------------------------------------------

export interface HBarItem {
  id?: string | number | null;
  label: string;
  value: number;
  detail?: string;
}

export function HBarList({
  data,
  max,
  className,
}: {
  data: HBarItem[];
  max?: number;
  className?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tappedIdx, setTappedIdx] = useState<number | null>(null);

  const top = max ?? Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={cn("space-y-2.5", className)}>
      {data.map((d, idx) => {
        const itemKey = d.id != null ? `hbar-${d.id}` : `${d.label}-${idx}`;
        const isHovered = hoveredIdx === idx;
        const isTapped = tappedIdx === idx;
        const isActive = isHovered || isTapped;

        return (
          <div
            key={itemKey}
            className={cn(
              "group relative rounded-lg p-1.5 -mx-1.5 transition-all duration-200 cursor-pointer select-none",
              isActive ? "bg-muted/50" : "hover:bg-muted/30"
            )}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => setTappedIdx(tappedIdx === idx ? null : idx)}
          >
            {/* Desktop Tooltip on Hover (hidden on mobile, visible on lg:) */}
            {isHovered && (
              <div
                role="tooltip"
                className="hidden lg:flex absolute -top-8 right-0 z-30 pointer-events-none items-center gap-1.5 rounded-md border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 -translate-y-1 duration-150 whitespace-nowrap"
              >
                <span className="font-semibold">{d.label}:</span>
                <span>{d.value} {d.value === 1 ? "call" : "calls"}</span>
                {d.detail && <span className="text-muted-foreground font-normal">({d.detail})</span>}
              </div>
            )}

            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="min-w-0">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <p className="truncate text-xs font-medium text-foreground group-hover:text-brand transition-colors">
                    {d.label}
                  </p>
                  {/* Direct detail on SM/MD screens without hover */}
                  {d.detail && (
                    <span className="lg:hidden shrink-0 text-[10px] text-muted-foreground font-mono">
                      {d.detail}
                    </span>
                  )}
                </div>
                <div className="bg-muted h-2.5 overflow-hidden rounded-full transition-all">
                  <div
                    className={cn(
                      "bg-brand h-full rounded-full transition-all duration-300",
                      isActive && "brightness-110 shadow-sm"
                    )}
                    style={{ width: `${(d.value / top) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0 pl-1">
                <span className="text-muted-foreground group-hover:text-foreground w-8 text-right text-sm font-semibold tabular-nums transition-colors">
                  {d.value}
                </span>
              </div>
            </div>

            {/* Mobile tap detail pill if tapped */}
            {isTapped && d.detail && (
              <div className="mt-1.5 flex lg:hidden items-center justify-between rounded bg-muted/70 px-2 py-1 text-[11px] text-muted-foreground animate-in fade-in-0 duration-150">
                <span>{d.label}</span>
                <span className="font-medium text-foreground">{d.detail}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini Vertical Bars (Calls per Day Chart - US-1)
// ---------------------------------------------------------------------------

export function MiniBars({
  values,
  labels,
  className,
}: {
  values: number[];
  labels?: string[];
  className?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const max = Math.max(1, ...values);
  const total = values.reduce((sum, v) => sum + v, 0);

  const activeIdx = hoveredIdx !== null ? hoveredIdx : selectedIdx;
  const isCompact = values.length <= 8;

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${months[m - 1] ?? ""} ${d}`.trim();
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const activeDate = activeIdx != null && labels?.[activeIdx] ? labels[activeIdx] : null;
  const activeVal = activeIdx != null ? values[activeIdx] : null;
  const activePct = activeVal != null && total > 0 ? Math.round((activeVal / total) * 100) : 0;

  return (
    <div className={cn("flex flex-col space-y-2", className)} role="region" aria-label="Daily call chart">
      {/* Mobile/Tablet SM/MD: Direct Readable Detail Banner (No hover needed) */}
      <div className="flex lg:hidden items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs min-h-[32px]">
        {activeIdx != null && activeDate ? (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="size-2 rounded-full bg-brand shrink-0" />
              <span className="font-medium text-foreground truncate">{formatShortDate(activeDate)}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums shrink-0">
              <span className="font-semibold text-foreground">
                {activeVal} {activeVal === 1 ? "call" : "calls"}
              </span>
              {total > 0 && <span className="text-muted-foreground">({activePct}%)</span>}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full text-muted-foreground text-[11px]">
            <span>
              Total: <strong className="text-foreground">{total}</strong> calls
            </span>
            <span>Tap any bar for details</span>
          </div>
        )}
      </div>

      {/*
        Bar Chart Area
        ──────────────
        • Use a taller container on mobile so the date label below each bar is NOT clipped.
        • `h-36` on mobile reserves room for: value (top) + bar + date (bottom).
        • `lg:h-28` keeps original compact size on desktop (where labels are hidden).
        • Removed `justify-end` from parent; each column handles its own vertical layout
          using `flex-col` + `justify-end` on an inner wrapper so the bar + date stack correctly.
      */}
      <div className="relative flex h-36 lg:h-28 items-stretch gap-1 sm:gap-1.5 pt-6 pb-1">
        {values.map((v, i) => {
          const dateStr = labels?.[i];
          const isHovered = hoveredIdx === i;
          const isSelected = selectedIdx === i;
          const isBarActive = isHovered || isSelected;
          const hasAnyActive = activeIdx !== null;

          const barDescription = dateStr
            ? `${dateStr}: ${v} ${v === 1 ? "call" : "calls"}`
            : `${v} ${v === 1 ? "call" : "calls"}`;

          const tooltipPositionClass =
            values.length <= 2
              ? "left-1/2 -translate-x-1/2"
              : i === 0
                ? "left-0 translate-x-0"
                : i === values.length - 1
                  ? "right-0 left-auto translate-x-0"
                  : "left-1/2 -translate-x-1/2";

          const caretPositionClass =
            values.length <= 2
              ? "left-1/2 -translate-x-1/2"
              : i === 0
                ? "left-3"
                : i === values.length - 1
                  ? "right-3 left-auto"
                  : "left-1/2 -translate-x-1/2";

          return (
            <div
              key={i}
              className="group relative flex-1 flex flex-col h-full cursor-pointer select-none min-w-0"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
            >
              {/* Desktop Hover Tooltip */}
              {isHovered && (
                <div
                  role="tooltip"
                  className={cn(
                    "hidden lg:flex absolute -top-10 z-30 pointer-events-none flex-col items-center rounded-md border bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 -translate-y-1 duration-150 whitespace-nowrap",
                    tooltipPositionClass
                  )}
                >
                  <span className="font-semibold">
                    {v} {v === 1 ? "call" : "calls"}
                  </span>
                  {dateStr && (
                    <span className="text-[10px] text-muted-foreground font-mono">{dateStr}</span>
                  )}
                  <div
                    className={cn(
                      "absolute -bottom-1 size-2 rotate-45 border-r border-b bg-popover",
                      caretPositionClass
                    )}
                  />
                </div>
              )}

              {/*
                Inner column: bar + date aligned to BOTTOM.
                flex-col with justify-end so bar grows from bottom,
                date label sits directly beneath it with proper spacing.
              */}
              <div className="flex flex-1 flex-col items-center justify-end w-full min-h-0">
                {/* Value on top of bar (mobile only, compact mode) */}
                {isCompact && (
                  <span
                    className={cn(
                      "lg:hidden text-[10px] font-mono tabular-nums mb-1 font-semibold transition-colors leading-none",
                      isBarActive ? "text-brand" : "text-muted-foreground/80"
                    )}
                  >
                    {v}
                  </span>
                )}

                {/* The Bar */}
                <span
                  role="img"
                  aria-label={barDescription}
                  title={barDescription}
                  tabIndex={0}
                  className={cn(
                    "w-full rounded-t transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    i % 2 === 0 ? "bg-brand" : "bg-brand-fixed-dim",
                    isBarActive
                      ? "brightness-110 ring-2 ring-brand ring-offset-1 z-10 scale-y-[1.02]"
                      : hasAnyActive
                        ? "opacity-60"
                        : "hover:opacity-85"
                  )}
                  style={{ height: `${Math.max(12, (v / max) * 100)}%` }}
                />
              </div>

              {/*
                Date Label — pulled OUT of the inner flex column
                and placed as a direct sibling, so it always renders
                visibly below the bar with guaranteed space.
              */}
              {isCompact && dateStr && (
                <span
                  className={cn(
                    "lg:hidden text-[9px] font-mono mt-1 transition-colors truncate max-w-full text-center leading-tight",
                    isBarActive ? "text-foreground font-semibold" : "text-muted-foreground/70"
                  )}
                >
                  {formatShortDate(dateStr)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}