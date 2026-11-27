import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DailyBarChart, MeterList, type DailyDatum, type MeterRow } from "@/components/charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth";
import { useBranchScope } from "@/context/branch-scope";
import { useRole } from "@/context/role";
import { useLeadSummary } from "@/hooks/use-leads";
import {
  useConversionReport,
  useCounselorPerformance,
  useLeadTrend,
  useLeadsBySource,
  useRevenueReport,
} from "@/hooks/use-reports";
import { formatTime, initialsOf, relativeToToday } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/pages/leads/components/lead-badges";
import { globalListsService } from "@/services/global-lists.service";
import { leadsService } from "@/services/leads.service";
import type { ReportBaseParams } from "@/types/reports-api";

const CARD_SHADOW = "shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]";
const LONG_DATE = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Local calendar day as YYYY-MM-DD. */
function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function pct(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

function money(v: string | number | undefined) {
  return Number(v ?? 0).toLocaleString("en-IN");
}

/* ------------------------------------------------------------------ pieces */

function Stat({
  to,
  label,
  loading,
  children,
  foot,
}: {
  to: string;
  label: string;
  loading: boolean;
  children: React.ReactNode;
  foot?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "bg-card hover:border-brand/40 focus-visible:ring-ring flex flex-col gap-3 rounded-2xl border p-5 transition-colors outline-none focus-visible:ring-2",
        CARD_SHADOW,
      )}
    >
      <p className="text-muted-foreground font-mono text-[11px] font-medium tracking-wider uppercase">{label}</p>
      {loading ? (
        <Skeleton className="h-9 w-24" />
      ) : (
        <p className="font-headline truncate text-3xl font-semibold tracking-tight">{children}</p>
      )}
      <div className="min-h-4 text-xs">{loading ? null : foot}</div>
    </Link>
  );
}

function Delta({ now, before, period }: { now: number; before: number; period: string }) {
  const diff = now - before;
  if (diff === 0) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1">
        <Minus className="size-3.5" /> Same as {period}
      </span>
    );
  }
  const up = diff > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        up ? "text-emerald-700 dark:text-emerald-400" : "text-destructive",
      )}
    >
      <Icon className="size-3.5" />
      {up ? "+" : "−"}
      {Math.abs(diff)} vs {period}
    </span>
  );
}

