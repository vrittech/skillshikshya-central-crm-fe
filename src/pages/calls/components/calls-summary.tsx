import { HBarList, MiniBars } from "@/components/charts";
import { Skeleton } from "@/components/ui/skeleton";
import type { CallsSummary } from "@/types/calls";

interface CallsSummaryProps {
  summary: CallsSummary | undefined;
  isLoading: boolean;
}

function formatAverageDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function formatNepalDateLabel(date: string): string {
  const [year, month, day] = date.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthName = monthNames[Number(month) - 1];
  return year && day && monthName ? `${day} ${monthName}` : date;
}

function SummaryCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border p-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-20" />
      <Skeleton className="mt-2 h-4 w-32" />
    </div>
  );
}

export function CallsSummaryOverview({ summary, isLoading }: CallsSummaryProps) {
  const byDay = summary?.by_day ?? [];
  const callers = (summary?.by_user ?? []).slice(0, 10).map((user) => ({
    label: user.user_id === null ? "Unknown" : user.name || "Unknown",
    value: user.calls,
  }));
  const chartMinWidth = Math.max(0, byDay.length * 18);

  if (isLoading) {
    return (
      <section aria-label="Call summary" className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SummaryCardSkeleton key={index} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-card rounded-2xl border p-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-5 h-24 w-full" />
          </div>
          <div className="bg-card rounded-2xl border p-4">
            <Skeleton className="h-5 w-36" />
            <div className="mt-5 space-y-3">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-4/5" />
              <Skeleton className="h-7 w-3/5" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const totalCalls = summary?.total_calls ?? 0;
  const inbound = summary?.inbound ?? 0;
  const outbound = summary?.outbound ?? 0;
  const connectRate = ((summary?.connect_rate ?? 0) * 100).toFixed(1);

  return (
    <section aria-label="Call summary" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-muted-foreground text-sm">Total calls</p>
          <p className="font-headline mt-2 text-2xl font-semibold tabular-nums">{totalCalls}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {inbound} inbound · {outbound} outbound
          </p>
        </div>
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-muted-foreground text-sm">Talk time</p>
          <p className="font-headline mt-2 text-2xl font-semibold tabular-nums">
            {summary?.total_formatted ?? "0:00"}
          </p>
        </div>
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-muted-foreground text-sm">Average duration</p>
          <p className="font-headline mt-2 text-2xl font-semibold tabular-nums">
            {formatAverageDuration(summary?.avg_seconds ?? 0)}
          </p>
        </div>
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-muted-foreground text-sm">Connect rate</p>
          <p className="font-headline mt-2 text-2xl font-semibold tabular-nums">{connectRate}%</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {summary?.connected_calls ?? 0} connected calls
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-card min-w-0 rounded-2xl border p-4">
          <h2 className="font-headline text-base font-semibold">Calls per day</h2>
          {byDay.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">No daily call data.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <div style={{ minWidth: `${chartMinWidth}px` }}>
                <MiniBars values={byDay.map((day) => day.calls)} />
                <div className="text-muted-foreground mt-2 flex gap-1.5 text-[10px]">
                  {byDay.map((day) => (
                    <span key={day.date} className="min-w-0 flex-1 truncate text-center">
                      {formatNepalDateLabel(day.date)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card min-w-0 rounded-2xl border p-4">
          <h2 className="font-headline text-base font-semibold">Top callers</h2>
          {callers.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">No caller data.</p>
          ) : (
            <div className="mt-4">
              <HBarList data={callers} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
