import { Skeleton } from "@/components/ui/skeleton";
import type { CallsSummary } from "@/types/calls";
import { MiniBars } from "@/components/charts";

function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}h ${m}m` : `${m}m ${s}s`;
}

export function CallsSummaryCards({
  data,
  loading,
}: {
  data?: CallsSummary;
  loading: boolean;
}) {
  const cards = [
    {
      label: "Total calls",
      value: String(data?.total_calls ?? 0),
      sub: `${data?.inbound ?? 0} in / ${data?.outbound ?? 0} out`,
    },
    {
      label: "Talk time",
      value: fmt(data?.talk_seconds ?? 0),
      sub: "total duration",
    },
    {
      label: "Average duration",
      value: fmt(data?.avg_seconds ?? 0),
      sub: "per call",
    },
    {
      label: "Connect rate",
      value: `${data?.connect_rate ?? 0}%`,
      sub: "calls over 0 sec",
    },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-2xl border p-4">
            <p className="text-muted-foreground text-xs">{c.label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-20" />
            ) : (
              <p className="font-headline mt-1 text-2xl font-semibold">
                {c.value}
              </p>
            )}
            <p className="text-muted-foreground mt-1 text-xs">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border p-4">
        <p className="text-sm font-semibold">Calls per day</p>
        {(data?.calls_per_day ?? []).length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            No calls to show.
          </p>
        ) : (
          <>
            <MiniBars values={data!.calls_per_day.map((d) => d.count)} />
            <div className="text-muted-foreground mt-1 flex justify-between text-xs">
              <span>{data!.calls_per_day[0].date}</span>
              <span>
                {data!.calls_per_day[data!.calls_per_day.length - 1].date}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="bg-card rounded-2xl border p-4">
        <p className="text-sm font-semibold">Top callers</p>
        {(data?.top_callers ?? []).length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            No calls to show.
          </p>
        ) : (
          <ol className="mt-2 space-y-1 text-sm">
            {data!.top_callers.map((c, i) => (
              <li key={c.user_id ?? i} className="flex justify-between">
                <span>
                  {i + 1}. {c.name || "Unknown"}
                </span>
                <span className="tabular-nums">{c.count}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
