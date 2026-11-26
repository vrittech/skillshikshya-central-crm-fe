import {
  Ban,
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  Coins,
  FileText,
  MoreHorizontal,
  PencilLine,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useChangeEnrollmentStatus,
  useEnrollmentHistory,
  useEnrollmentPayments,
  useEnrollmentStatusAction,
  useLeadEnrollments,
  useLeadPayments,
  useMakeFeeInvoice,
} from "@/hooks/use-leads";
import { daysText, dueSummary } from "@/lib/due-dates";
import { changeText } from "@/lib/history-format";
import { formatDate, formatDateTime, formatNPR } from "@/lib/leads-format";
import { canSit, enrolledBatchIfDifferent, seatText } from "@/lib/seats";
import { cn } from "@/lib/utils";
import type {
  ApiEnrollment,
  ApiEnrollmentStatus,
  ApiPayment,
  ApiPaymentStatus,
  ApiSeatAction,
} from "@/types/leads-api";
import { AdjustmentDialog } from "./adjustment-dialog";
import { ChangeDueDatesDialog, DueDatesList, ReminderList } from "./due-dates";
import { ConfirmEnrollmentDialog, EnrollmentDialog, PaymentDialog } from "./enrollment-dialogs";
import { PaymentActions } from "./payment-actions";
import { SeatDialog, SeatHistoryList, SeatMenuItems } from "./seat-actions";
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

/** Statuses Change status can set. Confirm, Cancel and Reinstate are their own actions. */
const STATUS_CHOICES: ApiEnrollmentStatus[] = [
  "confirmed",
  "active",
  "completed",
  "dropped_out",
  "transferred",
];

