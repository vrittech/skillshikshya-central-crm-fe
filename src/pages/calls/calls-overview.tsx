import { RotateCw } from "lucide-react";
import { HBarList, MiniBars } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallsSummary } from "@/hooks/use-calls";
import { formatDuration } from "@/lib/duration";
import type { CallFilterParams } from "@/types/calls";

function formatTalkTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : formatDuration(seconds);
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card rounded-2xl border p-4">
      <p className="text-muted-foreground font-mono text-[11px] font-bold tracking-wider uppercase">
        {label}
      </p>
      <p className="font-headline mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border p-4">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}

export function CallsOverview({ filters }: { filters: CallFilterParams }) {
  const { summary, isLoading, isError, refetch } = useCallsSummary(filters);

  if (isError) {
    return (
      <div className="bg-card flex items-center justify-between gap-3 rounded-2xl border p-4">
        <p className="text-destructive text-sm">Could not load the call summary.</p>
        <Button variant="outline" onClick={() => void refetch()}>
          <RotateCw /> Retry
        </Button>
      </div>
    );
  }

  if (isLoading || !summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  const days = summary.calls_per_day.slice(-30);
  const hasCalls = summary.total_calls > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total calls"
          value={String(summary.total_calls)}
          hint={`${summary.inbound_calls} inbound · ${summary.outbound_calls} outbound`}
        />
        <StatCard label="Talk time" value={formatTalkTime(summary.talk_seconds)} />
        <StatCard label="Average duration" value={formatDuration(summary.avg_duration_seconds)} />
        <StatCard
          label="Connect rate"
          value={`${summary.connect_rate}%`}
          hint={`${summary.connected_calls} of ${summary.total_calls} connected`}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Calls per day">
          {hasCalls ? (
            <>
              <MiniBars values={days.map((d) => d.count)} />
              <p className="text-muted-foreground mt-1 flex justify-between text-xs">
                <span>{days[0]?.date}</span>
                <span>{days[days.length - 1]?.date}</span>
              </p>
            </>
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">No calls to chart.</p>
          )}
        </Panel>
        <Panel title="Top callers">
          {hasCalls ? (
            <HBarList data={summary.top_callers.map((c) => ({ label: c.caller, value: c.count }))} />
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">No calls to chart.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}