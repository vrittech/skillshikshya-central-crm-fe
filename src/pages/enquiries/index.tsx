import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranchScope } from "@/context/branch-scope";
import { useCourses } from "@/hooks/use-courses";
import { useEnquiryFunnel } from "@/hooks/use-reports";
import { STAGE_CLASS } from "@/lib/enquiries";
import { cn } from "@/lib/utils";
import type { EnquiryBreakdownRow, EnquiryFunnelReport } from "@/types/reports-api";

type Breakdown = "by_course" | "by_source" | "by_counselor";

const BREAKDOWNS: { value: Breakdown; label: string; column: string }[] = [
  { value: "by_course", label: "Course", column: "Course" },
  { value: "by_source", label: "Source", column: "Source" },
  { value: "by_counselor", label: "Counselor", column: "Counselor" },
];

function pct(value: number) {
  return `${value}%`;
}

function Kpi({
  label,
  value,
  loading,
  tone,
}: {
  label: string;
  value: string | number | undefined;
  loading: boolean;
  tone?: string;
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
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className={cn("font-headline text-2xl font-semibold tabular-nums", tone)}>
            {value ?? 0}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Empty({ cols, text }: { cols: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-muted-foreground py-10 text-center">
        {text}
      </TableCell>
    </TableRow>
  );
}

function Loading({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={cols} className="pl-6">
            <Skeleton className="h-5 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function FunnelTable({ data, loading }: { data?: EnquiryFunnelReport; loading: boolean }) {
  const total = data?.summary.enquiries ?? 0;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Stage</TableHead>
          <TableHead className="w-[40%]">Reached</TableHead>
          <TableHead className="text-right">Open</TableHead>
          <TableHead className="text-right">Lost here</TableHead>
          <TableHead className="pr-6 text-right">Lost rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && <Loading cols={5} />}
        {!loading && (data?.error || total === 0) && (
          <Empty cols={5} text={data?.error ?? "No enquiries."} />
        )}
        {!loading &&
          total > 0 &&
          data?.funnel.map((f) => (
            <TableRow key={f.stage}>
              <TableCell className="pl-6">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    STAGE_CLASS[f.stage],
                  )}
                >
                  {f.label}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                    <div
                      className="bg-brand h-full rounded-full"
                      style={{ width: `${f.reached_rate}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-sm tabular-nums">
                    {f.reached} · {pct(f.reached_rate)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{f.stage === "won" ? "—" : f.open}</TableCell>
              <TableCell
                className={cn("text-right tabular-nums", f.lost > 0 && "text-destructive font-semibold")}
              >
                {f.stage === "won" ? "—" : f.lost}
              </TableCell>
              <TableCell className="pr-6 text-right tabular-nums">
                {f.stage === "won" ? "—" : pct(f.lost_rate)}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

function BreakdownTable({
  rows,
  column,
  loading,
}: {
  rows: EnquiryBreakdownRow[];
  column: string;
  loading: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">{column}</TableHead>
          <TableHead className="text-right">Enquiries</TableHead>
          <TableHead className="text-right">Won</TableHead>
          <TableHead className="text-right">Lost</TableHead>
          <TableHead className="text-right">Open</TableHead>
          <TableHead className="pr-6 text-right">Win rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && <Loading cols={6} />}
        {!loading && rows.length === 0 && <Empty cols={6} text="No enquiries." />}
        {!loading &&
          rows.map((r) => (
            <TableRow key={r.id ?? "none"}>
              <TableCell className="pl-6 font-medium">{r.name}</TableCell>
              <TableCell className="text-right tabular-nums">{r.enquiries}</TableCell>
              <TableCell className="text-right tabular-nums">{r.won}</TableCell>
              <TableCell className="text-right tabular-nums">{r.lost}</TableCell>
              <TableCell className="text-right tabular-nums">{r.open}</TableCell>
              <TableCell className="pr-6 text-right tabular-nums">{pct(r.win_rate)}</TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

export default function EnquiriesReportPage() {
  const courses = useCourses(1, 100, "");
  const branchId = useBranchScope().branchId ?? undefined;
  const [course, setCourse] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [breakdown, setBreakdown] = useState<Breakdown>("by_course");
  const params = useMemo(
    () => ({
      branch_id: branchId,
      course: course === "all" ? undefined : Number(course),
      start_date: from || undefined,
      end_date: to || undefined,
    }),
    [branchId, course, from, to],
  );
  const { data, isLoading } = useEnquiryFunnel(params);
  const s = data?.summary;
  const current = BREAKDOWNS.find((b) => b.value === breakdown)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            Reports
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Enquiries</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.data?.results.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="w-40"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            title="From"
          />
          <Input
            type="date"
            className="w-40"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            title="To"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Enquiries" value={s?.enquiries} loading={isLoading} />
        <Kpi label="Won" value={s?.won} loading={isLoading} />
        <Kpi label="Lost" value={s?.lost} loading={isLoading} tone={s?.lost ? "text-destructive" : undefined} />
        <Kpi label="Open" value={s?.open} loading={isLoading} />
        <Kpi
          label={`No move ${s?.stale_days ?? 14}+ days`}
          value={s?.stale}
          loading={isLoading}
        />
        <Kpi label="Win rate" value={s && pct(s.win_rate)} loading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="bg-card overflow-hidden rounded-2xl border">
          <p className="border-b px-6 py-3 text-sm font-semibold">Stages</p>
          <FunnelTable data={data} loading={isLoading} />
        </div>
        <div className="bg-card overflow-hidden rounded-2xl border">
          <p className="border-b px-6 py-3 text-sm font-semibold">Lost reasons</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Reason</TableHead>
                <TableHead className="text-right">Lost</TableHead>
                <TableHead className="pr-6 text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <Loading cols={3} />}
              {!isLoading && (data?.lost_by_reason.length ?? 0) === 0 && (
                <Empty cols={3} text="No lost enquiries." />
              )}
              {!isLoading &&
                data?.lost_by_reason.map((r) => (
                  <TableRow key={r.reason}>
                    <TableCell className="pl-6">{r.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{pct(r.rate)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border">
        <div className="border-b px-4 py-2">
          <Tabs value={breakdown} onValueChange={(v) => setBreakdown(v as Breakdown)}>
            <TabsList>
              {BREAKDOWNS.map((b) => (
                <TabsTrigger key={b.value} value={b.value}>
                  {b.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <BreakdownTable
          rows={data?.[breakdown] ?? []}
          column={current.column}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
