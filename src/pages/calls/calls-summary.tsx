import { Clock, PhoneCall, PhoneForwarded, Timer } from "lucide-react";
import { HBarList, MiniBars } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallsSummary } from "@/hooks/use-calls";
import { apiErrorMessage } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { CallFilterParams } from "@/types/calls";

function formatTalkTime(seconds: number): string {
  if (!seconds) return "0 sec";
  if (seconds < 3600) return formatDuration(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

// midday so the calendar day does not shift with the timezone
function formatDay(date: string): string {
  return formatDate(`${date}T12:00:00`);
}

function fillDays(days: { date: string; count: number }[]) {
  if (days.length === 0) return [];
  const counts = new Map(days.map((d) => [d.date, d.count]));
  const result: { date: string; count: number }[] = [];
  const cursor = new Date(`${days[0].date}T00:00:00Z`);
  const last = days[days.length - 1].date;
  let date = days[0].date;
  while (date <= last) {
    result.push({ date, count: counts.get(date) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    date = cursor.toISOString().slice(0, 10);
  }
  return result;
}

function Kpi({
  label,
  value,
  sub,
  loading,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  loading: boolean;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="flex-row items-center justify-between">
        <CardDescription className="font-mono text-[11px] font-medium tracking-wider uppercase">
          {label}
        </CardDescription>
        <Icon className={cn("size-4", tone)} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <p className="font-headline text-2xl font-semibold tabular-nums">{value}</p>
            {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Totals, calls per day and top callers for the current filters. */
export function CallsSummary({ params }: { params: CallFilterParams }) {
  const summaryQ = useCallsSummary(params);
  const summary = summaryQ.data;
  const loading = summaryQ.isLoading;
  const days = fillDays(summary?.calls_per_day ?? []);

  if (summaryQ.isError) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        {apiErrorMessage(summaryQ.error, "Could not load call totals.")}{" "}
        <button type="button" className="underline" onClick={() => void summaryQ.refetch()}>
          Retry
        </button>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Total calls"
          value={summary?.total_calls ?? 0}
          sub={`${summary?.inbound ?? 0} inbound · ${summary?.outbound ?? 0} outbound`}
          loading={loading}
          icon={PhoneCall}
          tone="text-brand"
        />
        <Kpi
          label="Talk time"
          value={formatTalkTime(summary?.total_seconds ?? 0)}
          loading={loading}
          icon={Clock}
          tone="text-sky-600 dark:text-sky-400"
        />
        <Kpi
          label="Average duration"
          value={summary?.average_seconds ? formatDuration(summary.average_seconds) : "0 sec"}
          loading={loading}
          icon={Timer}
          tone="text-amber-600 dark:text-amber-400"
        />
        <Kpi
          label="Connect rate"
          value={`${summary?.connect_rate ?? 0}%`}
          sub={`${summary?.connected ?? 0} of ${summary?.total_calls ?? 0} lasted over 0 sec`}
          loading={loading}
          icon={PhoneForwarded}
          tone="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Calls per day</CardTitle>
            <CardDescription>Nepal time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : days.length ? (
              <>
                <MiniBars
                  values={days.map((d) => d.count)}
                  labels={days.map((d) => `${formatDay(d.date)}: ${d.count} calls`)}
                />
                <div className="text-muted-foreground mt-2 flex justify-between text-xs tabular-nums">
                  <span>{formatDay(days[0].date)}</span>
                  {days.length > 1 && <span>{formatDay(days[days.length - 1].date)}</span>}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">No calls in this view.</p>
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Top callers</CardTitle>
            <CardDescription>By number of calls logged</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : summary?.top_callers.length ? (
              <HBarList data={summary.top_callers.map((c) => ({ label: c.name, value: c.count }))} />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">No calls in this view.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
