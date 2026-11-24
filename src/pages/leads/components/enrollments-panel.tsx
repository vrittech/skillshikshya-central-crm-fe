import {
  Ban,
  BadgeCheck,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Coins,
  FileText,
  PencilLine,
  Plus,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ReasonDialog } from "@/components/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useConfirmEnrollment,
  useEnrollmentHistory,
  useEnrollmentPayments,
  useEnrollmentStatusAction,
  useLeadEnrollments,
  useLeadPayments,
  useMakeFeeInvoice,
} from "@/hooks/use-leads";
import { daysText, dueSummary, partsAreValid, splitEvenly } from "@/lib/due-dates";
import { formatDate, formatDateTime, formatNPR } from "@/lib/leads-format";
import { canSit, enrolledBatchIfDifferent, localToday, seatText } from "@/lib/seats";
import { cn } from "@/lib/utils";
import type {
  ApiDuePart,
  ApiEnrollment,
  ApiEnrollmentStatus,
  ApiPayment,
  ApiPaymentStatus,
  ApiSeatAction,
} from "@/types/leads-api";
import { AdjustmentDialog } from "./adjustment-dialog";
import { ChangeDueDatesDialog, DueDatesList, DuePartsEditor, ReminderList } from "./due-dates";
import { EnrollmentDialog, PaymentDialog } from "./enrollment-dialogs";
import { PaymentActions } from "./payment-actions";
import { SeatButtons, SeatDialog, SeatHistoryList } from "./seat-actions";
import { TeamsLicenceLine } from "./teams-licence";

/* ------------------------------------------------------------ status tones */

const ENROLLMENT_TONE: Record<ApiEnrollmentStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  confirmed: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed: "bg-brand-fixed-dim/25 text-brand-container",
  cancelled: "bg-muted text-muted-foreground",
  dropped_out: "bg-destructive/10 text-destructive",
  transferred: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

const PAYMENT_TONE: Record<ApiPaymentStatus, string> = {
  successful: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  voided: "bg-muted text-muted-foreground",
};

function label(s: string) {
  return s.replace(/_/g, " ");
}

