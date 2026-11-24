import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Two date boxes, from → to. Values are "YYYY-MM-DD" or "" for no limit. */
export function DateRange({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = "From",
  toLabel = "To",
  className,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input
        type="date"
        className="w-40"
        value={from}
        max={to || undefined}
        onChange={(e) => onFromChange(e.target.value)}
        aria-label={fromLabel}
        title={fromLabel}
      />
      <span className="text-muted-foreground text-sm">→</span>
      <Input
        type="date"
        className="w-40"
        value={to}
        min={from || undefined}
        onChange={(e) => onToChange(e.target.value)}
        aria-label={toLabel}
        title={toLabel}
      />
    </div>
  );
}
