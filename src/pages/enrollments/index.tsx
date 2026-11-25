import { GraduationCap, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useEnrollments } from "@/hooks/use-billing";
import { formatDate, formatNPR } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import { EnrollmentDialog } from "@/pages/leads/components/enrollment-dialogs";
import type { ApiSeatState } from "@/types/leads-api";

const STATUS_TONE: Record<string, string> = {
  active: "bg-brand-fixed-dim/20 text-brand-container",
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  cancelled: "bg-destructive/10 text-destructive",
  dropped_out: "bg-destructive/10 text-destructive",
  transferred: "bg-muted text-muted-foreground",
};

export default function EnrollmentsPage() {
  const navigate = useNavigate();
  const { isMock, source } = useDataSource();
  const { can } = useRole();
  const [seat, setSeat] = useState<ApiSeatState | "all">("all");
  const { rows, isLoading } = useEnrollments(seat === "all" ? undefined : seat);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const statuses = useMemo(
    () => [...new Set(rows.map((r) => r.status))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (q && !`${r.leadName} ${r.courseName} ${r.batch ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, status]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">CRM Workspace</p>
        <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Enrollments</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Enrollments across all leads.{isMock && " Previewing mock data."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm min-w-[14rem] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
          <Input
            placeholder="Search by lead, course, or batch"
            className="rounded-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isMock && (
          <Select value={seat} onValueChange={(v) => setSeat(v as ApiSeatState | "all")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All seats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All seats</SelectItem>
              <SelectItem value="seated">In a batch</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="none">No batch</SelectItem>
            </SelectContent>
          </Select>
        )}
        {source === "api" && can("enrollment.manage") && (
          <Button variant="brand" onClick={() => setCreateOpen(true)}>
            <Plus /> New Enrollment
          </Button>
        )}
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead className="text-right">Agreed</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <GraduationCap className="text-muted-foreground mx-auto size-8 opacity-40" />
                    <p className="text-muted-foreground mt-2 text-sm">No enrollments found.</p>
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((e) => (
                <TableRow
                  key={e.id}
                  className={cn(source === "api" && "cursor-pointer")}
                  onClick={() =>
                    source === "api"
                      ? navigate(`/enrollments/${e.id}`)
                      : e.leadId && navigate(`/leads/${e.leadId}`)
                  }
                >
                  <TableCell className="font-semibold">
                    {e.leadId ? (
                      <Link
                        to={`/leads/${e.leadId}`}
                        className="hover:underline"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        {e.leadName}
                      </Link>
                    ) : (
                      e.leadName
                    )}
                  </TableCell>
                  <TableCell>{e.courseName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.batch || "—"}
                    {e.seatState === "paused" && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge variant="outline">Paused</Badge>
                        {e.pausedOn && <span className="text-xs">{formatDate(e.pausedOn)}</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn("capitalize", STATUS_TONE[e.status] ?? "bg-muted text-muted-foreground")}
                    >
                      {e.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.enrollmentDate ? formatDate(e.enrollmentDate) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNPR(e.agreed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNPR(e.paid)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums font-medium",
                      e.remaining > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {e.isFullPaid ? "Paid" : formatNPR(e.remaining)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <EnrollmentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        allowLeadPick
      />
    </div>
  );
}
