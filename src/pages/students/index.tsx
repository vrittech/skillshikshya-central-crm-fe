import { Download, GraduationCap, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { useStudents } from "@/hooks/use-students";
import { apiErrorMessage } from "@/lib/api";
import { formatDate, initialsOf } from "@/lib/leads-format";
import { studentsService } from "@/services/students.service";
import type { ApiStudentStatus } from "@/types/leads-api";
import { StudentDetailSheet } from "./student-detail-sheet";
import { StudentFormDialog } from "./student-form-dialog";

const STATUS_TONE: Record<ApiStudentStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  inactive: "bg-muted text-muted-foreground",
  graduated: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  dropped: "bg-destructive/10 text-destructive",
  transferred: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "graduated", label: "Graduated" },
  { value: "dropped", label: "Dropped" },
  { value: "transferred", label: "Transferred" },
];

export default function StudentsPage() {
  const { source } = useDataSource();
  const isApi = source === "api";
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(
    () => ({
      page: 1,
      page_size: 100,
      search: debounced || undefined,
      status: status === "all" ? undefined : status,
    }),
    [debounced, status],
  );

  const { data, isLoading } = useStudents(params);
  const rows = isApi ? data?.results ?? [] : [];

  async function handleExport() {
    setExporting(true);
    try {
      // Export honours the active filters (same query params as the list).
      await studentsService.exportCsv({
        search: params.search,
        status: params.status,
        ordering: "-created_at",
      });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">Institute</p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Enrolled students.
            {!isApi && " Switch the data source to Live to manage students."}
          </p>
        </div>
        {isApi && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              <Download /> {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            <Button variant="brand" onClick={() => setFormOpen(true)}>
              <Plus /> New Student
            </Button>
          </div>
        )}
      </div>

      {!isApi ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed py-16 text-center text-sm">
          Switch to Live data to see students.
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex flex-wrap items-center gap-2 border-b p-4">
            <div className="relative min-w-[16rem] flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
              <Input
                placeholder="Search students, ID, phone..."
                className="rounded-full pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 min-w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <GraduationCap className="text-muted-foreground mx-auto size-6" />
                    <p className="mt-2 text-sm font-semibold">No students yet</p>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => setDetailId(s.id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="bg-brand-fixed-dim/30 text-brand-container flex size-9 items-center justify-center rounded-full text-xs font-bold">
                        {initialsOf(s.full_name)}
                      </span>
                      <div>
                        <p className="font-semibold">{s.full_name}</p>
                        {s.email && <p className="text-muted-foreground text-xs">{s.email}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{s.student_id}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.phone}</TableCell>
                  <TableCell className="text-sm">{s.branch_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.enrolled_at ? formatDate(s.enrolled_at) : "—"}
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_TONE[s.status]}`}>
                      {s.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <StudentFormDialog open={formOpen} onClose={() => setFormOpen(false)} />

      <StudentDetailSheet studentId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
