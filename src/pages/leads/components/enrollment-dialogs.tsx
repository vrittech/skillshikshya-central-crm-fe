import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCourses } from "@/hooks/use-courses";
import { useCourseBatches } from "@/hooks/use-batches";
import { useLeadOptions } from "@/hooks/use-lead-options";
import {
  useAddEnrollment,
  useAddPayment,
  useConfirmEnrollment,
  useUpdateEnrollment,
  useLeadEnrollments,
} from "@/hooks/use-leads";
import type {
  ApiEnrollment,
  ApiEnrollmentPayload,
  ApiEnrollmentStatus,
  ApiPaymentMethod,
  ApiPaymentPayload,
  ApiPaymentStatus,
} from "@/types/leads-api";
import type { CourseBatch } from "@/types";
import { toNepalIso } from "@/lib/leads-format";

const ENR_STATUS: ApiEnrollmentStatus[] = [
  "pending",
  "confirmed",
  "active",
  "completed",
  "cancelled",
  "dropped_out",
  "transferred",
];
const PAY_METHODS: ApiPaymentMethod[] = ["cash", "esewa", "khalti", "bank_transfer", "card", "connectips"];
/** A new payment is pending or successful; Confirm and Void change it later. */
const PAY_STATUS: ApiPaymentStatus[] = ["successful", "pending"];

function num(a: string, b: string) {
  return String((Number(a || "0") - Number(b || "0") - 0).toFixed(2));
}

/** "12 seats left", "full" or "no seat limit" for the batch picker. */
function seatsLabel(b: CourseBatch) {
  if (b.capacity == null) return "no seat limit";
  if (!b.seats_left) return "full";
  return `${b.seats_left} ${b.seats_left === 1 ? "seat" : "seats"} left`;
}

