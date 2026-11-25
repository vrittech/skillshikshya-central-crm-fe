import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Sparkles, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DonutChart, HBarList, MiniBars } from "@/components/charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import {
  useLeadTrend,
  useLeadsBySource,
  useLeadsByStatus,
  useReportsOverview,
} from "@/hooks/use-reports";
import { leadsService } from "@/services/leads.service";
import type { ReportBaseParams } from "@/types/reports-api";
import { formatNPR, formatDate } from "@/lib/leads-format";
import { cn } from "@/lib/utils";

const DONUT_COLORS = ["#00694c", "#008561", "#67dbae", "#f59e0b", "#64748b", "#0ea5e9", "#a855f7"];

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Kpi({
  label,
  value,
  loading,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number | undefined;
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
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="font-headline text-2xl font-semibold">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}

/** Live dashboard driven entirely by /api/reports/* aggregate endpoints. */
export function LiveDashboard({ firstName }: { firstName: string }) {
  const { user } = useAuth();
  const isStaff = !!user?.is_staff;
  const [branchId, setBranchId] = useState<string>("all");

  const branches = useBranches(1, 100, "", isStaff);

  // Current-month window for the overview snapshot + trend.
  const range = useMemo<ReportBaseParams>(
    () => ({
      start_date: monthStart(),
      end_date: today(),
      branch_id: branchId === "all" ? undefined : Number(branchId),
    }),
    [branchId],
  );

  const overview = useReportsOverview(range);
  const byStatus = useLeadsByStatus({ branch_id: range.branch_id });
  const bySource = useLeadsBySource({ branch_id: range.branch_id });
  const trend = useLeadTrend({ ...range, group_by: "day" });

  // Recent leads still come straight from the lead list (not a report).
  const recentQ = useQuery({
    queryKey: ["lead-recent", range.branch_id ?? null],
    queryFn: () =>
      leadsService.list({
        page: 1,
        page_size: 6,
        ordering: "-created_at",
        branch_id: range.branch_id,
      }),
    staleTime: 60 * 1000,
  });

  const statusBars = (byStatus.data?.results ?? []).map((r) => ({
    label: r.status__name,
    value: r.count,
  }));

  const totalForPct = byStatus.data?.total ?? 0;
  const sourceSlices = (bySource.data?.results ?? [])
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((r, i) => {
      const name = r.source__name ?? r.campaign__name ?? "—";
      return {
        label: String(name),
        count: r.count,
        pct: Math.round((r.count / Math.max(1, totalForPct)) * 100),
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      };
    });

  const followupsDue =
    (overview.data?.communication.followups.pending ?? 0) +
    (overview.data?.communication.followups.overdue ?? 0);
  const recent = recentQ.data?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            CRM command center
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Aggregated pipeline snapshot · {monthStart()} → {today()}
          </p>
        </div>
        {isStaff && (
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.data?.results.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* KPI row — overview report */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="New this month"
          value={overview.data?.leads.new_in_range}
          loading={overview.isLoading}
          icon={Sparkles}
          tone="text-brand"
        />
        <Kpi
          label={`Converted (${overview.data ? `${overview.data.leads.conversion_rate}%` : "…"})`}
          value={overview.data?.leads.converted_in_range}
          loading={overview.isLoading}
          icon={CheckCircle2}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <Kpi
          label="Follow-ups due"
          value={overview.data ? followupsDue : undefined}
          loading={overview.isLoading}
          icon={CalendarClock}
          tone="text-destructive"
        />
        <Kpi
          label="Revenue collected"
          value={overview.data ? formatNPR(Number(overview.data.enrollments.revenue_collected)) : undefined}
          loading={overview.isLoading}
          icon={Wallet}
          tone="text-sky-600 dark:text-sky-400"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status distribution</CardTitle>
            <CardDescription>All leads by status</CardDescription>
          </CardHeader>
          <CardContent>
            {byStatus.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : statusBars.length ? (
              <HBarList data={statusBars} />
            ) : (
              <p className="text-muted-foreground text-sm">No leads yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead sources</CardTitle>
            <CardDescription>Share of all leads</CardDescription>
          </CardHeader>
          <CardContent>
            {bySource.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : sourceSlices.length ? (
              <DonutChart slices={sourceSlices} />
            ) : (
              <p className="text-muted-foreground text-sm">No leads yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily lead flow</CardTitle>
          <CardDescription>New leads and conversions per day this month</CardDescription>
        </CardHeader>
        <CardContent>
          {trend.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <MiniBars values={(trend.data?.results ?? []).map((r) => r.leads)} />
              <div className="text-muted-foreground mt-2 flex justify-between text-xs tabular-nums">
                <span>{trend.data?.results[0]?.period && formatDate(trend.data.results[0].period)}</span>
                <span>{trend.data ? `revenue ${formatNPR(Number(trend.data.results.reduce((s, r) => s + Number(r.revenue), 0)))}` : ""}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent leads</CardTitle>
          <CardDescription>Newest inquiries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.map((l) => (
            <Link
              key={l.id}
              to={`/leads/${l.id}`}
              className="bg-surface-container-low hover:bg-accent flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{l.full_name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {l.primary_course?.name ?? l.source_name ?? "—"} · {formatDate(l.created_at)}
                </p>
              </div>
              {l.status_name && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    color: l.status_color ?? undefined,
                    backgroundColor: `${l.status_color ?? "#64748b"}1f`,
                  }}
                >
                  {l.status_name}
                </span>
              )}
            </Link>
          ))}
          {!recentQ.isLoading && recent.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">No leads yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
