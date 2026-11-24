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
  usePayment,
  useUpdateEnrollment,
  useUpdatePayment,
  useLeadEnrollments,
} from "@/hooks/use-leads";
import type {
  ApiEnrollment,
  ApiEnrollmentPayload,
  ApiEnrollmentStatus,
  ApiPayment,
  ApiPaymentMethod,
  ApiPaymentPayload,
  ApiPaymentStatus,
} from "@/types/leads-api";
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
const PAY_STATUS: ApiPaymentStatus[] = ["pending", "successful", "failed", "refunded", "voided"];

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
  const wasCancelled = enrollment?.status === "cancelled";
  const needsLead = allowLeadPick && !isEdit;
  const [pickedLeadId, setPickedLeadId] = useState<string>("");
  const [leadSearch, setLeadSearch] = useState("");
  const effectiveLeadId = leadId ?? (pickedLeadId ? Number(pickedLeadId) : undefined);

  const leadOptionsQ = useLeadOptions(open && needsLead ? leadSearch : "");
  const coursesQ = useCourses(1, 100, "");
  const courses = useMemo(() => coursesQ.data?.results ?? [], [coursesQ.data]);
  const batchesQ = useCourseBatches(
    { course: f.course, page_size: 100, is_active: true },
    !!f.course,
  );
  const batches = useMemo(() => batchesQ.data?.results ?? [], [batchesQ.data]);
  const addEnrollment = useAddEnrollment(effectiveLeadId);
  const updateEnrollment = useUpdateEnrollment(leadId);
  const saving = addEnrollment.isPending || updateEnrollment.isPending;

  useEffect(() => {
    if (!open) return;
    setPickedLeadId("");
    setLeadSearch("");
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
      status: "active",
      listed_fee: "0",
      standard_discount: "0",
      additional_discount: "0",
      agreed_amount: "0",
      remarks: "",
    });
  }, [open, primaryCourseId, enrollment]);

  const set = <K extends keyof ApiEnrollmentPayload>(k: K, v: ApiEnrollmentPayload[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  // Keep agreed = listed - standard - additional as a helpful default.
  const agreedAuto = num(num(f.listed_fee ?? "0", f.standard_discount ?? "0"), f.additional_discount ?? "0");

  function submit() {
    if (needsLead && !effectiveLeadId) {
      toast.error("Pick a lead first.");
      return;
    }
    if (!f.course) return;
    const payload = { ...f, agreed_amount: f.agreed_amount || agreedAuto };
    if (enrollment) {
      updateEnrollment.mutate({ id: enrollment.id, payload }, { onSuccess: () => onClose() });
      return;
    }
    addEnrollment.mutate(payload, {
      onSuccess: (created) => {
        onCreated?.(created);
        onClose();
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
              value={f.course != null ? String(f.course) : undefined}
              onValueChange={(v) =>
                setF((p) => ({
                  ...p,
                  course: Number(v),
                  batch: undefined,
                }))
              }
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
              disabled={!f.course || batchesQ.isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={f.course ? "Select course batch" : "Select a course first"} />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.coursebatch_id} — {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Enrollment date</Label>
            <Input type="date" value={f.enrollment_date ?? ""} onChange={(e) => set("enrollment_date", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            {/* Cancel and reinstate need a reason, so they are buttons on the card, not options here. */}
            <Select
              value={f.status ?? "active"}
              onValueChange={(v) => set("status", v as ApiEnrollmentStatus)}
              disabled={wasCancelled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENR_STATUS.filter((s) => wasCancelled || s !== "cancelled").map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {wasCancelled && (
              <p className="text-muted-foreground text-xs">Use Reinstate on the card to reopen it.</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Listed fee</Label>
            <Input type="number" value={f.listed_fee ?? ""} onChange={(e) => set("listed_fee", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Standard discount</Label>
            <Input type="number" value={f.standard_discount ?? ""} onChange={(e) => set("standard_discount", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Additional discount</Label>
            <Input type="number" value={f.additional_discount ?? ""} onChange={(e) => set("additional_discount", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Agreed amount</Label>
            <Input
              type="number"
              value={f.agreed_amount ?? ""}
              onChange={(e) => set("agreed_amount", e.target.value)}
              placeholder={agreedAuto}
            />
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
          <Button variant="brand" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Enrollment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentDialog({
  open,
  onClose,
  leadId,
  enrollmentApiId,
  payment,
  allowLeadPick = false,
}: {
  open: boolean;
  onClose: () => void;
  leadId?: number;
  enrollmentApiId?: number;
  /** Pass an existing payment to correct it (PATCH) instead of recording a new one. */
  payment?: ApiPayment | null;
  /** Inline Lead + Enrollment pickers (global flow) when not preset from context. */
  allowLeadPick?: boolean;
}) {
  const [f, setF] = useState<ApiPaymentPayload>({});
  const isEdit = !!payment;
  const needsPickers = allowLeadPick && !isEdit;
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
  const updatePayment = useUpdatePayment(effectiveLeadId, effectiveEnrollmentId);
  const saving = addPayment.isPending || updatePayment.isPending;

  useEffect(() => {
    if (!open) return;
    setPickedLeadId("");
    setPickedEnrollmentId("");
    setLeadSearch("");
    setEnrollOpen(false);
    if (payment) {
      setF({
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        status: payment.status,
        transaction_reference: payment.transaction_reference ?? "",
        notes: payment.notes ?? "",
      });
      return;
    }
    setF({
      amount: "",
      payment_date: new Date().toISOString(),
      payment_method: "esewa",
      status: "successful",
      transaction_reference: "",
      notes: "",
    });
  }, [open, payment]);

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
    if (payment) {
      updatePayment.mutate({ id: payment.id, payload: f }, { onSuccess: () => onClose() });
      return;
    }
    addPayment.mutate(f, { onSuccess: () => onClose() });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Correct payment" : "Record payment"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Marking a pending payment successful issues its receipt now. Editing an already-successful payment does not reissue one."
              : "Totals recalculate from successful payments."}
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
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Record Payment"}
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

/**
 * Correct a payment when only its ids are known (the flat `/api/payments/`
 * register). Fetches the full record first so `notes` survives the PATCH.
 */
export function EditPaymentDialog({
  open,
  onClose,
  leadId,
  enrollmentId,
  paymentId,
}: {
  open: boolean;
  onClose: () => void;
  leadId?: number;
  enrollmentId?: number;
  paymentId?: number;
}) {
  const { payment } = usePayment(
    open ? leadId : undefined,
    open ? enrollmentId : undefined,
    open ? paymentId : undefined,
  );
  if (!open || !payment) return null;
  return (
    <PaymentDialog
      key={payment.id}
      open
      onClose={onClose}
      leadId={leadId}
      enrollmentApiId={enrollmentId}
      payment={payment}
    />
  );
}
