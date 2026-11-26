import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DonutChart, FunnelChart, HBarList, MiniBars } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/auth";
import { useBranches } from "@/hooks/use-branches";
import {
  useConversionReport,
  useCounselorPerformance,
  useEnrollmentsReport,
  useLeadsBySource,
  useLeadsByStatus,
  useReportsOverview,
  useRevenueReport,
} from "@/hooks/use-reports";
import { formatNPR } from "@/lib/leads-format";
import type { ReportBaseParams } from "@/types/reports-api";

const DONUT_COLORS = ["#00694c", "#008561", "#67dbae", "#f59e0b", "#64748b", "#0ea5e9", "#a855f7"];

function Kpi({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | number | undefined;
  loading: boolean;
}) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader>
        <CardDescription className="font-mono text-[11px] font-medium tracking-wider uppercase">
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="font-headline text-2xl font-semibold">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isStaff = !!user?.is_staff;
  const branches = useBranches(1, 100, "", isStaff);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [branchId, setBranchId] = useState("all");

  const params = useMemo<ReportBaseParams>(
    () => ({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      branch_id: branchId === "all" ? undefined : Number(branchId),
    }),
    [startDate, endDate, branchId],
  );

  const overview = useReportsOverview(params);
  const conversion = useConversionReport(params);
  const revenue = useRevenueReport(params);
  const enrollments = useEnrollmentsReport(params);
  const byStatus = useLeadsByStatus(params);
  const bySource = useLeadsBySource(params);
  const counselors = useCounselorPerformance(params);

  const loadingAny =
    overview.isLoading ||
    conversion.isLoading ||
    revenue.isLoading ||
    enrollments.isLoading ||
    byStatus.isLoading;

  const totalLeads = byStatus.data?.total ?? 0;
  const statusBars = (byStatus.data?.results ?? []).map((r) => ({
    label: r.status__name,
    value: r.count,
  }));
  const sourceSlices = (bySource.data?.results ?? [])
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((r, i) => ({
      label: String(r.source__name ?? "—"),
      count: r.count,
      pct: Math.round((r.count / Math.max(1, totalLeads)) * 100),
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

  const funnel = conversion.data
    ? [
        { label: "Total", count: conversion.data.funnel.total_leads, pct: 100 },
        {
          label: "Contacted",
          count: conversion.data.funnel.contacted,
          pct: Math.round(conversion.data.rates.contacted_rate),
        },
        {
          label: "Interested",
          count: conversion.data.funnel.interested,
          pct: Math.round(conversion.data.rates.interested_rate),
        },
        {
          label: "Enrolled",
          count: conversion.data.funnel.enrolled,
          pct: Math.round(conversion.data.rates.enrolled_rate),
        },
        {
          label: "Converted",
          count: conversion.data.funnel.converted,
          pct: Math.round(conversion.data.rates.converted_rate),
        },
      ]
    : [];

  const followups = overview.data?.communication.followups;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            Modern analytics
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Aggregates straight from the reporting API — leads, conversion, revenue, enrollments,
            and counselor output.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="w-40"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Start date"
          />
          <span className="text-muted-foreground text-sm">→</span>
          <Input
            type="date"
            className="w-40"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="End date"
          />
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
          <Button variant="outline" onClick={() => toast.info("PDF export — coming soon")}>
            <Download /> Export PDF
          </Button>
        </div>
      </div>

      {loadingAny && !overview.data ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <>
          {/* Overview snapshot */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Total leads" value={overview.data?.leads.total} loading={overview.isLoading} />
            <Kpi
              label={`Converted (${overview.data?.leads.conversion_rate ?? 0}%)`}
              value={overview.data?.leads.converted_total}
              loading={overview.isLoading}
            />
            <Kpi
              label="Revenue collected"
              value={
                overview.data
                  ? formatNPR(Number(overview.data.enrollments.revenue_collected))
                  : undefined
              }
              loading={overview.isLoading}
            />
            <Kpi
              label="Outstanding to collect"
              value={
                revenue.data
                  ? formatNPR(Number(revenue.data.summary.outstanding_to_collect))
                  : undefined
              }
              loading={revenue.isLoading}
            />
          </div>

          {/* Follow-up health */}
          {followups && (
            <div className="grid gap-4 sm:grid-cols-4">
              <Kpi label="Pending follow-ups" value={followups.pending} loading={overview.isLoading} />
              <Kpi label="Overdue" value={followups.overdue} loading={overview.isLoading} />
              <Kpi label="Completed" value={followups.completed} loading={overview.isLoading} />
              <Kpi label="Missed" value={followups.missed} loading={overview.isLoading} />
            </div>
          )}

          {/* Funnel + breakdowns */}
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conversion funnel</CardTitle>
                <CardDescription>
                  Leads reaching each stage
                  {conversion.data ? ` · ${conversion.data.rates.converted_rate}% end-to-end` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conversion.isLoading ? (
                  <Skeleton className="h-28 w-full" />
                ) : funnel.length ? (
                  <FunnelChart stages={funnel} />
                ) : null}
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
                  <p className="text-muted-foreground text-sm">No data.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By status</CardTitle>
              </CardHeader>
              <CardContent>
                {byStatus.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : statusBars.length ? (
                  <HBarList data={statusBars} />
                ) : (
                  <p className="text-muted-foreground text-sm">No data.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by method</CardTitle>
                <CardDescription>Successful payments</CardDescription>
              </CardHeader>
              <CardContent>
                {revenue.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : revenue.data?.by_payment_method.length ? (
                  <HBarList
                    data={revenue.data.by_payment_method.map((m) => ({
                      label: m.payment_method.replace("_", " "),
                      value: Number(m.amount),
                    }))}
                    max={Math.max(...revenue.data.by_payment_method.map((m) => Number(m.amount)))}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">No payments in range.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue by branch */}
          {revenue.data?.by_branch.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by branch</CardTitle>
                <CardDescription>
                  {revenue.data.summary.successful_payments} successful payments · collected{" "}
                  {formatNPR(Number(revenue.data.summary.total_collected))}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HBarList
                  data={revenue.data.by_branch.map((b) => ({
                    label: b.branch__name ?? "—",
                    value: Number(b.amount),
                  }))}
                />
              </CardContent>
            </Card>
          ) : null}

          {/* Enrollments */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enrollments by course</CardTitle>
                <CardDescription>
                  {enrollments.data
                    ? `${enrollments.data.summary.total_enrollments} total · agreed ${formatNPR(Number(enrollments.data.summary.total_agreed_amount))}`
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {enrollments.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : enrollments.data?.by_course.length ? (
                  <HBarList
                    data={enrollments.data.by_course.map((c) => ({
                      label: c.course__name ?? "—",
                      value: c.count,
                    }))}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">No enrollments in range.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enrollment statuses</CardTitle>
              </CardHeader>
              <CardContent>
                {enrollments.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : enrollments.data?.by_status.length ? (
                  <MiniBars values={enrollments.data.by_status.map((s) => s.count)} />
                ) : (
                  <p className="text-muted-foreground text-sm">No data.</p>
                )}
                <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 text-xs capitalize">
                  {enrollments.data?.by_status.map((s) => (
                    <span key={s.status}>
                      {s.status.replace("_", " ")} ({s.count})
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fees collected</CardTitle>
                <CardDescription>Enrollments in range</CardDescription>
              </CardHeader>
              <CardContent>
                {enrollments.isLoading ? (
                  <Skeleton className="h-10 w-28" />
                ) : (
                  <>
                    <p className="font-headline text-2xl font-semibold">
                      {enrollments.data ? formatNPR(Number(enrollments.data.summary.collected)) : 0}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      of{" "}
                      {enrollments.data
                        ? formatNPR(Number(enrollments.data.summary.total_listed_fee))
                        : 0}{" "}
                      listed
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Counselor performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Counselor performance</CardTitle>
              <CardDescription>Productivity per assigned counselor</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Counselor</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Converted</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Follow-ups due</TableHead>
                    <TableHead>Enrollments</TableHead>
                    <TableHead className="pr-6">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {counselors.isLoading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8} className="pl-6">
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {!counselors.isLoading && (counselors.data?.results.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground py-8 pl-6 text-center">
                        No assigned leads in range.
                      </TableCell>
                    </TableRow>
                  )}
                  {counselors.data?.results.map((r) => (
                    <TableRow key={r.counselor.id}>
                      <TableCell className="pl-6">
                        <p className="font-semibold">{r.counselor.name}</p>
                        <p className="text-muted-foreground text-xs">{r.counselor.email}</p>
                      </TableCell>
                      <TableCell>{r.leads_assigned}</TableCell>
                      <TableCell className="font-semibold">{r.converted}</TableCell>
                      <TableCell>{r.conversion_rate}%</TableCell>
                      <TableCell>{r.calls}</TableCell>
                      <TableCell>
                        {r.followups_pending > 0 ? (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {r.followups_pending}
                          </span>
                        ) : (
                          0
                        )}
                      </TableCell>
                      <TableCell>{r.enrollments}</TableCell>
                      <TableCell className="pr-6 font-semibold">
                        {formatNPR(Number(r.revenue_collected))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
