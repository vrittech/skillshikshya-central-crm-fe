import { HBarList, MiniBars } from "@/components/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { durationClock } from "@/lib/call-duration";
import type { CallSummary } from "@/types/calls";

export function CallSummaryCards({
  data,
  loading,
}: {
  data?: CallSummary;
  loading: boolean;
}) {
  const metrics = [
    {
      label: "Total calls",
      value: data?.total_calls.toLocaleString() ?? "0",
      detail: `${data?.inbound ?? 0} inbound · ${data?.outbound ?? 0} outbound`,
    },
    {
      label: "Talk time",
      value: data?.total_formatted ?? "00:00:00",
      detail: "Hours : minutes : seconds",
    },
    {
      label: "Average duration",
      value: durationClock(data?.avg_seconds ?? 0),
      detail: "Across all calls, including unanswered",
    },
    {
      label: "Connect rate",
      value: `${((data?.connect_rate ?? 0) * 100).toFixed(1)}%`,
      detail: `${data?.connected_calls ?? 0} calls longer than 0 seconds`,
    },
  ];
  return (
    <div
      className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4"
      aria-busy={loading}
    >
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="bg-card rounded-xl border p-4 sm:p-5"
        >
          <p className="text-muted-foreground text-xs font-medium">
            {metric.label}
          </p>
          {loading ? (
            <Skeleton className="my-3 h-8 w-24" />
          ) : (
            <p className="font-headline my-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              {metric.value}
            </p>
          )}
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {metric.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CallActivity({
  data,
  loading,
}: {
  data?: CallSummary;
  loading: boolean;
}) {
  const days = data?.by_day ?? [];
  const users = data?.by_user ?? [];
  const label = (date: string) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[1.6fr_1fr]">
      <section className="bg-card min-w-0 rounded-xl border p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-sm">Calls per day</h2>
          <p className="text-muted-foreground text-xs">
            Days with activity · Nepal time
          </p>
        </div>
        {loading ? (
          <Skeleton className="mt-6 h-28 w-full" />
        ) : days.length ? (
          <div className="mt-5 overflow-x-auto">
            <div
              style={{
                minWidth: days.length > 45 ? days.length * 12 : undefined,
              }}
            >
              <MiniBars
                values={days.map((day) => day.calls)}
                labels={days.map(
                  (day) => `${label(day.date)}: ${day.calls} calls`,
                )}
                className="h-28"
              />
              <div className="text-muted-foreground mt-3 flex justify-between text-[11px]">
                <span>{label(days[0].date)}</span>
                {days.length > 1 && (
                  <span>{label(days[days.length - 1].date)}</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground py-12 text-center text-sm">
            No call activity in this view.
          </p>
        )}
      </section>
      <section className="bg-card min-w-0 rounded-xl border p-5">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Top callers</h2>
          <span className="text-muted-foreground text-xs">
            By calls logged · top 10
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-28 w-full" />
        ) : users.length ? (
          <div className="max-h-44 overflow-y-auto pr-1">
            <HBarList
              data={users.map((user) => ({
                label:
                  users.filter((other) => other.name === user.name).length > 1
                    ? `${user.name} (${user.user_id ?? "unknown"})`
                    : user.name,
                value: user.calls,
              }))}
            />
          </div>
        ) : (
          <p className="text-muted-foreground py-10 text-center text-sm">
            No callers in this view.
          </p>
        )}
      </section>
    </div>
  );
}
