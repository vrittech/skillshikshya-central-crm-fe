import { CreditCard, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataSource } from "@/context/data-source";
import { useRole } from "@/context/role";
import { usePayments } from "@/hooks/use-billing";
import { formatDateTime, formatNPR } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import { PaymentDialog } from "@/pages/leads/components/enrollment-dialogs";
import { PaymentActions } from "@/pages/leads/components/payment-actions";

const STATUS_TONE: Record<string, string> = {
  successful: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
  voided: "bg-muted text-muted-foreground",
};

export default function PaymentsPage() {
  const navigate = useNavigate();
  const { isMock, source } = useDataSource();
  const { can } = useRole();
  const { rows, isLoading } = usePayments();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [payOpen, setPayOpen] = useState(false);
  const canEdit = source === "api" && can("payment.manage");

  const statuses = useMemo(() => [...new Set(rows.map((r) => r.status))].sort(), [rows]);
  const methods = useMemo(() => [...new Set(rows.map((r) => r.method))].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (method !== "all" && r.method !== method) return false;
      if (q && !`${r.leadName} ${r.courseName ?? ""} ${r.reference ?? ""} ${r.method}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [rows, search, status, method]);

  // Ledger total of successful payments in the current view.
  const total = useMemo(
    () => filtered.filter((r) => r.status === "successful").reduce((s, r) => s + r.amount, 0),
    [filtered],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">CRM Workspace</p>
        <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Payment ledger across all enrollments.{isMock && " Previewing mock data."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-[13rem] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search by lead, course, method, or reference"
            className="rounded-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            {methods.map((m) => (
              <SelectItem key={m} value={m} className="capitalize">
                {m.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-3 text-right">
          <div>
            <p className="text-muted-foreground text-xs">Successful (this view)</p>
            <p className="font-headline text-lg font-semibold tabular-nums">{formatNPR(total)}</p>
          </div>
          {source === "api" && can("enrollment.manage") && (
            <Button variant="brand" onClick={() => setPayOpen(true)}>
              <CreditCard /> Record Payment
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received by</TableHead>
                <TableHead>Date</TableHead>
                {canEdit && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={canEdit ? 9 : 8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 9 : 8} className="py-14 text-center">
                    <CreditCard className="text-muted-foreground mx-auto size-8 opacity-40" />
                    <p className="text-muted-foreground mt-2 text-sm">No payments found.</p>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => (
                <TableRow
                  key={p.id}
                  className={cn(p.leadId && "cursor-pointer")}
                  onClick={() => p.leadId && navigate(`/leads/${p.leadId}`)}
                >
                  <TableCell className="font-semibold">{p.leadName}</TableCell>
                  <TableCell className="text-muted-foreground">{p.courseName || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatNPR(p.amount)}</TableCell>
                  <TableCell className="capitalize">{p.method.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{p.reference || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn("capitalize", STATUS_TONE[p.status] ?? "bg-muted text-muted-foreground")}
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.receivedBy || "—"}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(p.paidAt)}
                  </TableCell>
                  {canEdit && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {p.leadId && p.enrollmentId && (
                        <div className="flex items-center gap-1">
                          <PaymentActions
                            leadId={Number(p.leadId)}
                            enrollmentId={Number(p.enrollmentId)}
                            paymentId={Number(p.id)}
                            status={p.status}
                            amount={p.amount}
                          />
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <PaymentDialog open={payOpen} onClose={() => setPayOpen(false)} allowLeadPick />
    </div>
  );
}
