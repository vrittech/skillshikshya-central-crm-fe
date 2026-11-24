import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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
import { useDataSource } from "@/context/data-source";
import { useBranches } from "@/hooks/use-branches";
import { useBatchProfit } from "@/hooks/use-reports";
import { formatDate, formatNPR } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { BatchProfitParams, BatchProfitRow } from "@/types/reports-api";

type Status = NonNullable<BatchProfitParams["status"]>;

const STATUS_BADGE: Record<Status, "brand" | "outline" | "secondary"> = {
  upcoming: "outline",
  running: "brand",
  closed: "secondary",
};

function money(value: string | null | undefined) {
  return formatNPR(Number(value ?? 0));
}

function Kpi({
  label,
  value,
  loading,
  loss,
}: {
  label: string;
  value: string | number | undefined;
  loading: boolean;
  loss?: boolean;
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
              loss && "text-destructive",
            )}
          >
            {value ?? 0}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** A money cell; for a closed batch, the figure at close underneath. */
function MoneyCell({
  row,
  field,
  strong,
}: {
  row: BatchProfitRow;
  field: "fees" | "collected" | "owed" | "costs" | "profit";
  strong?: boolean;
}) {
  const atClose = row.at_close?.[field];
  return (
    <TableCell
      className={cn(
        "text-right tabular-nums",
        strong && "font-semibold",
        field === "profit" && Number(row.profit) < 0 && "text-destructive",
      )}
    >
      <p>{money(row[field])}</p>
      {atClose != null && Number(atClose) !== Number(row[field]) && (
        <p className="text-muted-foreground text-xs font-normal">At close {money(atClose)}</p>
      )}
    </TableCell>
  );
}

export default function BatchProfitPage() {
  const { source } = useDataSource();
  const isApi = source === "api";
  const { user } = useAuth();
  const isStaff = !!user?.is_staff;
  const branches = useBranches(1, 100, "", isApi && isStaff);
  const [branch, setBranch] = useState("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const params = useMemo(
    () => ({
      branch_id: branch === "all" ? undefined : Number(branch),
      status: status === "all" ? undefined : status,
    }),
    [branch, status],
  );
  const { data, isLoading } = useBatchProfit(params, isApi);
  const s = data?.summary;
  const rows = data?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            Finance
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">
            Batch profit
          </h1>
        </div>
        {isApi && (
          <div className="flex flex-wrap gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as Status | "all")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            {isStaff && (
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
        )}
      </div>

      {!isApi ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed py-16 text-center text-sm">
          Switch to Live data to see batch profit.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Collected" value={s && money(s.collected)} loading={isLoading} />
            <Kpi label="Costs" value={s && money(s.costs)} loading={isLoading} />
            <Kpi
              label="Profit"
              value={s && money(s.profit)}
              loading={isLoading}
              loss={!!s && Number(s.profit) < 0}
            />
            <Kpi label="Owed" value={s && money(s.owed)} loading={isLoading} />
          </div>

          <div className="bg-card overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Batch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Owed</TableHead>
                  <TableHead className="text-right">Costs</TableHead>
                  <TableHead className="pr-6 text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8} className="pl-6">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!isLoading && (data?.error || rows.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                      {data?.error ?? "No batches."}
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  rows.map((r) => (
                    <TableRow key={r.batch}>
                      <TableCell className="pl-6">
                        <Link to={`/batches/${r.batch}`} className="font-semibold hover:underline">
                          {r.name}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          <span className="font-mono">{r.coursebatch_id}</span> · {r.course_name}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[r.status]}>{r.status_display}</Badge>
                        {r.closed_at && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            {formatDate(r.closed_at)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.students}</TableCell>
                      <MoneyCell row={r} field="fees" />
                      <MoneyCell row={r} field="collected" />
                      <MoneyCell row={r} field="owed" />
                      <MoneyCell row={r} field="costs" />
                      <MoneyCell row={r} field="profit" strong />
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