function ChangeStatusDialog({
  leadId,
  enrollment,
  open,
  onClose,
}: {
  leadId: number;
  enrollment: ApiEnrollment;
  open: boolean;
  onClose: () => void;
}) {
  const change = useChangeEnrollmentStatus(leadId);
  const [status, setStatus] = useState<ApiEnrollmentStatus | "">("");

  useEffect(() => {
    if (open) setStatus("");
  }, [open]);

  return (
    <ReasonDialog
      open={open}
      onClose={onClose}
      title="Change status"
      description={enrollment.course_name ?? undefined}
      confirmLabel="Change status"
      destructive={status === "dropped_out"}
      pending={change.isPending}
      confirmDisabled={!status}
      onConfirm={(reason) =>
        status &&
        change.mutate({ id: enrollment.id, status, reason }, { onSuccess: onClose })
      }
    >
      <div className="grid gap-2">
        <Label required>Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as ApiEnrollmentStatus)}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_CHOICES.filter((s) => s !== enrollment.status).map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {label(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ReasonDialog>
  );
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

type Section = "fee" | "payments" | "due" | "reminders" | "seats" | "history";

const SECTION_LABEL: Record<Section, string> = {
  fee: "Fee details",
  payments: "Payments",
  due: "Due dates",
  reminders: "Reminders",
  seats: "Batch history",
  history: "History",
};

function Stat({ label: l, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <p className="text-muted-foreground truncate text-xs">{l}</p>
      <p className={cn("mt-0.5 truncate text-base font-semibold tabular-nums", tone)}>{value}</p>
    </div>
  );
}

/** A section that opens and closes, with a short summary on the right. */
function SectionRow({
  title,
  summary,
  summaryTone,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string | null;
  summaryTone?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-t">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="hover:bg-muted/40 flex w-full items-center gap-2 px-4 py-3 text-left transition-colors"
      >
        <ChevronRight
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
        <span className="text-sm font-medium">{title}</span>
        {summary && (
          <span
            className={cn("text-muted-foreground ml-auto min-w-0 truncate text-xs", summaryTone)}
          >
            {summary}
          </span>
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/**
 * One enrollment: what is owed and paid up top, everything else in sections
 * that open on click. On its own page (`page`) every section starts open.
 */
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
  const sections: Section[] = [
    "fee",
    "payments",
    ...(canSit(enrollment) ? (["due", "reminders"] as const) : []),
    ...(canSit(enrollment) || !!enrollment.placements?.length ? (["seats"] as const) : []),
    "history",
  ];
  const [openSections, setOpenSections] = useState<Section[]>(page ? sections : []);
  const isOpen = (s: Section) => openSections.includes(s);
  const toggle = (s: Section) =>
    setOpenSections((open) => (open.includes(s) ? open.filter((x) => x !== s) : [...open, s]));
  const [dueOpen, setDueOpen] = useState(false);
  const feeInvoice = useMakeFeeInvoice(leadId);
  const [seatAction, setSeatAction] = useState<ApiSeatAction | null>(null);
  const [statusAction, setStatusAction] = useState<"cancel" | "reinstate" | null>(null);
  const statusMutation = useEnrollmentStatusAction(leadId);
  const [changeStatusOpen, setChangeStatusOpen] = useState(false);
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
  const canInvoice = leadId != null && canSit(enrollment) && enrollment.has_fee_invoice === false;

  const summaries: Partial<Record<Section, string | null>> = {
    fee: `Agreed ${formatNPR(agreed)}`,
    due:
      lateAmount > 0
        ? `Late ${formatNPR(lateAmount)}`
        : next?.due_on
          ? `Next ${formatDate(next.due_on)}`
          : dueRows.length
            ? "All paid"
            : null,
    seats: seatText(enrollment),
  };

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {page ? (
                <p className="font-headline text-lg font-semibold">
                  {enrollment.course_name ?? "Course"}
                </p>
              ) : (
                <Link
                  to={`/enrollments/${enrollment.id}`}
                  className="font-headline text-lg font-semibold hover:underline"
                >
                  {enrollment.course_name ?? "Course"}
                </Link>
              )}
              <StatusPill status={enrollment.status} />
              {enrollment.is_full_paid && <Badge variant="brand">Fully paid</Badge>}
            </div>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {seatText(enrollment)} · Enrolled{" "}
              {formatDate(enrollment.enrollment_date ?? undefined)}
              {enrollment.branch_name ? ` · ${enrollment.branch_name}` : ""}
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              {isPending && leadId != null && (
                <Button size="sm" variant="brand" onClick={() => setConfirmOpen(true)}>
                  <BadgeCheck /> Confirm
                </Button>
              )}
              {!isCancelled && (
                <Button size="sm" variant="outline" onClick={() => setPayOpen(true)}>
                  <Receipt /> Add Payment
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="size-8" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {leadId != null && canSit(enrollment) && (
                    <>
                      <SeatMenuItems enrollment={enrollment} onAction={setSeatAction} />
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {isCancelled && (
                    <DropdownMenuItem onSelect={() => setPayOpen(true)}>
                      <Receipt /> Add Payment
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => setAdjustOpen(true)}>
                    <Coins /> Money entry
                  </DropdownMenuItem>
                  {canInvoice && (
                    <DropdownMenuItem
                      disabled={feeInvoice.isPending}
                      onSelect={() => feeInvoice.mutate(enrollment.id)}
                    >
                      <FileText /> Create fee invoice
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={onEdit}>
                    <PencilLine /> Edit
                  </DropdownMenuItem>
                  {leadId != null && !isCancelled && !isPending && (
                    <DropdownMenuItem onSelect={() => setChangeStatusOpen(true)}>
                      <RefreshCw /> Change status
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {isCancelled ? (
                    <DropdownMenuItem onSelect={() => setStatusAction("reinstate")}>
                      <RotateCcw /> Reinstate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setStatusAction("cancel")}
                    >
                      <Ban /> Cancel enrollment
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x rounded-xl border">
          <Stat label="Total fee" value={formatNPR(due)} />
          <Stat label="Paid" value={formatNPR(netPaid)} />
          <Stat
            label={remaining < 0 ? "Credit" : "Remaining"}
            value={formatNPR(Math.abs(remaining))}
            tone={lateAmount > 0 ? "text-destructive" : undefined}
          />
        </div>

        <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
          <div
            className={cn("h-full rounded-full", remaining <= 0 ? "bg-emerald-500" : "bg-brand")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-muted-foreground mt-1.5 text-xs">
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
      </div>

      {sections.map((s) => (
        <SectionRow
          key={s}
          title={SECTION_LABEL[s]}
          summary={summaries[s]}
          summaryTone={s === "due" && lateAmount > 0 ? "text-destructive" : undefined}
          open={isOpen(s)}
          onToggle={() => toggle(s)}
        >
          {s === "fee" && (
            <>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <div>
                  <Fee label="Listed fee" value={formatNPR(Number(enrollment.listed_fee))} />
                  <Fee
                    label="Standard discount"
                    value={formatNPR(Number(enrollment.standard_discount))}
                  />
                  <Fee
                    label="Additional discount"
                    value={formatNPR(Number(enrollment.additional_discount))}
                  />
                  <Fee label="Agreed amount" value={formatNPR(agreed)} strong />
                </div>
                <div>
                  {extras > 0 && <Fee label="Extra charges" value={`+ ${formatNPR(extras)}`} />}
                  {discounts > 0 && (
                    <Fee label="Later discounts" value={`− ${formatNPR(discounts)}`} />
                  )}
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
              {enrollment.remarks && (
                <p className="text-muted-foreground mt-3 text-sm">{enrollment.remarks}</p>
              )}
            </>
          )}
          {s === "payments" && (
            <EnrollmentPayments leadId={leadId} enrollment={enrollment} canManage={canManage} />
          )}
          {s === "due" && (
            <>
              <DueDatesList rows={dueRows} />
              {canManage && leadId != null && (
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setDueOpen(true)}>
                    <CalendarClock /> Change due dates
                  </Button>
                </div>
              )}
            </>
          )}
          {s === "reminders" && <ReminderList leadId={leadId} enrollmentId={enrollment.id} />}
          {s === "seats" && <SeatHistoryList enrollment={enrollment} />}
          {s === "history" && <EnrollmentHistoryList leadId={leadId} enrollment={enrollment} />}
        </SectionRow>
      ))}

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

      <ConfirmEnrollmentDialog
        leadId={leadId}
        enrollment={confirmOpen ? enrollment : null}
        onClose={() => setConfirmOpen(false)}
      />

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

      {leadId != null && (
        <ChangeStatusDialog
          leadId={leadId}
          enrollment={enrollment}
          open={changeStatusOpen}
          onClose={() => setChangeStatusOpen(false)}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------- the panel */

const GROUPS: { title: string; statuses: ApiEnrollmentStatus[] }[] = [
  { title: "Pending", statuses: ["pending"] },
  { title: "Confirmed", statuses: ["confirmed", "active", "completed"] },
  { title: "Closed", statuses: ["cancelled", "dropped_out", "transferred"] },
];

/** The money line in the list: what is agreed, what is left, or why it closed. */
function listMoney(e: ApiEnrollment) {
  const netPaid = Number(e.total_paid) - Number(e.refunds_total ?? 0);
  const remaining = Number(e.remaining_amount);
  if (e.status === "pending") {
    const agreed = formatNPR(Number(e.agreed_amount));
    return netPaid > 0 ? `${agreed} · ${formatNPR(netPaid)} paid` : agreed;
  }
  if (!canSit(e)) return label(e.status);
  if (remaining > 0) return `${formatNPR(remaining)} left`;
  if (remaining < 0) return `${formatNPR(-remaining)} credit`;
  return "Fully paid";
}

function listBatch(e: ApiEnrollment) {
  if (canSit(e) && e.seat_state === "paused") return "Paused";
  return (canSit(e) ? e.current_batch_name : e.batch_name) || "No batch";
}

function EnrollmentListItem({
  enrollment: e,
  selected,
  onSelect,
}: {
  enrollment: ApiEnrollment;
  selected: boolean;
  onSelect: () => void;
}) {
  const late = canSit(e) && dueSummary(e.due_dates ?? []).lateAmount > 0;
  const extraStatus = e.status === "active" || e.status === "completed";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-brand/40 bg-brand/5 ring-brand/20 ring-1"
          : "hover:bg-muted/50 border-transparent",
      )}
    >
      <p className="truncate text-sm font-medium">{e.course_name ?? "Course"}</p>
      <p className="text-muted-foreground truncate text-xs">
        {listBatch(e)} · {formatDate(e.enrollment_date ?? undefined)}
        {extraStatus ? ` · ${label(e.status)}` : ""}
      </p>
      <p
        className={cn(
          "mt-1 text-xs font-medium",
          late ? "text-destructive" : "text-foreground/80",
          !canSit(e) && e.status !== "pending" && "text-muted-foreground capitalize",
        )}
      >
        {listMoney(e)}
      </p>
    </button>
  );
}

/**
 * Enrollment tab (live path): the lead's enrollments on the left, grouped by
 * status, and the one picked on the right. The pick is kept in the URL.
 */
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ApiEnrollment | null>(null);
  // The ids before "New Enrollment", so the new one can be picked once it shows up.
  const [idsBefore, setIdsBefore] = useState<number[] | null>(null);

  const pickedId = Number(searchParams.get("enrollment"));
  const selected =
    enrollments.find((e) => e.id === pickedId) ??
    enrollments.find((e) => e.status === "pending") ??
    enrollments.find((e) => canSit(e)) ??
    enrollments[0];

  const select = (id: number) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "enrollment");
        next.set("enrollment", String(id));
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    if (!idsBefore) return;
    const added = enrollments.find((e) => !idsBefore.includes(e.id));
    if (!added) return;
    setIdsBefore(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "enrollment");
        next.set("enrollment", String(added.id));
        return next;
      },
      { replace: true },
    );
  }, [enrollments, idsBefore, setSearchParams]);

  const startCreate = () => {
    setIdsBefore(enrollments.map((e) => e.id));
    setCreateOpen(true);
  };

  if (isLoading) {
    return (
      <div className="@container">
        <div className="grid gap-4 @3xl:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="@container">
      {enrollments.length > 0 && selected ? (
        <div className="grid items-start gap-4 @3xl:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Enrollments{" "}
                <span className="text-muted-foreground font-normal">{enrollments.length}</span>
              </p>
              {canManage && (
                <Button size="sm" variant="outline" onClick={startCreate}>
                  <Plus /> New Enrollment
                </Button>
              )}
            </div>
            {GROUPS.map((g) => {
              const rows = enrollments.filter((e) => g.statuses.includes(e.status));
              if (!rows.length) return null;
              return (
                <div key={g.title} className="space-y-1">
                  <p className="text-muted-foreground px-1 text-xs font-medium">
                    {g.title} · {rows.length}
                  </p>
                  {rows.map((e) => (
                    <EnrollmentListItem
                      key={e.id}
                      enrollment={e}
                      selected={e.id === selected.id}
                      onSelect={() => select(e.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
          <EnrollmentCard
            key={selected.id}
            leadId={leadId}
            enrollment={selected}
            canManage={canManage}
            onEdit={() => setEditing(selected)}
          />
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-muted-foreground text-sm">This lead is not enrolled yet.</p>
          {canManage && (
            <Button size="sm" variant="outline" className="mt-3" onClick={startCreate}>
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
