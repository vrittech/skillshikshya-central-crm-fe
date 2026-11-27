import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MeterList, type MeterRow } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBranchScope } from "@/context/branch-scope";
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

function pct(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

/** Rows with each value's share of the total, largest first unless `keepOrder`. */
function meterRows(items: { label: string; value: number }[], keepOrder = false): MeterRow[] {
  const total = items.reduce((sum, r) => sum + r.value, 0);
  const rows = keepOrder ? items : [...items].sort((a, b) => b.value - a.value);
  return rows.map((r) => ({ ...r, share: pct(r.value, total) }));
}

/** Top `n` rows, the rest folded into "Other". */
function topRows(items: { label: string; value: number }[], n: number) {
  const sorted = [...items].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const rest = sorted.slice(n).reduce((sum, r) => sum + r.value, 0);
  return rest > 0 ? [...sorted.slice(0, n), { label: "Other", value: rest }] : sorted;
}

const npr = (v: number) => `NPR ${v.toLocaleString("en-IN")}`;
const label = (v: string) => v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

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

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const branchId = useBranchScope().branchId ?? undefined;

  const params = useMemo<ReportBaseParams>(
    () => ({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      branch_id: branchId,
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

  const statusRows = meterRows(
    (byStatus.data?.results ?? []).map((r) => ({ label: r.status__name, value: r.count })),
  );
  const sourceRows = meterRows(
    topRows(
      (bySource.data?.results ?? []).map((r) => ({ label: String(r.source__name ?? "No source"), value: r.count })),
      5,
    ),
    true,
  );

  const f = conversion.data?.funnel;
  const funnelRows: MeterRow[] = f
    ? [
        { label: "Leads", value: f.total_leads, share: 100 },
        { label: "Contacted", value: f.contacted, share: pct(f.contacted, f.total_leads) },
        { label: "Interested", value: f.interested, share: pct(f.interested, f.total_leads) },
        { label: "Enrolled", value: f.enrolled, share: pct(f.enrolled, f.total_leads) },
        { label: "Converted", value: f.converted, share: pct(f.converted, f.total_leads) },
        { label: "Lost", value: f.lost, share: pct(f.lost, f.total_leads), muted: true },
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
                  <Skeleton className="h-48 w-full" />
                ) : f && f.total_leads > 0 ? (
                  <MeterList rows={funnelRows} />
                ) : (
                  <p className="text-muted-foreground text-sm">No leads in range.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead sources</CardTitle>
                <CardDescription>Share of leads</CardDescription>
              </CardHeader>
              <CardContent>
                {bySource.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : sourceRows.length ? (
                  <MeterList rows={sourceRows} />
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
                ) : statusRows.length ? (
                  <MeterList rows={statusRows} />
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
                  <MeterList
                    format={npr}
                    rows={meterRows(
                      revenue.data.by_payment_method.map((m) => ({
                        label: label(m.payment_method),
                        value: Number(m.amount),
                      })),
                    )}
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
                <MeterList
                  format={npr}
                  rows={meterRows(
                    revenue.data.by_branch.map((b) => ({
                      label: b.branch__name ?? "No branch",
                      value: Number(b.amount),
                    })),
                  )}
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
                  <MeterList
                    rows={meterRows(
                      enrollments.data.by_course.map((c) => ({ label: c.course__name ?? "No course", value: c.count })),
                    )}
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
                  <Skeleton className="h-32 w-full" />
                ) : enrollments.data?.by_status.length ? (
                  <MeterList
                    rows={meterRows(
                      enrollments.data.by_status.map((st) => ({ label: label(st.status), value: st.count })),
                    )}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">No data.</p>
                )}
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
