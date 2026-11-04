import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  Percent,
  PhoneCall,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HBarList, MiniBars } from "@/components/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth";
import { useCallSummary } from "@/hooks/use-calls";
import { apiErrorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { CallLog } from "@/pages/calls/call-log";
import { getCallSummaryParams } from "@/pages/calls/call-filters";

const NUMBER_FORMAT = new Intl.NumberFormat();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  if (hours) return `${hours}h ${minutes}m ${remainder}s`;
  if (minutes) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}

function formatDay(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}`;
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  loading,
}: {
  label: string;
  value?: string;
  description?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="flex-row items-center justify-between">
        <CardDescription className="font-mono text-[11px] font-medium tracking-wider uppercase">
          {label}
        </CardDescription>
        <Icon className="text-brand size-4" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <>
            <p className="font-headline text-2xl font-semibold tabular-nums">{value}</p>
            <div className="text-muted-foreground flex min-h-4 items-center gap-2 text-xs">
              {description}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function CallsPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isStaff = !!(user?.is_staff || user?.is_superuser);
  const search = useDebouncedValue((searchParams.get("search") ?? "").trim(), 300);
  const summaryQuery = useCallSummary(getCallSummaryParams(searchParams, search, isStaff));
  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
          Team activity
        </p>
        <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Calls</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Calling activity across your branch, summarized in Nepal time.
        </p>
      </div>

      {summaryQuery.isError ? (
        <Card role="alert">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
            <p className="text-destructive text-sm">
              {apiErrorMessage(summaryQuery.error, "Could not load call activity.")}
            </p>
            <button
              type="button"
              onClick={() => void summaryQuery.refetch()}
              className="text-brand text-sm font-semibold underline underline-offset-4"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section aria-label="Call summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total calls"
              value={summary ? NUMBER_FORMAT.format(summary.total_calls) : undefined}
              loading={summaryQuery.isLoading}
              icon={PhoneCall}
              description={
                summary && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <ArrowDownLeft className="size-3" aria-hidden="true" />
                      {NUMBER_FORMAT.format(summary.inbound)} inbound
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                      {NUMBER_FORMAT.format(summary.outbound)} outbound
                    </span>
                  </>
                )
              }
            />
            <MetricCard
              label="Talk time"
              value={summary ? formatDuration(summary.total_seconds) : undefined}
              loading={summaryQuery.isLoading}
              icon={Clock3}
              description={summary?.total_formatted ? `${summary.total_formatted} total` : undefined}
            />
            <MetricCard
              label="Average duration"
              value={summary ? formatDuration(summary.avg_seconds) : undefined}
              loading={summaryQuery.isLoading}
              icon={Activity}
              description="Per call"
            />
            <MetricCard
              label="Connect rate"
              value={summary ? `${(summary.connect_rate * 100).toFixed(1)}%` : undefined}
              loading={summaryQuery.isLoading}
              icon={Percent}
              description={
                summary
                  ? `${NUMBER_FORMAT.format(summary.connected_calls)} calls over 0 sec`
                  : undefined
              }
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Calls per day</CardTitle>
                <CardDescription>Daily call volume · dates shown in Nepal time</CardDescription>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : summary?.by_day.length ? (
                  <>
                    <div className="overflow-x-auto">
                      <MiniBars
                        values={summary.by_day.map((day) => day.calls)}
                        labels={summary.by_day.map(
                          (day) => `${day.date}: ${NUMBER_FORMAT.format(day.calls)} calls`,
                        )}
                        className="min-w-[30rem]"
                      />
                    </div>
                    <div className="text-muted-foreground mt-2 flex justify-between text-xs tabular-nums">
                      <span>{formatDay(summary.by_day[0].date)}</span>
                      <span>{formatDay(summary.by_day[summary.by_day.length - 1].date)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">No calls to chart.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top callers</CardTitle>
                <CardDescription>Top 10 counselors by number of calls</CardDescription>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : summary?.by_user.length ? (
                  <HBarList
                    data={summary.by_user.map((caller) => ({
                      label: caller.name,
                      value: caller.calls,
                    }))}
                  />
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No caller activity to show.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
      <CallLog />
    </div>
  );
}
