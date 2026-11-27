import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-12" → [2026, 12]. Falls back to this month. */
function parse(value: string): [number, number] {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (m) return [Number(m[1]), Number(m[2])];
  const d = new Date();
  return [d.getFullYear(), d.getMonth() + 1];
}

/** A month calendar: pick a year, then a month. Value is "YYYY-MM". */
export function MonthPicker({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [year, month] = parse(value);
  const [open, setOpen] = useState(false);
  const [shownYear, setShownYear] = useState(year);
  const today = new Date();
  const label = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setShownYear(year);
      }}
    >
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" className={cn("justify-start font-normal", className)}>
          <CalendarDays className="text-muted-foreground" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="mb-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Previous year"
            onClick={() => setShownYear((y) => y - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="text-sm font-semibold">{shownYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Next year"
            onClick={() => setShownYear((y) => y + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((name, i) => {
            const selected = shownYear === year && i + 1 === month;
            const current = shownYear === today.getFullYear() && i === today.getMonth();
            return (
              <Button
                key={name}
                type="button"
                variant={selected ? "brand" : "ghost"}
                size="sm"
                aria-pressed={selected}
                className={cn(current && !selected && "border-brand/60 border")}
                onClick={() => {
                  onChange(`${shownYear}-${pad(i + 1)}`);
                  setOpen(false);
                }}
              >
                {name}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
