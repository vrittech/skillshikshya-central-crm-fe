/**
 * Chart pieces for the dashboard and reports: a daily bar chart and a meter
 * list. Plain CSS, theme tokens, one hue.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------ daily bar chart */

export interface DailyDatum {
  /** YYYY-MM-DD */
  date: string;
  value: number;
}

const DAY_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

function dayLabel(iso: string) {
  return DAY_FMT.format(new Date(`${iso}T00:00:00`));
}

/** A clean tick step (1, 2, 5 × 10ⁿ) for a raw step size. */
function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/**
 * One column per day, one series. Zero days draw no bar; every column has a
 * hover / focus tooltip with the day and value.
 */
export function DailyBarChart({
  data,
  unit,
  emptyText,
}: {
  data: DailyDatum[];
  /** Singular and plural unit for the tooltip, e.g. ["lead", "leads"]. */
  unit: [string, string];
  emptyText: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(0, ...data.map((d) => d.value));
  const step = max <= 4 ? 1 : niceStep(max / 4);
  const top = Math.max(4, step * Math.ceil(max / step));
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  const n = data.length;
  const last = n - 1;
  const showTick = (i: number) => {
    const day = Number(data[i].date.slice(8, 10));
    if (i === 0 || i === last) return true;
    return day % 5 === 0 && last - i > 2 && i > 1;
  };
  const cur = active != null ? data[active] : null;

  return (
    <div className="select-none">
      <div className="flex">
        <div className="relative h-44 w-8 shrink-0" aria-hidden>
          {ticks.map((t) => (
            <span
              key={t}
              className="text-muted-foreground absolute right-2 translate-y-1/2 text-[11px] tabular-nums"
              style={{ bottom: `${(t / top) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="relative h-44 flex-1">
          {ticks.map((t) => (
            <span
              key={t}
              className={cn("absolute inset-x-0 border-t", t === 0 ? "border-border" : "border-border/50")}
              style={{ bottom: `${(t / top) * 100}%` }}
              aria-hidden
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5" onMouseLeave={() => setActive(null)}>
            {data.map((d, i) => (
              <button
                key={d.date}
                type="button"
                aria-label={`${dayLabel(d.date)}: ${d.value} ${d.value === 1 ? unit[0] : unit[1]}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={cn(
                  "relative flex h-full flex-1 items-end justify-center rounded-sm outline-none",
                  active === i && "bg-muted/60",
                )}
              >
                {d.value > 0 && (
                  <span
                    className={cn(
                      "bg-brand w-full max-w-6 rounded-t-[4px] transition-opacity",
                      active === i && "opacity-80",
                    )}
                    style={{ height: `${(d.value / top) * 100}%` }}
                  />
                )}
              </button>
            ))}
          </div>
          {max === 0 && (
            <p className="text-muted-foreground absolute inset-0 grid place-items-center text-sm">{emptyText}</p>
          )}
          {cur && active != null && (
            <div
              className={cn(
                "bg-popover text-popover-foreground pointer-events-none absolute z-10 rounded-md border px-2.5 py-1.5 shadow-md",
                active < n * 0.2 ? "translate-x-0" : active > n * 0.8 ? "-translate-x-full" : "-translate-x-1/2",
              )}
              style={{
                left: `${((active + 0.5) / n) * 100}%`,
                bottom: `calc(${(cur.value / top) * 100}% + 8px)`,
              }}
            >
              <p className="text-sm font-semibold whitespace-nowrap tabular-nums">
                {cur.value} {cur.value === 1 ? unit[0] : unit[1]}
              </p>
              <p className="text-muted-foreground text-xs whitespace-nowrap">{dayLabel(cur.date)}</p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-1.5 ml-8 flex gap-0.5" aria-hidden>
        {data.map((d, i) => (
          <span key={d.date} className="text-muted-foreground flex-1 text-center text-[11px] whitespace-nowrap tabular-nums">
            {showTick(i) ? (i === 0 ? dayLabel(d.date) : Number(d.date.slice(8, 10))) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ meter list */

export interface MeterRow {
  label: string;
  value: number;
  /** Share of the whole, 0–100. */
  share: number;
  muted?: boolean;
}

/** A name, a figure and a bar per row; bars share one 0–100% scale. */
export function MeterList({
  rows,
  format = (v) => v.toLocaleString("en-IN"),
}: {
  rows: MeterRow[];
  format?: (value: number) => string;
}) {
  return (
    <div className="space-y-3.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="font-semibold whitespace-nowrap tabular-nums">{format(r.value)}</span>
              <span className="text-muted-foreground w-11 text-right text-xs tabular-nums">{r.share}%</span>
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            {r.value > 0 && (
              <div
                className={cn("h-full rounded-full", r.muted ? "bg-muted-foreground/45" : "bg-brand")}
                style={{ width: `${Math.min(100, Math.max(r.share, 1.5))}%` }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
