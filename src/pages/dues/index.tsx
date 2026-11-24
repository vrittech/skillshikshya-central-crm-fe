import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth";
import { useDataSource } from "@/context/data-source";
import { useBranches } from "@/hooks/use-branches";
import { useDueInMonth, useWhoOwes } from "@/hooks/use-reports";
import { daysText } from "@/lib/due-dates";
import { formatDate, formatNPR } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { DuesPerson } from "@/types/reports-api";

function money(value: string | null | undefined) {
  return formatNPR(Number(value ?? 0));
}

/** "2026-12" for next month, in the browser's time zone. */
function nextMonth() {
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
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
  tone?: "late";
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
          <Skeleton className="h-8 w-24" />
        ) : (
          <p
            className={cn(
              "font-headline text-2xl font-semibold tabular-nums",
              tone === "late" && "text-destructive",
            )}
          >
            {value ?? 0}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Person({ row }: { row: DuesPerson }) {
  return (
    <>
      <Link to={`/leads/${row.lead}`} className="font-semibold hover:underline">
        {row.name}
      </Link>
      <p className="text-muted-foreground text-xs">
        {row.student_id ? <span className="font-mono">{row.student_id}</span> : "—"}
        {row.phone ? ` · ${row.phone}` : ""}
      </p>
    </>
  );
}

function Course({ row }: { row: DuesPerson }) {
  return (
    <>
      <Link to={`/enrollments/${row.enrollment}`} className="hover:underline">
        {row.course_name}
      </Link>
      <p className="text-muted-foreground text-xs">{row.batch_name ?? "—"}</p>
    </>
  );
}

function TableState({
  loading,
  empty,
  cols,
  error,
}: {
  loading: boolean;
  empty: boolean;
  cols: number;
  error?: string;
}) {
  if (loading) {
    return Array.from({ length: 3 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell colSpan={cols} className="pl-6">
          <Skeleton className="h-5 w-full" />
        </TableCell>
      </TableRow>
    ));
  }
  if (error || empty) {
    return (
      <TableRow>
        <TableCell colSpan={cols} className="text-muted-foreground py-10 text-center">
          {error ?? "No dues."}
        </TableCell>
      </TableRow>
    );
  }
  return null;
}

/* ------------------------------------------------------------ who owes */

function WhoOwes({ branchId }: { branchId?: number }) {
  const [lateOnly, setLateOnly] = useState(false);
  const { data, isLoading } = useWhoOwes({ branch_id: branchId, late_only: lateOnly || undefined });
  const s = data?.summary;
  const rows = data?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total owed" value={s && money(s.total_owed)} loading={isLoading} />
        <Kpi label="Late" value={s && money(s.total_late)} loading={isLoading} tone="late" />
        <Kpi label="Not late" value={s && money(s.not_late)} loading={isLoading} />
        <Kpi label="Students" value={s?.students} loading={isLoading} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Late 1–30 days" value={s && money(s.days_1_30)} loading={isLoading} />
        <Kpi label="Late 31–60 days" value={s && money(s.days_31_60)} loading={isLoading} />
        <Kpi label="Late 61–90 days" value={s && money(s.days_61_90)} loading={isLoading} />
        <Kpi label="Late over 90 days" value={s && money(s.over_90)} loading={isLoading} />
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border">
        <div className="flex items-center justify-end gap-2 border-b p-4">
          <Switch id="late-only" checked={lateOnly} onCheckedChange={setLateOnly} />
          <Label htmlFor="late-only">Late only</Label>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="text-right">Owed</TableHead>
              <TableHead className="text-right">Late</TableHead>
              <TableHead>Days late</TableHead>
              <TableHead className="pr-6">Next due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              loading={isLoading}
              empty={!rows.length}
              cols={6}
              error={data?.error}
            />
            {!isLoading &&
              rows.map((r) => (
                <TableRow key={r.enrollment}>
                  <TableCell className="pl-6">
                    <Person row={r} />
                  </TableCell>
                  <TableCell>
                    <Course row={r} />
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {money(r.owed)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      Number(r.late) > 0 && "text-destructive font-semibold",
                    )}
                  >
                    {Number(r.late) > 0 ? money(r.late) : "—"}
                  </TableCell>
                  <TableCell>{r.days_late > 0 ? daysText(r.days_late) : "—"}</TableCell>
                  <TableCell className="pr-6">
                    {r.next_due_on ? (
                      <>
                        <p>{formatDate(r.next_due_on)}</p>
                        <p className="text-muted-foreground text-xs">
                          {money(r.next_due_amount)}
                        </p>
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ due in month */

function DueInMonth({ branchId }: { branchId?: number }) {
  const [month, setMonth] = useState(nextMonth());
  const { data, isLoading } = useDueInMonth({ branch_id: branchId, month: month || undefined });
  const s = data?.summary;
  const rows = data?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Total due" value={s && money(s.total_due)} loading={isLoading} />
        <Kpi label="Due dates" value={s?.parts} loading={isLoading} />
        <Kpi label="Students" value={s?.students} loading={isLoading} />
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border">
        <div className="flex items-center justify-end gap-2 border-b p-4">
          <Label htmlFor="due-month">Month</Label>
          <Input
            id="due-month"
            type="month"
            className="w-44"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Due date</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="pr-6 text-right">Left</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState
              loading={isLoading}
              empty={!rows.length}
              cols={6}
              error={data?.error}
            />
            {!isLoading &&
              rows.map((r, i) => (
                <TableRow key={`${r.enrollment}-${r.due_on}-${i}`}>
                  <TableCell className="pl-6">
                    <p>{formatDate(r.due_on)}</p>
                    {r.kind === "extra_charge" && (
                      <p className="text-muted-foreground text-xs">Extra charge</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Person row={r} />
                  </TableCell>
                  <TableCell>
                    <Course row={r} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.amount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.paid)}</TableCell>
                  <TableCell className="pr-6 text-right font-semibold tabular-nums">
                    {money(r.left)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ page */

export default function DuesPage() {
  const { source } = useDataSource();
  const isApi = source === "api";
  const { user } = useAuth();
  const isStaff = !!user?.is_staff;
  const branches = useBranches(1, 100, "", isApi && isStaff);
  const [branch, setBranch] = useState("all");
  const branchId = useMemo(() => (branch === "all" ? undefined : Number(branch)), [branch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            Finance
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Dues</h1>
        </div>
        {isApi && isStaff && (
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-44">
              <SelectValue />
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

      {!isApi ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed py-16 text-center text-sm">
          Switch to Live data to see dues.
        </div>
      ) : (
        <Tabs defaultValue="who-owes">
          <TabsList>
            <TabsTrigger value="who-owes">Who owes</TabsTrigger>
            <TabsTrigger value="due-in-month">Due by month</TabsTrigger>
          </TabsList>
          <TabsContent value="who-owes" className="mt-4">
            <WhoOwes branchId={branchId} />
          </TabsContent>
          <TabsContent value="due-in-month" className="mt-4">
            <DueInMonth branchId={branchId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
