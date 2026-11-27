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
  ApiDuePart,
  ApiEnrollment,
  ApiEnrollmentPayload,
  ApiPaymentMethod,
  ApiPaymentPayload,
  ApiPaymentStatus,
} from "@/types/leads-api";
import { partsAreValid, splitEvenly } from "@/lib/due-dates";
import { formatNPR, toNepalIso } from "@/lib/leads-format";
import { batchOption, localToday, takesNoOne } from "@/lib/seats";
import { DuePartsEditor } from "./due-dates";
import { useRole } from "@/context/role";

const PAY_METHODS: ApiPaymentMethod[] = ["cash", "esewa", "khalti", "bank_transfer", "card", "connectips"];
/** A new payment is pending or successful; Confirm and Void change it later. */
const PAY_STATUS: ApiPaymentStatus[] = ["successful", "pending"];

/** A short error under a money field. */
function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="text-destructive text-xs">{children}</p>;
}

/** Why a payment amount can't be taken, checked against what is left to pay. */
function paymentAmountError(amount: string | undefined, left: number | null) {
  if (left == null) return null;
  if (left <= 0) return "Nothing left to pay";
  if (Number(amount) > left) return `More than left to pay (${formatNPR(left)})`;
  return null;
}

function num(a: string, b: string) {
  return String((Number(a || "0") - Number(b || "0") - 0).toFixed(2));
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
  const wasPending = enrollment?.status === "pending";
  // The price can change until the enrollment is confirmed or something is paid.
  const priceLocked = isEdit && !(wasPending && Number(enrollment?.total_paid ?? 0) === 0);
  // Once confirmed, the course and the money batch are fixed.
  const seatLocked = isEdit && !wasPending;
  const needsLead = allowLeadPick && !isEdit;
  const [pickedLeadId, setPickedLeadId] = useState<string>("");
  const [leadSearch, setLeadSearch] = useState("");
  // The listed fee is the course price. The agreed amount follows it until
  // the user types their own value.
  const [agreedEdited, setAgreedEdited] = useState(false);
  const effectiveLeadId = leadId ?? (pickedLeadId ? Number(pickedLeadId) : undefined);

  const leadOptionsQ = useLeadOptions(open && needsLead ? leadSearch : "");
  const coursesQ = useCourses(1, 100, "");
  const courses = useMemo(() => coursesQ.data?.results ?? [], [coursesQ.data]);
  // Closed batches take no one new, so they are not offered.
  // An enrollment can only plan a batch of its own branch.
  const batchesQ = useCourseBatches(
    {
      course: f.course,
      page_size: 100,
      is_active: true,
      status: ["upcoming", "running"],
      branch_id: enrollment?.branch ?? undefined,
    },
    !!f.course,
  );
  const batches = useMemo(() => batchesQ.data?.results ?? [], [batchesQ.data]);
  const chosenBatch = batches.find((b) => b.id === f.batch);
  // The saved batch may be closed or inactive now; still show its name.
  const savedBatchMissing =
    enrollment?.batch != null && !batches.some((b) => b.id === enrollment.batch);
  const addEnrollment = useAddEnrollment(effectiveLeadId);
  const updateEnrollment = useUpdateEnrollment(leadId);
  // "Save and confirm" opens Confirm (with the first payment) for the new enrollment.
  const [confirming, setConfirming] = useState<{ leadId: number; enrollment: ApiEnrollment } | null>(
    null,
  );
  const saving = addEnrollment.isPending || updateEnrollment.isPending;

  useEffect(() => {
    if (!open) return;
    setPickedLeadId("");
    setLeadSearch("");
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
        enrollment_date: enrollment.enrollment_date ?? localToday(),
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
      enrollment_date: localToday(),
      // A new enrollment is pending until it is confirmed (that makes the lead a student).
      status: "pending",
      listed_fee: "0",
      standard_discount: "0",
      additional_discount: "0",
      agreed_amount: "",
      remarks: "",
    });
  }, [open, primaryCourseId, enrollment]);

  // The listed fee is the price set on the course (also for a preselected
  // course, once the course list has loaded). The server sets it the same way.
  const courseChanged = f.course != null && f.course !== enrollment?.course;
  useEffect(() => {
    if (!open || f.course == null || (isEdit && !courseChanged)) return;
    const course = courses.find((c) => c.id === f.course);
    if (course) setF((p) => ({ ...p, listed_fee: String(Number(course.full_amount || 0)) }));
  }, [open, isEdit, courseChanged, f.course, courses]);

  const set = <K extends keyof ApiEnrollmentPayload>(k: K, v: ApiEnrollmentPayload[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  // Keep agreed = listed - standard - additional as a helpful default.
  const agreedAuto = num(num(f.listed_fee ?? "0", f.standard_discount ?? "0"), f.additional_discount ?? "0");
  // The same limits the server checks: a typo (100000 for 10000) is caught here first.
  const listed = Number(f.listed_fee ?? 0);
  const discountTotal = Number(f.standard_discount || 0) + Number(f.additional_discount || 0);
  const agreedValue = Number(agreedEdited ? f.agreed_amount || 0 : agreedAuto);
  const discountError =
    Number(f.standard_discount || 0) < 0 || Number(f.additional_discount || 0) < 0
      ? "Can't be below 0"
      : discountTotal > listed
        ? `More than the listed fee (${formatNPR(listed)})`
        : null;
  const agreedError =
    discountError || priceLocked
      ? null
      : agreedValue < 0
        ? "Can't be below 0"
        : agreedValue > listed - discountTotal
          ? `More than ${formatNPR(listed - discountTotal)}`
          : null;
  const priceInvalid = !priceLocked && (!!discountError || !!agreedError);

  function submit(confirmAfter = false) {
    if (needsLead && !effectiveLeadId) {
      toast.error("Pick a lead first.");
      return;
    }
    if (!f.course) {
      toast.error("Pick a course.");
      return;
    }
    if (!f.enrollment_date) {
      toast.error("Pick the enrollment date.");
      return;
    }
    const payload = {
      ...f,
      // A cleared discount box means no discount; the API refuses an empty number.
      standard_discount: f.standard_discount || "0",
      additional_discount: f.additional_discount || "0",
      agreed_amount: agreedEdited && f.agreed_amount ? f.agreed_amount : agreedAuto,
    };
    if (enrollment) {
      updateEnrollment.mutate({ id: enrollment.id, payload }, { onSuccess: () => onClose() });
      return;
    }
    addEnrollment.mutate(payload, {
      onSuccess: (created) => {
        onCreated?.(created);
        onClose();
        // "Save and confirm": take the first payment and confirm right away.
        if (confirmAfter && effectiveLeadId != null) {
          setConfirming({ leadId: effectiveLeadId, enrollment: created });
        }
      },
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit enrollment" : "Create enrollment"}</DialogTitle>
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
            <div className="grid min-w-0 gap-2 sm:col-span-2">
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
                <SelectTrigger className="min-w-0 [&>span]:text-ellipsis">
                  <SelectValue placeholder={f.course ? "Select course batch" : "Select a course first"} />
                </SelectTrigger>
                <SelectContent>
                  {savedBatchMissing && enrollment?.batch != null && (
                    <SelectItem value={String(enrollment.batch)}>
                      {enrollment.batch_name ?? `Batch #${enrollment.batch}`}
                    </SelectItem>
                  )}
                  {batches.map((b) => (
                    <SelectItem
                      key={b.id}
                      value={String(b.id)}
                      disabled={takesNoOne(b) && b.id !== enrollment?.batch}
                    >
                      {batchOption(b)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!seatLocked && chosenBatch && takesNoOne(chosenBatch) && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {chosenBatch.capacity == null ? "This batch has no seats set." : "This batch is full."}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label required>Enrollment date</Label>
              <Input type="date" value={f.enrollment_date ?? ""} onChange={(e) => set("enrollment_date", e.target.value)} />
            </div>
            {/* The price is fixed once confirmed or paid; later changes are money entries with a reason. */}
            <div className="grid gap-2">
              <Label htmlFor="enrollment-listed-fee">Listed fee</Label>
              <Input id="enrollment-listed-fee" type="number" value={f.listed_fee ?? ""} readOnly disabled />
            </div>
            <div className="grid gap-2">
              <Label>Standard discount</Label>
              <Input type="number" value={f.standard_discount ?? ""} disabled={priceLocked} onChange={(e) => set("standard_discount", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Additional discount</Label>
              <Input type="number" value={f.additional_discount ?? ""} disabled={priceLocked} onChange={(e) => set("additional_discount", e.target.value)} />
              {!priceLocked && <FieldError>{discountError}</FieldError>}
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
              <FieldError>{agreedError}</FieldError>
            </div>
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
              <Button variant="brand" onClick={() => submit()} disabled={saving || priceInvalid}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => submit()} disabled={saving || priceInvalid}>
                  Save as pending
                </Button>
                <Button variant="brand" onClick={() => submit(true)} disabled={saving || priceInvalid}>
                  {saving ? "Saving…" : "Save and confirm"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmEnrollmentDialog
        leadId={confirming?.leadId}
        enrollment={confirming?.enrollment ?? null}
        onClose={() => setConfirming(null)}
      />
    </>
  );
}

/**
 * Confirm a pending enrollment: the lead becomes a student. Something must be
 * paid first (unless discounts leave nothing to pay), so when nothing is paid
 * the first payment is taken here, in the same step as the confirm. Taking it
 * needs the payment right; without it, someone who has it records the payment.
 */
export function ConfirmEnrollmentDialog({
  leadId,
  enrollment,
  onClose,
}: {
  leadId?: number;
  enrollment: ApiEnrollment | null;
  onClose: () => void;
}) {
  const confirm = useConfirmEnrollment();
  const canTakePayment = useRole().can("payment.record");
  const [parts, setParts] = useState<ApiDuePart[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<ApiPaymentMethod>("esewa");
  const [reference, setReference] = useState("");
  const open = enrollment != null;
  const agreed = Number(enrollment?.agreed_amount ?? 0);
  const paid = Number(enrollment?.total_paid ?? 0) - Number(enrollment?.refunds_total ?? 0);
  const toPay = agreed - Number(enrollment?.discounts_total ?? 0);
  const needsPayment = toPay > 0 && paid <= 0;
  const takesPayment = needsPayment && canTakePayment;

  useEffect(() => {
    if (!open) return;
    setParts(splitEvenly(agreed, 1, localToday()));
    setAmount("");
    setMethod("esewa");
    setReference("");
  }, [open, agreed]);

  const left = Number(enrollment?.remaining_amount ?? 0);
  const firstError = takesPayment && amount ? paymentAmountError(amount, left) : null;
  const amountOk = needsPayment ? takesPayment && Number(amount) > 0 && !firstError : true;
  const valid = amountOk && (agreed <= 0 || partsAreValid(parts, agreed));

  function submit() {
    if (!enrollment || leadId == null) return;
    confirm.mutate(
      {
        leadId,
        id: enrollment.id,
        dueDates: agreed > 0 ? parts : undefined,
        firstPayment: takesPayment
          ? { amount, payment_method: method, transaction_reference: reference.trim() || undefined }
          : undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm enrollment</DialogTitle>
          {enrollment && (
            <DialogDescription>
              {[enrollment.lead_name, enrollment.course_name, enrollment.batch_name, formatNPR(agreed)]
                .filter(Boolean)
                .join(" · ")}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {needsPayment && !takesPayment ? (
            <div className="grid gap-1 rounded-xl border px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-semibold tabular-nums">{formatNPR(0)}</span>
              </div>
              <FieldError>Record a payment first.</FieldError>
            </div>
          ) : takesPayment ? (
            <div className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
              <p className="text-sm font-semibold sm:col-span-2">First payment</p>
              <div className="grid gap-2">
                <Label htmlFor="first-payment-amount" required>
                  Amount
                </Label>
                <Input
                  id="first-payment-amount"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <FieldError>{firstError}</FieldError>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="first-payment-method" required>Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as ApiPaymentMethod)}>
                  <SelectTrigger id="first-payment-method">
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
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="first-payment-reference">Transaction reference</Label>
                <Input
                  id="first-payment-reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>
          ) : (
            paid > 0 && (
              <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-semibold tabular-nums">{formatNPR(paid)}</span>
              </div>
            )
          )}
          {agreed > 0 && <DuePartsEditor total={agreed} parts={parts} onChange={setParts} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button variant="brand" disabled={!valid || confirm.isPending} onClick={submit}>
            {confirm.isPending ? "Confirming…" : "Confirm enrollment"}
          </Button>
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
  const enrollmentsQ = useLeadEnrollments(open ? effectiveLeadId : undefined);
  const enrollments = enrollmentsQ.enrollments;
  const target = enrollments.find((e) => e.id === effectiveEnrollmentId);
  const left = target ? Number(target.remaining_amount) : null;
  const amountError = f.amount ? paymentAmountError(f.amount, left) : left != null && left <= 0 ? "Nothing left to pay" : null;
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
    if (!f.amount) {
      toast.error("Enter the amount.");
      return;
    }
    if (!f.payment_date) {
      toast.error("Pick the payment date.");
      return;
    }
    addPayment.mutate(f, { onSuccess: () => onClose() });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
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
            {amountError ? (
              <FieldError>{amountError}</FieldError>
            ) : (
              left != null && <p className="text-muted-foreground text-xs">Left to pay {formatNPR(left)}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label required>Date</Label>
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
          <Button variant="brand" onClick={submit} disabled={saving || !!amountError}>
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
