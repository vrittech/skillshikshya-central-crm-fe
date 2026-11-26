import { Flame, Snowflake, Thermometer, ThermometerSun } from "lucide-react";
import { cn } from "@/lib/utils";

const PILL = "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

/** Tint a hex color for the pill background (~12% alpha). */
function tint(hex: string): React.CSSProperties {
  const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#64748b";
  return { color: clean, backgroundColor: `${clean}1f` };
}

/** Status badge in the admin-defined status colour. */
export function StatusBadge({ name, color, className }: { name?: string; color?: string; className?: string }) {
  return (
    <span className={cn(PILL, !color && "bg-muted text-muted-foreground ring-border ring-1", className)} style={color ? tint(color) : undefined}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {name ?? "—"}
    </span>
  );
}

/** Pick a thermometer icon when a live priority name hints hot/warm/cool/cold. */
function iconForName(name: string) {
  const n = name.toLowerCase();
  if (n.includes("hot")) return Flame;
  if (n.includes("warm")) return ThermometerSun;
  if (n.includes("cool")) return Thermometer;
  if (n.includes("cold")) return Snowflake;
  return null;
}

export function PriorityBadge({
  name,
  color,
  className,
  showLabel = true,
}: {
  name?: string;
  color?: string;
  className?: string;
  showLabel?: boolean;
}) {
  // No priority (e.g. leads from the public enroll form): show nothing.
  if (!name) return null;
  const Icon = iconForName(name);
  return (
    <span
      title={name}
      className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", className)}
      style={color ? tint(color) : undefined}
    >
      {Icon ? <Icon className="size-3" /> : <span className="size-1.5 rounded-full bg-current opacity-70" />}
      {showLabel && name}
    </span>
  );
}

export function ScoreBar({ score, className }: { score: number; className?: string }) {
  const tone =
    score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : score >= 30 ? "bg-orange-500" : "bg-slate-400";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="bg-muted relative h-1.5 w-12 overflow-hidden rounded-full">
        <span className={cn("absolute inset-y-0 left-0 rounded-full", tone)} style={{ width: `${score}%` }} />
      </span>
      <span className="text-xs font-semibold tabular-nums">{score}</span>
    </span>
  );
}