export function EnrollmentDialog({
  open,
  onClose,
  leadId,
  primaryCourseId,
  enrollment,
  allowLeadPick = false,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  leadId?: number;
  primaryCourseId?: number | null;
  /** Pass an existing enrollment to edit it (PATCH) instead of creating one. */
  enrollment?: ApiEnrollment | null;
  /** Show an inline Lead picker (global create flow) when no `leadId` is preset. */
  allowLeadPick?: boolean;
  /** Fires with the created record — lets a caller select it straight away. */
  onCreated?: (created: ApiEnrollment) => void;
}) {
  const [f, setF] = useState<ApiEnrollmentPayload>({});
  const isEdit = !!enrollment;
  const wasCancelled = enrollment?.status === "cancelled";
  const wasPending = enrollment?.status === "pending";
  // The price can change until the enrollment is confirmed or something is paid.
  const priceLocked = isEdit && !(wasPending && Number(enrollment?.total_paid ?? 0) === 0);
  // Once confirmed, the course and the money batch are fixed.
  const seatLocked = isEdit && !wasPending;
  const needsLead = allowLeadPick && !isEdit;
  const [pickedLeadId, setPickedLeadId] = useState<string>("");
  const [leadSearch, setLeadSearch] = useState("");
  // The fee follows the course, and the agreed amount follows the fee, until
  // the user types their own value.
  const [listedEdited, setListedEdited] = useState(false);
  const [agreedEdited, setAgreedEdited] = useState(false);
  const effectiveLeadId = leadId ?? (pickedLeadId ? Number(pickedLeadId) : undefined);

  const leadOptionsQ = useLeadOptions(open && needsLead ? leadSearch : "");
  const coursesQ = useCourses(1, 100, "");
  const courses = useMemo(() => coursesQ.data?.results ?? [], [coursesQ.data]);
  // Closed batches take no one new, so they are not offered.
  const batchesQ = useCourseBatches(
    { course: f.course, page_size: 100, is_active: true, status: ["upcoming", "running"] },
    !!f.course,
  );
  const batches = useMemo(() => batchesQ.data?.results ?? [], [batchesQ.data]);
  const chosenBatch = batches.find((b) => b.id === f.batch);
  // The saved batch may be closed or inactive now; still show its name.
  const savedBatchMissing =
    enrollment?.batch != null && !batches.some((b) => b.id === enrollment.batch);
  const addEnrollment = useAddEnrollment(effectiveLeadId);
  const updateEnrollment = useUpdateEnrollment(leadId);
  const confirm = useConfirmEnrollment();
  const saving = addEnrollment.isPending || updateEnrollment.isPending || confirm.isPending;

  useEffect(() => {
    if (!open) return;
    setPickedLeadId("");
    setLeadSearch("");
    setListedEdited(!!enrollment);
    // On edit, the agreed amount keeps following the fee if it still equals fee minus discounts.
    const agreedFollowsFee =
      enrollment != null &&
      Number(enrollment.agreed_amount) ===
        Number(enrollment.listed_fee) -
          Number(enrollment.standard_discount) -
          Number(enrollment.additional_discount);
    setAgreedEdited(!!enrollment && !agreedFollowsFee);
    if (enrollment) {
      setF({
        course: enrollment.course,
        batch: enrollment.batch,
        student: enrollment.student,
        enrollment_date: enrollment.enrollment_date ?? new Date().toISOString().slice(0, 10),
        status: enrollment.status,
        listed_fee: enrollment.listed_fee,
        standard_discount: enrollment.standard_discount,
        additional_discount: enrollment.additional_discount,
        agreed_amount: enrollment.agreed_amount,
        remarks: enrollment.remarks ?? "",
      });
      return;
    }
    setF({
      course: primaryCourseId ?? undefined,
      batch: undefined,
      enrollment_date: new Date().toISOString().slice(0, 10),
      // A new enrollment is pending until it is confirmed (that makes the lead a student).
      status: "pending",
      listed_fee: "0",
      standard_discount: "0",
      additional_discount: "0",
      agreed_amount: "",
      remarks: "",
    });
  }, [open, primaryCourseId, enrollment]);

  // Fill the listed fee from the course price (also for a preselected course,
  // once the course list has loaded).
  useEffect(() => {
    if (!open || priceLocked || listedEdited || f.course == null) return;
    const course = courses.find((c) => c.id === f.course);
    if (course) setF((p) => ({ ...p, listed_fee: String(Number(course.full_amount || 0)) }));
  }, [open, priceLocked, listedEdited, f.course, courses]);

  const set = <K extends keyof ApiEnrollmentPayload>(k: K, v: ApiEnrollmentPayload[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  // Keep agreed = listed - standard - additional as a helpful default.
  const agreedAuto = num(num(f.listed_fee ?? "0", f.standard_discount ?? "0"), f.additional_discount ?? "0");

  function submit(confirmAfter = false) {
    if (needsLead && !effectiveLeadId) {
      toast.error("Pick a lead first.");
      return;
    }
    if (!f.course) return;
    const payload = { ...f, agreed_amount: agreedEdited && f.agreed_amount ? f.agreed_amount : agreedAuto };
    if (enrollment) {
      updateEnrollment.mutate({ id: enrollment.id, payload }, { onSuccess: () => onClose() });
      return;
    }
    addEnrollment.mutate(payload, {
      onSuccess: (created) => {
        onCreated?.(created);
        onClose();
        // "Save and confirm": the lead becomes a student right away.
        if (confirmAfter && effectiveLeadId != null) {
          confirm.mutate({ leadId: effectiveLeadId, id: created.id });
        }
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit enrollment" : "Create enrollment"}</DialogTitle>
          <DialogDescription>Record the lead, course, batch, and agreed fee.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          {needsLead && (
            <div className="grid gap-2 sm:col-span-2">
              <Label required>Lead</Label>
              <Combobox
                value={pickedLeadId}
                onChange={setPickedLeadId}
                onSearchChange={setLeadSearch}
                options={leadOptionsQ.options}
                loading={leadOptionsQ.isLoading && !!leadSearch}
                placeholder="Search leads by name or phone…"
                searchPlaceholder="Type to search…"
                emptyText="No leads match."
              />
            </div>
          )}
          <div className="grid gap-2 sm:col-span-2">
            <Label required>Course</Label>
            <Select
              disabled={seatLocked}
              value={f.course != null ? String(f.course) : undefined}
              onValueChange={(v) => {
                // A new course brings its own price, even after a typed fee.
                setListedEdited(false);
                setF((p) => ({
                  ...p,
                  course: Number(v),
                  batch: undefined,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Course Batch</Label>
            <Select
              value={f.batch != null ? String(f.batch) : undefined}
              onValueChange={(v) => {
                setF((p) => ({
                  ...p,
                  batch: Number(v),
                }));
              }}
              disabled={seatLocked || !f.course || batchesQ.isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={f.course ? "Select course batch" : "Select a course first"} />
              </SelectTrigger>
              <SelectContent>
                {savedBatchMissing && enrollment?.batch != null && (
                  <SelectItem value={String(enrollment.batch)}>
                    {enrollment.batch_name ?? `Batch #${enrollment.batch}`}
                  </SelectItem>
                )}
                {batches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.coursebatch_id} — {b.name} · {seatsLabel(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {seatLocked ? (
              <p className="text-muted-foreground text-xs">
                The course and batch are fixed once confirmed, because the fees count on this batch.
              </p>
            ) : (
              chosenBatch?.capacity != null &&
              chosenBatch.seats_left === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {chosenBatch.name} is full. Confirm is refused until a seat frees up or seats are
                  added.
                </p>
              )
            )}
          </div>
          <div className="grid gap-2">
            <Label>Enrollment date</Label>
            <Input type="date" value={f.enrollment_date ?? ""} onChange={(e) => set("enrollment_date", e.target.value)} />
          </div>
          {isEdit && (
            <div className="grid gap-2">
              <Label>Status</Label>
              {/* Confirm, cancel and reinstate are buttons on the card, not options here. */}
              <Select
                value={f.status ?? "pending"}
                onValueChange={(v) => set("status", v as ApiEnrollmentStatus)}
                disabled={wasCancelled || wasPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENR_STATUS.filter(
                    (s) => (wasCancelled || s !== "cancelled") && (wasPending || s !== "pending"),
                  ).map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {wasCancelled && (
                <p className="text-muted-foreground text-xs">Use Reinstate on the card to reopen it.</p>
              )}
              {wasPending && (
                <p className="text-muted-foreground text-xs">Use Confirm on the card when they join.</p>
              )}
            </div>
          )}
          {/* The price is fixed once confirmed or paid; later changes are money entries with a reason. */}
          <div className="grid gap-2">
            <Label>Listed fee</Label>
            <Input
              type="number"
              value={f.listed_fee ?? ""}
              disabled={priceLocked}
              onChange={(e) => {
                setListedEdited(true);
                set("listed_fee", e.target.value);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Standard discount</Label>
            <Input type="number" value={f.standard_discount ?? ""} disabled={priceLocked} onChange={(e) => set("standard_discount", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Additional discount</Label>
            <Input type="number" value={f.additional_discount ?? ""} disabled={priceLocked} onChange={(e) => set("additional_discount", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Agreed amount</Label>
            <Input
              type="number"
              value={agreedEdited ? (f.agreed_amount ?? "") : agreedAuto}
              disabled={priceLocked}
              onChange={(e) => {
                setAgreedEdited(true);
                set("agreed_amount", e.target.value);
              }}
            />
            {!priceLocked && !agreedEdited && (
              <p className="text-muted-foreground text-xs">Listed fee minus discounts.</p>
            )}
          </div>
          {priceLocked && (
            <p className="text-muted-foreground text-xs sm:col-span-2">
              The price is fixed once the enrollment is confirmed or paid. Use “Money entry” on the
              card for an extra charge, discount, write-off or refund.
            </p>
          )}
          <div className="grid gap-2 sm:col-span-2">
            <Label>Remarks</Label>
            <Textarea rows={2} value={f.remarks ?? ""} onChange={(e) => set("remarks", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {isEdit ? (
            <Button variant="brand" onClick={() => submit()} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => submit()} disabled={saving}>
                Save as pending
              </Button>
              <Button variant="brand" onClick={() => submit(true)} disabled={saving}>
                {saving ? "Saving…" : "Save and confirm"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Record a payment. Payments are never edited: a wrong one is voided (with a
 * reason) from its row, and the right one recorded again here.
 */
export function PaymentDialog({
  open,
  onClose,
  leadId,
  enrollmentApiId,
  allowLeadPick = false,
}: {
  open: boolean;
  onClose: () => void;
  leadId?: number;
  enrollmentApiId?: number;
  /** Inline Lead + Enrollment pickers (global flow) when not preset from context. */
  allowLeadPick?: boolean;
}) {
  const [f, setF] = useState<ApiPaymentPayload>({});
  const needsPickers = allowLeadPick;
  const [pickedLeadId, setPickedLeadId] = useState("");
  const [pickedEnrollmentId, setPickedEnrollmentId] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  /** Inline "create enrollment" so a lead with none doesn't dead-end this flow. */
  const [enrollOpen, setEnrollOpen] = useState(false);
  const effectiveLeadId = leadId ?? (pickedLeadId ? Number(pickedLeadId) : undefined);
  const effectiveEnrollmentId =
    enrollmentApiId ?? (pickedEnrollmentId ? Number(pickedEnrollmentId) : undefined);

  const leadOptionsQ = useLeadOptions(open && needsPickers ? leadSearch : "");
  const enrollmentsQ = useLeadEnrollments(needsPickers ? effectiveLeadId : undefined);
  const enrollments = enrollmentsQ.enrollments;
  const addPayment = useAddPayment(effectiveLeadId, effectiveEnrollmentId);
  const saving = addPayment.isPending;

  useEffect(() => {
    if (!open) return;
    setPickedLeadId("");
    setPickedEnrollmentId("");
    setLeadSearch("");
    setEnrollOpen(false);
    setF({
      amount: "",
      payment_date: new Date().toISOString(),
      payment_method: "esewa",
      status: "successful",
      transaction_reference: "",
      notes: "",
    });
  }, [open]);

  // Pre-select when the chosen lead has exactly one enrollment.
  useEffect(() => {
    if (!needsPickers || pickedEnrollmentId) return;
    if (enrollments.length === 1) setPickedEnrollmentId(String(enrollments[0].id));
  }, [needsPickers, enrollments, pickedEnrollmentId]);

  const set = <K extends keyof ApiPaymentPayload>(k: K, v: ApiPaymentPayload[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  function submit() {
    if (needsPickers && (!effectiveLeadId || !effectiveEnrollmentId)) {
      toast.error("Pick a lead and its enrollment first.");
      return;
    }
    if (!f.amount) return;
    addPayment.mutate(f, { onSuccess: () => onClose() });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Totals count successful payments only. A pending payment is confirmed later from
            its row.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          {needsPickers && (
            <>
              <div className="grid gap-2 sm:col-span-2">
                <Label required>Lead</Label>
                <Combobox
                  value={pickedLeadId}
                  onChange={(v) => {
                    setPickedLeadId(v);
                    setPickedEnrollmentId("");
                  }}
                  onSearchChange={setLeadSearch}
                  options={leadOptionsQ.options}
                  loading={leadOptionsQ.isLoading && !!leadSearch}
                  placeholder="Search leads by name or phone…"
                  searchPlaceholder="Type to search…"
                  emptyText="No leads match."
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label required>Enrollment</Label>
                  {effectiveLeadId && enrollments.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground -my-1 h-7"
                      onClick={() => setEnrollOpen(true)}
                    >
                      <Plus /> New
                    </Button>
                  )}
                </div>
                <Select
                  value={pickedEnrollmentId || undefined}
                  onValueChange={setPickedEnrollmentId}
                  disabled={!effectiveLeadId || enrollmentsQ.isLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !effectiveLeadId
                          ? "Pick a lead first"
                          : enrollmentsQ.isLoading
                            ? "Loading enrollments…"
                            : "Select enrollment"
                      }
                    />
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
                {effectiveLeadId && !enrollmentsQ.isLoading && enrollments.length === 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-2.5">
                    <p className="text-muted-foreground text-xs">
                      This lead has no enrollments yet — payments are recorded against one.
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setEnrollOpen(true)}>
                      <Plus /> Create Enrollment
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
          <div className="grid gap-2">
            <Label required>Amount</Label>
            <Input type="number" value={f.amount ?? ""} onChange={(e) => set("amount", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Date</Label>
            <Input
              type="datetime-local"
              value={f.payment_date ? f.payment_date.slice(0, 16) : ""}
              onChange={(e) => set("payment_date", toNepalIso(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Method</Label>
            <Select value={f.payment_method ?? "esewa"} onValueChange={(v) => set("payment_method", v as ApiPaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="capitalize">
                    {m.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={f.status ?? "successful"} onValueChange={(v) => set("status", v as ApiPaymentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_STATUS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Transaction reference</Label>
            <Input value={f.transaction_reference ?? ""} onChange={(e) => set("transaction_reference", e.target.value)} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="brand" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Record Payment"}
          </Button>
        </DialogFooter>

        {/* Nested so the half-filled payment form survives creating the enrollment. */}
        <EnrollmentDialog
          open={enrollOpen}
          onClose={() => setEnrollOpen(false)}
          leadId={effectiveLeadId}
          onCreated={(created) => setPickedEnrollmentId(String(created.id))}
        />
      </DialogContent>
    </Dialog>
  );
}