function StatusPill({ status }: { status: ApiEnrollmentStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium capitalize",
        ENROLLMENT_TONE[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {label(status)}
    </span>
  );
}

function PaymentPill({ status }: { status: ApiPaymentStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        PAYMENT_TONE[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

/** Why and by whom a payment was voided. */
function VoidNote({ payment: p }: { payment: ApiPayment }) {
  if (p.status !== "voided" || !p.void_reason) return null;
  return (
    <p className="text-muted-foreground mt-0.5 text-xs">
      Voided{p.voided_by_name ? ` by ${p.voided_by_name}` : ""}
      {p.voided_at ? ` on ${formatDateTime(p.voided_at)}` : ""}: “{p.void_reason}”
    </p>
  );
}

function Fee({ label: l, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed py-1.5 last:border-0">
      <span className="text-muted-foreground text-xs">{l}</span>
      <span className={cn("text-sm", strong ? "font-semibold" : "font-medium")}>{value}</span>
    </div>
  );
}

/* ------------------------------------------- payments nested in enrollment */

function EnrollmentPayments({
  leadId,
  enrollment,
  canManage,
}: {
  leadId?: number;
  enrollment: ApiEnrollment;
  canManage: boolean;
}) {
  const { payments, isLoading } = useEnrollmentPayments(leadId, enrollment.id);

  if (isLoading) return <Skeleton className="h-16 w-full rounded-xl" />;
  if (!payments.length)
    return <p className="text-muted-foreground py-3 text-sm">No payments recorded yet.</p>;

  return (
    <ul className="divide-border divide-y">
      {payments.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className={cn("text-sm font-medium", p.status === "voided" && "line-through")}>
              {formatNPR(Number(p.amount))}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {formatDateTime(p.payment_date)} · {label(p.payment_method)} ·{" "}
              {p.transaction_reference || "no ref"}
              {p.received_by_name ? ` · by ${p.received_by_name}` : ""}
            </p>
            {p.notes && <p className="text-muted-foreground mt-0.5 text-xs italic">{p.notes}</p>}
            <VoidNote payment={p} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <PaymentPill status={p.status} />
            {canManage && leadId != null && (
              <PaymentActions
                leadId={leadId}
                enrollmentId={enrollment.id}
                paymentId={p.id}
                status={p.status}
                amount={Number(p.amount)}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------- reason trail of enrollment */

/** "status: active → cancelled · amount: 10000.00" — unchanged values are shown once. */
function changeText(before: Record<string, unknown>, after: Record<string, unknown>) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  const show = (v: unknown) => {
    if (Array.isArray(v)) {
      if (!v.length) return "—";
      return (v as ApiDuePart[])
        .map((p) => `${formatDate(p.due_on)} ${formatNPR(Number(p.amount))}`)
        .join(", ");
    }
    if (v == null || v === "") return "—";
    // An email (Teams account) is shown as it is.
    return String(v).includes("@") ? String(v) : label(String(v));
  };
  const name = (k: string) => label(k).replace(/^./, (c) => c.toUpperCase());
  return keys
    .map((k) =>
      show(before?.[k]) === show(after?.[k])
        ? `${name(k)}: ${show(after?.[k])}`
        : `${name(k)}: ${show(before?.[k])} → ${show(after?.[k])}`,
    )
    .join(" · ");
}

function EnrollmentHistoryList({ leadId, enrollment }: { leadId?: number; enrollment: ApiEnrollment }) {
  const { history, isLoading } = useEnrollmentHistory(leadId, enrollment.id);

  if (isLoading) return <Skeleton className="h-16 w-full rounded-xl" />;
  if (!history.length)
    return <p className="text-muted-foreground py-3 text-sm">No changes recorded yet.</p>;

  return (
    <ul className="divide-border divide-y">
      {history.map((h) => (
        <li key={h.id} className="py-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">{h.action_display}</p>
            <p className="text-muted-foreground text-xs">
              {formatDateTime(h.created_at)}
              {h.performed_by_name ? ` · by ${h.performed_by_name}` : ""}
            </p>
          </div>
          <p className="mt-0.5 text-sm">“{h.reason}”</p>
          {(Object.keys(h.before ?? {}).length > 0 || Object.keys(h.after ?? {}).length > 0) && (
            <p
              className={cn(
                "text-muted-foreground mt-0.5 text-xs",
                // A Teams account is an email: keep its case.
                !("teams_account" in (h.after ?? {})) && "capitalize",
              )}
            >
              {changeText(h.before, h.after)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------- enrollment card */

/** One enrollment with its money, sections and actions. On its own page (`page`) every section starts open. */
export function EnrollmentCard({
  leadId,
  enrollment,
  canManage,
  onEdit,
  page = false,
}: {
  leadId?: number;
  enrollment: ApiEnrollment;
  canManage: boolean;
  onEdit: () => void;
  page?: boolean;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const [showPayments, setShowPayments] = useState(page);
  const [showHistory, setShowHistory] = useState(page);
  const [showSeats, setShowSeats] = useState(page);
  const [showDue, setShowDue] = useState(page);
  const [showReminders, setShowReminders] = useState(page);
  const [dueOpen, setDueOpen] = useState(false);
  const [confirmParts, setConfirmParts] = useState<ApiDuePart[]>([]);
  const feeInvoice = useMakeFeeInvoice(leadId);
  const [seatAction, setSeatAction] = useState<ApiSeatAction | null>(null);
  const [statusAction, setStatusAction] = useState<"cancel" | "reinstate" | null>(null);
  const statusMutation = useEnrollmentStatusAction(leadId);
  const confirm = useConfirmEnrollment();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isCancelled = enrollment.status === "cancelled";
  const isPending = enrollment.status === "pending";
  const [adjustOpen, setAdjustOpen] = useState(false);
  const agreed = Number(enrollment.agreed_amount);
  const paid = Number(enrollment.total_paid);
  const extras = Number(enrollment.extra_charges_total ?? 0);
  const discounts = Number(enrollment.discounts_total ?? 0);
  const writeOffs = Number(enrollment.write_offs_total ?? 0);
  const refunds = Number(enrollment.refunds_total ?? 0);
  const remaining = Number(enrollment.remaining_amount);
  // What the student must pay in the end, and what they have paid net of refunds.
  const due = agreed + extras - discounts - writeOffs;
  const netPaid = paid - refunds;
  const pct = due > 0 ? Math.max(0, Math.min(100, Math.round((netPaid / due) * 100))) : 100;
  const enrolledBatch = enrolledBatchIfDifferent(enrollment);
  const dueRows = enrollment.due_dates ?? [];
  const { lateAmount, daysLate, next } = dueSummary(dueRows);

  useEffect(() => {
    if (confirmOpen) setConfirmParts(splitEvenly(agreed, 1, localToday()));
  }, [confirmOpen, agreed]);

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {page ? (
            <p className="font-headline text-lg font-semibold">{enrollment.course_name ?? "Course"}</p>
          ) : (
            <Link
              to={`/enrollments/${enrollment.id}`}
              className="font-headline text-lg font-semibold hover:underline"
            >
              {enrollment.course_name ?? "Course"}
            </Link>
          )}
          <p className="text-muted-foreground text-sm">
            {seatText(enrollment)} · Enrolled {formatDate(enrollment.enrollment_date ?? undefined)}
            {enrollment.branch_name ? ` · ${enrollment.branch_name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={enrollment.status} />
          {enrollment.is_full_paid && <Badge variant="brand">Fully paid</Badge>}
        </div>
      </div>

      <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
        <div>
          <Fee label="Listed fee" value={formatNPR(Number(enrollment.listed_fee))} />
          <Fee label="Standard discount" value={formatNPR(Number(enrollment.standard_discount))} />
          <Fee
            label="Additional discount"
            value={formatNPR(Number(enrollment.additional_discount))}
          />
          <Fee label="Agreed amount" value={formatNPR(agreed)} strong />
        </div>
        <div>
          {extras > 0 && <Fee label="Extra charges" value={`+ ${formatNPR(extras)}`} />}
          {discounts > 0 && <Fee label="Later discounts" value={`− ${formatNPR(discounts)}`} />}
          {writeOffs > 0 && <Fee label="Written off" value={`− ${formatNPR(writeOffs)}`} />}
          <Fee label="Paid" value={formatNPR(paid)} />
          {refunds > 0 && <Fee label="Refunded" value={`+ ${formatNPR(refunds)}`} />}
          <Fee
            label={remaining < 0 ? "Credit" : "Remaining"}
            value={formatNPR(Math.abs(remaining))}
            strong
          />
          {enrolledBatch && <Fee label="Enrolled batch" value={enrolledBatch} />}
          {enrollment.student_name && <Fee label="Student" value={enrollment.student_name} />}
          {enrollment.created_by_name && (
            <Fee label="Created by" value={enrollment.created_by_name} />
          )}
        </div>
      </div>

      <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full", remaining <= 0 ? "bg-emerald-500" : "bg-brand")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        {pct}% collected
        {lateAmount > 0 ? (
          <span className="text-destructive">
            {" "}
            · Late {formatNPR(lateAmount)} · {daysText(daysLate)}
          </span>
        ) : next?.due_on ? (
          ` · Next due ${formatDate(next.due_on)}: ${formatNPR(Number(next.left))}`
        ) : (
          ""
        )}
      </p>

      {leadId != null && <TeamsLicenceLine enrollment={enrollment} canManage={canManage} />}

      {enrollment.remarks && (
        <p className="text-muted-foreground mt-3 text-sm">{enrollment.remarks}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground -ml-2"
          onClick={() => setShowPayments((v) => !v)}
        >
          {showPayments ? <ChevronDown /> : <ChevronRight />} Payments
        </Button>
        {canSit(enrollment) && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setShowDue((v) => !v)}
          >
            {showDue ? <ChevronDown /> : <ChevronRight />} Due dates
          </Button>
        )}
        {canSit(enrollment) && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setShowReminders((v) => !v)}
          >
            {showReminders ? <ChevronDown /> : <ChevronRight />} Reminders
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => setShowHistory((v) => !v)}
        >
          {showHistory ? <ChevronDown /> : <ChevronRight />} History
        </Button>
        {(canSit(enrollment) || !!enrollment.placements?.length) && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setShowSeats((v) => !v)}
          >
            {showSeats ? <ChevronDown /> : <ChevronRight />} Batch history
          </Button>
        )}
        <div className="grow" />
        {canManage && (
          <>
            {isPending && leadId != null && (
              <Button size="sm" variant="brand" onClick={() => setConfirmOpen(true)}>
                <BadgeCheck /> Confirm
              </Button>
            )}
            {leadId != null && <SeatButtons enrollment={enrollment} onAction={setSeatAction} />}
            <Button size="sm" variant="outline" onClick={() => setPayOpen(true)}>
              <Receipt /> Add Payment
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdjustOpen(true)}>
              <Coins /> Money entry
            </Button>
            {leadId != null && canSit(enrollment) && enrollment.has_fee_invoice === false && (
              <Button
                size="sm"
                variant="outline"
                disabled={feeInvoice.isPending}
                onClick={() => feeInvoice.mutate(enrollment.id)}
              >
                <FileText /> Create fee invoice
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onEdit}>
              <PencilLine /> Edit
            </Button>
            {isCancelled ? (
              <Button size="sm" variant="outline" onClick={() => setStatusAction("reinstate")}>
                <RotateCcw /> Reinstate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => setStatusAction("cancel")}
              >
                <Ban /> Cancel
              </Button>
            )}
          </>
        )}
      </div>

      {showPayments && (
        <div className="mt-1 border-t pt-2">
          <EnrollmentPayments leadId={leadId} enrollment={enrollment} canManage={canManage} />
        </div>
      )}

      {showDue && (
        <div className="mt-1 border-t pt-2">
          <DueDatesList rows={dueRows} />
          {canManage && leadId != null && (
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setDueOpen(true)}>
                <CalendarClock /> Change due dates
              </Button>
            </div>
          )}
        </div>
      )}

      {showReminders && (
        <div className="mt-1 border-t pt-2">
          <ReminderList leadId={leadId} enrollmentId={enrollment.id} />
        </div>
      )}

      {showHistory && (
        <div className="mt-1 border-t pt-2">
          <EnrollmentHistoryList leadId={leadId} enrollment={enrollment} />
        </div>
      )}

      {showSeats && (
        <div className="mt-1 border-t pt-2">
          <SeatHistoryList enrollment={enrollment} />
        </div>
      )}

      <SeatDialog
        leadId={leadId}
        enrollment={enrollment}
        action={seatAction}
        onClose={() => setSeatAction(null)}
      />

      <PaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        leadId={leadId}
        enrollmentApiId={enrollment.id}
      />

      <ChangeDueDatesDialog
        leadId={leadId}
        enrollment={enrollment}
        open={dueOpen}
        onClose={() => setDueOpen(false)}
      />

      <AdjustmentDialog
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        leadId={leadId}
        enrollment={enrollment}
      />

      <Dialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm enrollment</DialogTitle>
            <DialogDescription>
              {[enrollment.lead_name, enrollment.course_name, enrollment.batch_name, formatNPR(agreed)]
                .filter(Boolean)
                .join(" · ")}
            </DialogDescription>
          </DialogHeader>
          {agreed > 0 && (
            <div className="py-2">
              <DuePartsEditor total={agreed} parts={confirmParts} onChange={setConfirmParts} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Back
            </Button>
            <Button
              variant="brand"
              disabled={confirm.isPending || (agreed > 0 && !partsAreValid(confirmParts, agreed))}
              onClick={() =>
                leadId != null &&
                confirm.mutate(
                  { leadId, id: enrollment.id, dueDates: agreed > 0 ? confirmParts : undefined },
                  { onSuccess: () => setConfirmOpen(false) },
                )
              }
            >
              {confirm.isPending ? "Confirming…" : "Confirm enrollment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={statusAction != null}
        onClose={() => setStatusAction(null)}
        title={statusAction === "reinstate" ? "Reinstate enrollment" : "Cancel enrollment"}
        confirmLabel={statusAction === "reinstate" ? "Reinstate" : "Cancel enrollment"}
        destructive={statusAction === "cancel"}
        pending={statusMutation.isPending}
        onConfirm={(reason) =>
          statusAction &&
          statusMutation.mutate(
            { id: enrollment.id, action: statusAction, reason },
            { onSuccess: () => setStatusAction(null) },
          )
        }
      />
    </div>
  );
}

/* --------------------------------------------------------------- the panel */

/** Enrollment tab (live path) — every enrollment of the lead. Money records can't be deleted. */
export function EnrollmentsPanel({
  leadId,
  primaryCourseId,
  canManage,
}: {
  leadId?: number;
  primaryCourseId?: number | null;
  canManage: boolean;
}) {
  const { enrollments, isLoading } = useLeadEnrollments(leadId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ApiEnrollment | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {enrollments.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-sm">
              {enrollments.length} enrollment{enrollments.length > 1 ? "s" : ""}
            </p>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                <Plus /> New Enrollment
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {enrollments.map((e) => (
              <EnrollmentCard
                key={e.id}
                leadId={leadId}
                enrollment={e}
                canManage={canManage}
                onEdit={() => setEditing(e)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="py-8 text-center">
          <p className="text-muted-foreground text-sm">This lead is not enrolled yet.</p>
          {canManage && (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setCreateOpen(true)}>
              <Plus /> Create Enrollment
            </Button>
          )}
        </div>
      )}

      <EnrollmentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        leadId={leadId}
        primaryCourseId={primaryCourseId}
      />
      <EnrollmentDialog
        open={editing != null}
        onClose={() => setEditing(null)}
        leadId={leadId}
        enrollment={editing}
      />
    </div>
  );
}

/** Payments tab (live path) — every payment of the lead across its enrollments. */
export function LeadPaymentsPanel({
  leadId,
  canManage,
}: {
  leadId?: number;
  canManage?: boolean;
}) {
  const { rows, isLoading } = useLeadPayments(leadId);
  const { enrollments } = useLeadEnrollments(leadId);
  const [payOpen, setPayOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [targetEnrollment, setTargetEnrollment] = useState<ApiEnrollment | null>(null);

  if (isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if (!rows.length)
    return <p className="text-muted-foreground py-8 text-center text-sm">No payments recorded.</p>;

  const collected = rows
    .filter((r) => r.payment.status === "successful")
    .reduce((s, r) => s + Number(r.payment.amount), 0);

  function startRecord() {
    if (!leadId) return;
    if (enrollments.length === 0) {
      toast.error("Create an enrollment first — payments are recorded against one.");
      return;
    }
    if (enrollments.length === 1) {
      setTargetEnrollment(enrollments[0]);
      setPayOpen(true);
      return;
    }
    setPickOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {rows.length} payment{rows.length > 1 ? "s" : ""} across {new Set(rows.map((r) => r.enrollment?.id)).size}{" "}
          enrollment{new Set(rows.map((r) => r.enrollment?.id)).size > 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold">{formatNPR(collected)} collected</p>
          {canManage && (
            <Button size="sm" variant="outline" onClick={startRecord}>
              <Receipt /> Record Payment
            </Button>
          )}
        </div>
      </div>
      <ul className="divide-border divide-y">
        {rows.map(({ payment: p, enrollment: e }) => (
          <li key={p.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", p.status === "voided" && "line-through")}>
                {formatNPR(Number(p.amount))}
                {e?.course_name && (
                  <span className="text-muted-foreground font-normal"> · {e.course_name}</span>
                )}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {formatDateTime(p.payment_date)} · {label(p.payment_method)} ·{" "}
                {p.transaction_reference || "no ref"}
                {p.received_by_name ? ` · by ${p.received_by_name}` : ""}
              </p>
              <VoidNote payment={p} />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <PaymentPill status={p.status} />
              {canManage && e && leadId != null && (
                <PaymentActions
                  leadId={leadId}
                  enrollmentId={e.id}
                  paymentId={p.id}
                  status={p.status}
                  amount={Number(p.amount)}
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={pickOpen} onOpenChange={(o) => !o && setPickOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose enrollment</DialogTitle>
            <DialogDescription>Payments are recorded against a specific enrollment.</DialogDescription>
          </DialogHeader>
          <Select
            value={targetEnrollment != null ? String(targetEnrollment.id) : undefined}
            onValueChange={(v) =>
              setTargetEnrollment(enrollments.find((e) => e.id === Number(v)) ?? null)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select enrollment" />
            </SelectTrigger>
            <SelectContent>
              {enrollments.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.course_name ?? "Course"}
                  {e.batch_name ? ` — ${e.batch_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              disabled={targetEnrollment == null}
              onClick={() => {
                setPickOpen(false);
                setPayOpen(true);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {targetEnrollment && (
        <PaymentDialog
          key={targetEnrollment.id}
          open={payOpen}
          onClose={() => {
            setPayOpen(false);
            setTargetEnrollment(null);
          }}
          leadId={leadId}
          enrollmentApiId={targetEnrollment.id}
        />
      )}
    </div>
  );
}
