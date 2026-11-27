import { ArrowRightLeft, CalendarCheck, ExternalLink, FileText, History, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth";
import { useRole } from "@/context/role";
import { useCourses } from "@/hooks/use-courses";
import { useTeamsLicences } from "@/hooks/use-teams";
import { openInvoicePdf, useResendInvoice, useStudentInvoices } from "@/hooks/use-invoices";
import {
  useAttendanceProfile,
  useDeleteAttendance,
  useMarkAttendance,
  useStudent,
  useStudentAttendance,
  useStudentBranchMoves,
  useStudentDocuments,
} from "@/hooks/use-students";
import { formatDate, formatDateTime, formatNPR } from "@/lib/leads-format";
import { localToday } from "@/lib/seats";
import { cn } from "@/lib/utils";
import type { ApiAttendanceStatus, ApiStudentStatus } from "@/types/leads-api";
import { TeamsStateBadge } from "../leads/components/teams-licence";
import { MoveBranchDialog } from "./move-branch-dialog";

const STATUS_TONE: Record<ApiStudentStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  inactive: "bg-muted text-muted-foreground",
  graduated: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  dropped: "bg-destructive/10 text-destructive",
  transferred: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface-container-low rounded-xl border p-3">
      <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-wider uppercase">
        {label}
      </p>
      <p className="font-headline mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/** The Teams accounts the student holds now, with their state. */
function TeamsAccounts({ studentId }: { studentId: number }) {
  const { data } = useTeamsLicences({ student: studentId, open: true, page_size: 10 });
  const licences = data?.results ?? [];
  if (licences.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-sm font-semibold">Teams account</p>
      <ul className="divide-border divide-y rounded-xl border">
        {licences.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="font-mono text-sm">{l.account}</p>
              <p className="text-muted-foreground text-xs">
                {l.course_name}
                {l.batch_name ? ` · ${l.batch_name}` : ""} · Given {formatDate(l.assigned_at)}
                {l.details_sent_at ? ` · Details sent ${formatDate(l.details_sent_at)}` : ""}
              </p>
            </div>
            {l.state && (
              <TeamsStateBadge state={l.state.state} label={l.state.label} reason={l.state.reason} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ tabs */

function InvoicesTab({ studentId }: { studentId: number }) {
  const { invoices, isLoading } = useStudentInvoices(studentId);
  const { user } = useAuth();
  const resend = useResendInvoice();

  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (!invoices.length)
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No invoices.
      </p>
    );

  return (
    <ul className="divide-border divide-y">
      {invoices.map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold">
              {i.invoice_number}
              {i.status === "cancelled" && (
                <span className="text-destructive ml-2 font-sans">Cancelled</span>
              )}
            </p>
            {i.status === "cancelled" && i.cancel_reason && (
              <p className="text-muted-foreground truncate text-xs">Reason: {i.cancel_reason}</p>
            )}
            <p className="text-muted-foreground truncate text-xs">
              {i.type_display ?? i.type} · {i.course_name || "—"} · {formatDate(i.created_at)}
            </p>
            <p className="text-muted-foreground text-xs">
              {i.sent_at ? `Emailed to ${i.emailed_to}` : "Not emailed yet"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={
                i.status === "cancelled"
                  ? "text-muted-foreground text-sm font-medium tabular-nums line-through"
                  : "text-sm font-medium tabular-nums"
              }
            >
              {formatNPR(Number(i.amount))}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-8"
              title="Open PDF"
              aria-label="Open PDF"
              onClick={() => openInvoicePdf(i.id)}
            >
              <FileText />
            </Button>
            {user?.is_staff && i.status !== "cancelled" && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground size-8"
                title="Re-send email"
                disabled={resend.isPending}
                onClick={() => resend.mutate(i.id)}
              >
                <Send />
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AttendanceTab({ studentId }: { studentId: number }) {
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const course = courseFilter === "all" ? undefined : Number(courseFilter);

  const profileQ = useAttendanceProfile(studentId, course);
  const recordsQ = useStudentAttendance(studentId, course ? { course } : {});
  const coursesQ = useCourses(1, 100, "");
  const mark = useMarkAttendance(studentId);
  const removeRecord = useDeleteAttendance(studentId);

  const [date, setDate] = useState(localToday);
  const [status, setStatus] = useState<ApiAttendanceStatus>("present");
  const [remarks, setRemarks] = useState("");

  const profile = profileQ.data;
  const records = recordsQ.data?.results ?? [];
  const courses = coursesQ.data?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">Attendance overview</p>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="h-8 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {profileQ.isLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : profile ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Attendance" value={`${profile.attendance_percentage}%`} />
            <Stat label="Present" value={`${profile.present_count}/${profile.total_classes}`} />
            <Stat label="Current streak" value={profile.current_streak} />
            <Stat label="Longest streak" value={profile.longest_streak} />
          </div>

          {profile.monthly_breakdown?.length > 0 && (
            <div className="space-y-1.5">
              {profile.monthly_breakdown.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="text-muted-foreground w-16 font-mono text-xs">{m.month}</span>
                  <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                    <div
                      className="bg-brand h-full rounded-full"
                      style={{ width: `${m.percentage}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-xs tabular-nums">
                    {m.present}/{m.total} · {m.percentage}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      <div className="space-y-3 rounded-xl border p-3">
        <p className="text-sm font-semibold">Mark attendance</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label className="text-xs" required>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs" required>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ApiAttendanceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Remarks</Label>
            <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <Button
          size="sm"
          variant="brand"
          disabled={mark.isPending || !date || course == null}
          onClick={() =>
            course != null &&
            mark.mutate(
              { date, status, course, remarks: remarks || null },
              { onSuccess: () => setRemarks("") },
            )
          }
        >
          <CalendarCheck /> {mark.isPending ? "Saving…" : "Mark"}
        </Button>
        {course == null && <p className="text-muted-foreground text-xs">Pick a course.</p>}
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold">Recent records</p>
        {recordsQ.isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : records.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">No attendance recorded.</p>
        ) : (
          <ul className="divide-border divide-y">
            {records.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm">{formatDate(r.date)}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {r.course_name || "No course"}
                    {r.remarks ? ` · ${r.remarks}` : ""}
                    {r.marked_by_name ? ` · by ${r.marked_by_name}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                      r.status === "present"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {r.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive size-8"
                    title="Delete record"
                    onClick={() => removeRecord.mutate(r.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DocumentsTab({ studentId }: { studentId: number }) {
  const { data, isLoading } = useStudentDocuments(studentId);
  const docs = data?.results ?? [];

  if (isLoading) return <Skeleton className="h-20 w-full rounded-xl" />;
  if (!docs.length)
    return <p className="text-muted-foreground py-8 text-center text-sm">No documents uploaded.</p>;

  return (
    <ul className="divide-border divide-y">
      {docs.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="text-muted-foreground size-4 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{d.document_type}</p>
              {d.created_at && (
                <p className="text-muted-foreground text-xs">{formatDate(d.created_at)}</p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.open(d.file, "_blank")}>
            <ExternalLink /> Open
          </Button>
        </li>
      ))}
    </ul>
  );
}

function BranchMoves({ studentId }: { studentId: number }) {
  const { data: moves } = useStudentBranchMoves(studentId);
  if (!moves?.length) return null;
  return (
    <div>
      <p className="mb-1 text-sm font-semibold">Branch moves</p>
      <ul className="divide-border divide-y">
        {moves.map((m) => (
          <li key={m.id} className="py-2.5">
            <p className="text-sm font-medium">
              {m.from_branch_name ?? "No branch"} → {m.to_branch_name}
            </p>
            <p className="text-muted-foreground text-xs">
              {formatDateTime(m.moved_at)} · {m.moved_by_name}
            </p>
            <p className="mt-0.5 text-sm [overflow-wrap:anywhere]">{m.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ sheet */

/** Student detail — profile, payment summary, invoices, attendance, documents. */
export function StudentDetailSheet({
  studentId,
  onClose,
}: {
  studentId: number | null;
  onClose: () => void;
}) {
  const { data: student, isLoading } = useStudent(studentId);
  const { user, hasPerm } = useAuth();
  const { can } = useRole();
  const sees = {
    invoices: hasPerm("invoices.view_invoice"),
    attendance: hasPerm("student.view_attendance"),
    documents: hasPerm("student.view_studentdocument"),
    teams: hasPerm("lead.view_teamslicence"),
    payments: hasPerm("lead.view_payment"),
  };
  const [moving, setMoving] = useState(false);

  return (
    <Sheet open={studentId != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          {isLoading || !student ? (
            <Skeleton className="h-10 w-56" />
          ) : (
            <>
              <SheetTitle className="flex items-center gap-2">
                {student.full_name}
                <Badge variant="secondary" className={cn("capitalize", STATUS_TONE[student.status])}>
                  {student.status}
                </Badge>
              </SheetTitle>
              <SheetDescription>
                <span className="font-mono">{student.student_id}</span> · {student.phone}
                {student.branch_name ? ` · ${student.branch_name}` : ""}
              </SheetDescription>
              <div className="flex flex-wrap gap-2">
                {student.lead != null && can("leads.view") && (
                  <Button size="sm" variant="outline" className="w-fit" asChild>
                    <Link to={`/leads/${student.lead}?tab=history`}>
                      <History /> Full history
                    </Link>
                  </Button>
                )}
                {can("students.move_branch") && (
                  <Button size="sm" variant="outline" className="w-fit" onClick={() => setMoving(true)}>
                    <ArrowRightLeft /> Move branch
                  </Button>
                )}
              </div>
              <MoveBranchDialog
                student={student}
                open={moving}
                onOpenChange={setMoving}
                // A branch user can't see a student once they leave the branch.
                onMoved={() => !user?.is_staff && onClose()}
              />
            </>
          )}
        </SheetHeader>

        <SheetBody>
          {isLoading || !student ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                {sees.invoices && <TabsTrigger value="invoices">Invoices</TabsTrigger>}
                {sees.attendance && <TabsTrigger value="attendance">Attendance</TabsTrigger>}
                {sees.documents && <TabsTrigger value="documents">Documents</TabsTrigger>}
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className={cn("grid gap-2", student.total_paid != null ? "grid-cols-3" : "grid-cols-2")}>
                  {student.total_paid != null && (
                    <Stat label="Total paid" value={formatNPR(Number(student.total_paid))} />
                  )}
                  <Stat label="Enrollments" value={student.enrollment_count ?? 0} />
                  <Stat label="Documents" value={student.document_count ?? 0} />
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-xl border p-3">
                  <Field label="Email" value={student.email} />
                  <Field label="Secondary phone" value={student.secondary_phone} />
                  <Field label="Date of birth" value={student.date_of_birth ? formatDate(student.date_of_birth) : null} />
                  <Field label="Gender" value={student.gender} />
                  <Field label="Address" value={[student.address, student.city, student.state].filter(Boolean).join(", ")} />
                  <Field label="Enrolled" value={student.enrolled_at ? formatDate(student.enrolled_at) : null} />
                  <Field
                    label="Guardian"
                    value={
                      student.guardian_name
                        ? `${student.guardian_name}${student.guardian_relation ? ` (${student.guardian_relation})` : ""}${student.guardian_phone ? ` · ${student.guardian_phone}` : ""}`
                        : null
                    }
                  />
                  <Field
                    label="Emergency contact"
                    value={
                      student.emergency_contact_name
                        ? `${student.emergency_contact_name}${student.emergency_contact_phone ? ` · ${student.emergency_contact_phone}` : ""}`
                        : null
                    }
                  />
                  <Field label="Source" value={student.source_name} />
                  <Field label="Counselor" value={student.assigned_counselor_name} />
                </div>

                {student.notes && (
                  <p className="text-muted-foreground rounded-xl border p-3 text-sm">{student.notes}</p>
                )}

                {sees.teams && <TeamsAccounts studentId={student.id} />}

                <BranchMoves studentId={student.id} />

                {sees.payments && (
                <div>
                  <p className="mb-1 text-sm font-semibold">Recent payments</p>
                  {student.recent_payments?.length ? (
                    <ul className="divide-border divide-y">
                      {student.recent_payments.map((p, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{formatNPR(Number(p.amount))}</p>
                            <p className="text-muted-foreground truncate text-xs">
                              {formatDateTime(p.payment_date)} · {p.payment_method.replace(/_/g, " ")}
                              {p.course ? ` · ${p.course}` : ""}
                              {p.transaction_reference ? ` · ${p.transaction_reference}` : ""}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                              p.status === "successful"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {p.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground py-4 text-sm">No payments recorded yet.</p>
                  )}
                </div>
                )}
              </TabsContent>

              {sees.invoices && (
                <TabsContent value="invoices">
                  <InvoicesTab studentId={student.id} />
                </TabsContent>
              )}

              {sees.attendance && (
                <TabsContent value="attendance">
                  <AttendanceTab studentId={student.id} />
                </TabsContent>
              )}

              {sees.documents && (
                <TabsContent value="documents">
                  <DocumentsTab studentId={student.id} />
                </TabsContent>
              )}
            </Tabs>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
