import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MonthPicker } from "@/components/month-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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
import type { DuesPerson, OwedGroup, WhoOwesReport } from "@/types/reports-api";

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

type OwedView = "students" | "counselor" | "batch";

/** The group a student list is narrowed to, picked from a By counselor or By batch row. */
interface OwedFilter {
  counselor?: number | "none";
  batch?: number;
  label: string;
}

interface GroupRow extends OwedGroup {
  key: string;
  name: string;
  /** Picking the row narrows the student list to it; none for "No batch". */
  filter?: OwedFilter;
}

function groupRows(data: WhoOwesReport | undefined, view: OwedView): GroupRow[] {
  if (view === "counselor") {
    return (data?.by_counselor ?? []).map((g) => {
      const name = g.counselor_name ?? "Not assigned";
      return { ...g, key: String(g.counselor), name, filter: { counselor: g.counselor ?? "none", label: name } };
    });
  }
  return (data?.by_batch ?? []).map((g) => {
    const name = g.batch == null ? "No batch" : (g.batch_name ?? "—");
    return {
      ...g,
      key: String(g.batch),
      name,
      filter: g.batch == null ? undefined : { batch: g.batch, label: name },
    };
  });
}

function OwedGroups({
  view,
  rows,
  loading,
  error,
  onPick,
}: {
  view: OwedView;
  rows: GroupRow[];
  loading: boolean;
  error?: string;
  onPick: (f: OwedFilter) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">{view === "counselor" ? "Counselor" : "Batch"}</TableHead>
          <TableHead className="text-right">Students</TableHead>
          <TableHead className="text-right">Owed</TableHead>
          <TableHead className="text-right">Late</TableHead>
          <TableHead className="pr-6">Longest late</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableState loading={loading} empty={!rows.length} cols={5} error={error} />
        {!loading &&
          rows.map((g) => (
            <TableRow key={g.key}>
              <TableCell className="pl-6">
                {g.filter ? (
                  <button
                    type="button"
                    className={cn(
                      "font-semibold hover:underline",
                      g.filter.counselor === "none" && "text-amber-600 dark:text-amber-400",
                    )}
                    onClick={() => g.filter && onPick(g.filter)}
                  >
                    {g.name}
                  </button>
                ) : (
                  <span className="text-muted-foreground font-semibold">{g.name}</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{g.students}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{money(g.owed)}</TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  Number(g.late) > 0 && "text-destructive font-semibold",
                )}
              >
                {Number(g.late) > 0 ? money(g.late) : "—"}
              </TableCell>
              <TableCell className="pr-6">{g.days_late > 0 ? daysText(g.days_late) : "—"}</TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

function WhoOwes({ branchId }: { branchId?: number }) {
  const [lateOnly, setLateOnly] = useState(false);
  const [view, setView] = useState<OwedView>("students");
  const [filter, setFilter] = useState<OwedFilter | null>(null);
  // A group view adds up everyone; the student list can be narrowed to one group.
  const narrowed = view === "students" && filter;
  const { data, isLoading } = useWhoOwes({
    branch_id: branchId,
    late_only: lateOnly || undefined,
    counselor: narrowed ? filter.counselor : undefined,
    batch: narrowed ? filter.batch : undefined,
  });
  const s = data?.summary;
  const rows = data?.results ?? [];

  function pick(f: OwedFilter) {
    setFilter(f);
    setView("students");
  }

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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as OwedView)}>
              <TabsList>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="counselor">By counselor</TabsTrigger>
                <TabsTrigger value="batch">By batch</TabsTrigger>
              </TabsList>
            </Tabs>
            {narrowed && (
              <Badge variant="secondary" className="gap-1 py-1 pr-1">
                {filter.label}
                <button
                  type="button"
                  aria-label="Show everyone"
                  className="hover:bg-foreground/10 rounded-full p-0.5"
                  onClick={() => setFilter(null)}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch id="late-only" checked={lateOnly} onCheckedChange={setLateOnly} />
            <Label htmlFor="late-only">Late only</Label>
          </div>
        </div>
        {view === "students" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Counselor</TableHead>
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
                cols={7}
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
                    <TableCell className={cn(!r.counselor_name && "text-muted-foreground")}>
                      {r.counselor_name ?? "Not assigned"}
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
        ) : (
          <OwedGroups
            view={view}
            rows={groupRows(data, view)}
            loading={isLoading}
            error={data?.error}
            onPick={pick}
          />
        )}
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
          <MonthPicker id="due-month" className="w-48" value={month} onChange={setMonth} />
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
