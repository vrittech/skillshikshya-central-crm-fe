import type { UseQueryResult } from "@tanstack/react-query";
import { HBarList, MiniBars } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CallSummary as CallSummaryData } from "@/types/calls";

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const CARD = "bg-card min-w-0 rounded-2xl border p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={CARD}>
      <p className="text-muted-foreground font-mono text-[11px] font-bold tracking-wider uppercase">
        {label}
      </p>
      <p className="font-headline mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-xs">{hint ?? "\u00a0"}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-muted-foreground py-8 text-center text-sm">{text}</p>;
}

export function CallSummary({ query }: { query: UseQueryResult<CallSummaryData> }) {
  if (query.isPending) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-44 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className={cn(CARD, "flex items-center justify-between gap-3")}>
        <p className="text-destructive text-sm">Could not load the call summary.</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const d = query.data;
  const days = d.by_day;

  return (
    <div className={cn("space-y-4", query.isPlaceholderData && "opacity-60")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total calls"
          value={String(d.total_calls)}
          hint={`${d.inbound} inbound · ${d.outbound} outbound`}
        />
        <Stat label="Talk time" value={d.total_formatted} hint="HH:MM:SS" />
        <Stat label="Average duration" value={mmss(d.avg_seconds)} hint="MM:SS per call" />
        <Stat
          label="Connect rate"
          value={`${Math.round(d.connect_rate * 1000) / 10}%`}
          hint={`${d.connected_calls} of ${d.total_calls} lasted over 0 s`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={cn(CARD, "lg:col-span-2")}>
          <p className="text-sm font-semibold">Calls per day</p>
          {days.length === 0 ? (
            <Empty text="No calls to chart." />
          ) : (
            <>
              <MiniBars values={days.map((x) => x.calls)} />
              <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                <span>{days[0].date}</span>
                <span>
                  {days.length} {days.length === 1 ? "day" : "days"} with calls
                </span>
                <span>{days[days.length - 1].date}</span>
              </div>
            </>
          )}
        </div>

        <div className={CARD}>
          <p className="mb-3 text-sm font-semibold">Top callers</p>
          {d.by_user.length === 0 ? (
            <Empty text="No callers yet." />
          ) : (
            <HBarList data={d.by_user.map((u) => ({ label: u.name, value: u.calls }))} />
          )}
        </div>
      </div>
    </div>
  );
}