function Panel({
  title,
  sub,
  action,
  className,
  children,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("gap-5", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {sub && <CardDescription>{sub}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}

function ViewAll({ to }: { to: string }) {
  return (
    <Link to={to} className="text-brand inline-flex shrink-0 items-center text-sm font-medium hover:underline">
      View all <ChevronRight className="size-4" />
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground grid h-full min-h-32 place-items-center text-sm">{children}</p>;
}

function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

/** Wide-screen columns for the KPI row, by how many cards show. */
const KPI_COLUMNS: Record<number, string> = {
  0: "hidden",
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
};

/* -------------------------------------------------------------------- page */

export default function DashboardPage() {
  const { user } = useAuth();
  const { can } = useRole();
  // Each card loads only with its view right.
  const seesLeads = can("leads.view");
  const seesFollowups = can("followups.view");
  const seesMoney = can("reports.view");
  const seesReports = seesMoney && seesLeads;
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const scope = useBranchScope();
  const branchId = scope.branchId ?? undefined;

  const { days, range } = useMemo(() => {
    const now = new Date();
    const list: string[] = [];
    for (let d = 1; d <= now.getDate(); d++) list.push(isoDay(new Date(now.getFullYear(), now.getMonth(), d)));
    const r: ReportBaseParams = { start_date: list[0], end_date: list[list.length - 1], branch_id: branchId };
    return { days: list, range: r };
  }, [branchId]);

  // Everyone: lead counts, today's follow-ups, newest leads.
  const summary = useLeadSummary({ branch_id: branchId }, seesLeads);
  const fuParams = { open: true, branch_id: branchId };
  const fuCounts = useQuery({
    queryKey: ["followups", "summary", fuParams],
    queryFn: () => globalListsService.followupsSummary(fuParams),
    placeholderData: keepPreviousData,
    enabled: seesFollowups,
  });
  const fuToday = useQuery({
    queryKey: ["followups", "dashboard-today", fuParams],
    queryFn: () =>
      globalListsService.followups({ ...fuParams, due: "today", ordering: "scheduled_at", page_size: 6 }),
    placeholderData: keepPreviousData,
    enabled: seesFollowups,
  });
  const recent = useQuery({
    queryKey: ["leads", "recent", branchId ?? null],
    queryFn: () => leadsService.list({ page: 1, page_size: 6, ordering: "-created_at", branch_id: branchId }),
    placeholderData: keepPreviousData,
    enabled: seesLeads,
  });

  // Reports: charts, money and counselors, this month.
  const trend = useLeadTrend({ ...range, group_by: "day" }, seesReports);
  const conversion = useConversionReport(range, seesReports);
  const sources = useLeadsBySource(range, seesReports);
  const revenue = useRevenueReport(range, seesMoney);
  const counselors = useCounselorPerformance({ ...range, sort_by: "converted" }, seesReports);

  const s = summary.data;

  const daily: DailyDatum[] = useMemo(() => {
    const byDay = new Map((trend.data?.results ?? []).map((r) => [r.period, r.leads]));
    return days.map((d) => ({ date: d, value: byDay.get(d) ?? 0 }));
  }, [days, trend.data]);
  const monthTotal = daily.reduce((sum, d) => sum + d.value, 0);

  const funnel = conversion.data?.funnel;
  const funnelRows: MeterRow[] = funnel
    ? [
        { label: "Leads", value: funnel.total_leads, share: 100 },
        { label: "Contacted", value: funnel.contacted, share: pct(funnel.contacted, funnel.total_leads) },
        { label: "Interested", value: funnel.interested, share: pct(funnel.interested, funnel.total_leads) },
        { label: "Enrolled", value: funnel.enrolled, share: pct(funnel.enrolled, funnel.total_leads) },
        { label: "Converted", value: funnel.converted, share: pct(funnel.converted, funnel.total_leads) },
        { label: "Lost", value: funnel.lost, share: pct(funnel.lost, funnel.total_leads), muted: true },
      ]
    : [];

  const sourceRows: MeterRow[] = useMemo(() => {
    const rows = (sources.data?.results ?? [])
      .filter((r) => r.count > 0)
      .map((r) => ({ label: String(r.source__name ?? "No source"), value: r.count }))
      .sort((a, b) => b.value - a.value);
    const total = rows.reduce((sum, r) => sum + r.value, 0);
    const top = rows.slice(0, 5);
    const rest = rows.slice(5).reduce((sum, r) => sum + r.value, 0);
    if (rest > 0) top.push({ label: "Other", value: rest });
    return top.map((r) => ({ ...r, share: pct(r.value, total) }));
  }, [sources.data]);

  const counselorRows = (counselors.data?.results ?? [])
    .filter((r) => r.leads_assigned > 0 || r.converted > 0 || Number(r.revenue_collected) > 0)
    .slice(0, 6);

  const kpiCount = (seesLeads ? 3 : 0) + (seesFollowups ? 1 : 0) + (seesMoney ? 1 : 0);
  const fuRows = fuToday.data?.results ?? [];
  const leadRows = recent.data?.results ?? [];
  const overdue = fuCounts.data?.overdue ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">Dashboard</p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {LONG_DATE.format(new Date())}
            {scope.branch && ` · ${scope.branch.name}`}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", KPI_COLUMNS[kpiCount])}>
        {seesLeads && (
        <Stat
          to="/leads"
          label="New leads · 7 days"
          loading={summary.isLoading}
          foot={s && <Delta now={s.new_this_week} before={s.new_last_week} period="last week" />}
        >
          {s?.new_this_week ?? 0}
        </Stat>
        )}
        {seesFollowups && (
        <Stat
          to="/follow-ups"
          label="Follow-ups today"
          loading={fuCounts.isLoading}
          foot={
            overdue > 0 ? (
              <span className="text-destructive font-medium">{overdue} overdue</span>
            ) : (
              <span className="text-muted-foreground">None overdue</span>
            )
          }
        >
          {fuCounts.data?.today ?? 0}
        </Stat>
        )}
        {seesLeads && (
          <>
            <Stat to="/enrollments" label="Pending enrollment" loading={summary.isLoading}>
              {s?.pending_enrollment ?? 0}
            </Stat>
            <Stat
              to="/students"
              label="Enrolled this month"
              loading={summary.isLoading}
              foot={s && <Delta now={s.enrolled_this_month} before={s.enrolled_last_month} period="last month" />}
            >
              {s?.enrolled_this_month ?? 0}
            </Stat>
          </>
        )}
        {seesMoney && (
          <Stat
            to="/payments"
            label="Collected this month"
            loading={revenue.isLoading}
            foot={
              Number(revenue.data?.summary.outstanding_to_collect ?? 0) > 0 ? (
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  NPR {money(revenue.data?.summary.outstanding_to_collect)} to collect
                </span>
              ) : (
                <span className="text-muted-foreground">Nothing to collect</span>
              )
            }
          >
            <span className="text-muted-foreground mr-1.5 text-base font-medium">NPR</span>
            {money(revenue.data?.summary.total_collected)}
          </Stat>
        )}
      </div>

      {/* Lead flow + conversion */}
      {seesReports && (
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Panel
            title="New leads"
            sub="This month"
            action={
              !trend.isLoading && (
                <p className="font-headline text-2xl font-semibold tracking-tight">{monthTotal.toLocaleString("en-IN")}</p>
              )
            }
          >
            {trend.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <DailyBarChart data={daily} unit={["lead", "leads"]} emptyText="No leads this month" />
            )}
          </Panel>
          <Panel title="Conversion" sub="This month">
            {conversion.isLoading ? (
              <RowsSkeleton rows={5} />
            ) : funnel && funnel.total_leads > 0 ? (
              <MeterList rows={funnelRows} />
            ) : (
              <Empty>No leads this month</Empty>
            )}
          </Panel>
        </div>
      )}

      {/* Today's work */}
      {(seesFollowups || seesLeads) && (
      <div className={cn("grid gap-4", seesFollowups && seesLeads && "lg:grid-cols-2")}>
        {seesFollowups && (
        <Panel
          title="Today's follow-ups"
          sub={fuCounts.data ? `${fuCounts.data.today} due` : undefined}
          action={<ViewAll to="/follow-ups" />}
        >
          {fuToday.isLoading ? (
            <RowsSkeleton />
          ) : fuRows.length === 0 ? (
            <Empty>No follow-ups due today</Empty>
          ) : (
            <ul className="-my-1 divide-y">
              {fuRows.map((f) => (
                <li key={f.id}>
                  <Link
                    to={`/leads/${f.lead}`}
                    className="hover:bg-accent/60 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
                  >
                    <span className="text-muted-foreground w-16 shrink-0 font-mono text-xs tabular-nums">
                      {formatTime(f.scheduled_at)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.lead_name}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {f.enrollment_course_name ? `Payment · ${f.enrollment_course_name}` : f.purpose || "Follow-up"}
                      </span>
                    </span>
                    {f.assigned_to_name && (
                      <span className="text-muted-foreground hidden max-w-[9rem] truncate text-xs sm:block">
                        {f.assigned_to_name}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        )}

        {seesLeads && (
        <Panel title="Recent leads" action={<ViewAll to="/leads" />}>
          {recent.isLoading ? (
            <RowsSkeleton />
          ) : leadRows.length === 0 ? (
            <Empty>No leads yet</Empty>
          ) : (
            <ul className="-my-1 divide-y">
              {leadRows.map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/leads/${l.id}`}
                    className="hover:bg-accent/60 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
                  >
                    <span className="bg-brand-fixed-dim/30 text-brand-container dark:text-brand-fixed flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                      {initialsOf(l.full_name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{l.full_name}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {[l.primary_course?.name ?? l.source_name, relativeToToday(l.created_at)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {l.status_name && <StatusBadge name={l.status_name} color={l.status_color} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        )}
      </div>
      )}

      {/* Sources + counselors */}
      {seesReports && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
          <Panel title="Lead sources" sub="This month">
            {sources.isLoading ? (
              <RowsSkeleton rows={5} />
            ) : sourceRows.length ? (
              <MeterList rows={sourceRows} />
            ) : (
              <Empty>No leads this month</Empty>
            )}
          </Panel>
          <Panel title="Counselors" sub="This month">
            {counselors.isLoading ? (
              <RowsSkeleton rows={5} />
            ) : counselorRows.length === 0 ? (
              <Empty>No assigned leads this month</Empty>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[30rem] text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs">
                      <th className="px-2 pb-2 font-medium">Counselor</th>
                      <th className="px-2 pb-2 text-right font-medium">Leads</th>
                      <th className="px-2 pb-2 text-right font-medium">Converted</th>
                      <th className="px-2 pb-2 text-right font-medium">Rate</th>
                      <th className="px-2 pb-2 text-right font-medium">Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {counselorRows.map((r) => (
                      <tr key={r.counselor.id}>
                        <td className="px-2 py-2.5">
                          <span className="flex items-center gap-2.5">
                            <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                              {initialsOf(r.counselor.name)}
                            </span>
                            <span className="truncate font-medium">{r.counselor.name}</span>
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums">{r.leads_assigned}</td>
                        <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{r.converted}</td>
                        <td className="text-muted-foreground px-2 py-2.5 text-right tabular-nums">
                          {r.conversion_rate}%
                        </td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">
                          NPR {money(r.revenue_collected)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
