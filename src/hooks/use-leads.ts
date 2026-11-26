import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { phoneMatchOf } from "@/lib/phone-match";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  adaptApiCall,
  adaptApiActivity,
  adaptApiCourseInterest,
  adaptApiEnrollment,
  adaptApiFollowup,
  adaptApiLead,
  adaptApiLeadToListItem,
  adaptApiPayment,
} from "@/data/lead-adapters";
import { globalListsService } from "@/services/global-lists.service";
import { leadsService, type LeadListParams } from "@/services/leads.service";
import type {
  ApiAdjustmentKind,
  ApiEnrollment,
  ApiEnrollmentHistory,
  ApiEnrollmentPayload,
  ApiEnrollmentStatus,
  ApiFollowup,
  ApiLeadCall,
  ApiLeadDocument,
  ApiLeadPayload,
  ApiPayment,
  ApiPaymentPayload,
  ApiSeatAction,
  ApiSeatActionBody,
  ApiDuePart,
  ApiFirstPayment,
  ApiLeadImportOptions,
  EnrollmentListParams,
  PaymentListParams,
} from "@/types/leads-api";
import type { Lead, LeadListItem } from "@/types/leads";
import type { LeadFilterState } from "@/pages/leads/components/lead-filters";

const EMPTY_PAGE = { count: 0, next: null, previous: null, results: [] };

/* ------------------------------------------------- filter translation */

export function buildApiParams(
  f: LeadFilterState,
  page: number,
  pageSize: number,
  ordering: string,
): LeadListParams {
  const p: LeadListParams = { page, page_size: pageSize, ordering };
  if (f.search.trim()) p.search = f.search.trim();
  if (f.status !== "all") p.status = Number(f.status);
  if (f.source !== "all") p.source = Number(f.source);
  if (f.priority !== "all") p.priority = Number(f.priority);
  if (f.course !== "all") p.primary_course = Number(f.course);
  if (f.assignedTo !== "all") {
    p.assigned_counselor = Number(f.assignedTo);
  }
  if (f.overdueOnly) p.next_followup_at__lte = new Date().toISOString();
  // Date-only created filters — the backend's `from_date`/`to_date` and
  // `created_date` are inclusive whole days, so no timezone juggling is needed.
  if (f.createdDate) p.created_date = f.createdDate;
  if (f.dateFrom) p.from_date = f.dateFrom;
  if (f.dateTo) p.to_date = f.dateTo;
  if (f.enrollment !== "all") p.enrollment_status = f.enrollment;
  return p;
}

/* ------------------------------------------------------------- list hook */

export interface LeadsListResult {
  items: LeadListItem[];
  count: number;
  isLoading: boolean;
  isFetching: boolean;
}

/** Counts for the lead list cards, over every lead the user can see. */
export function useLeadSummary(params: { branch_id?: number } = {}) {
  return useQuery({
    queryKey: ["leads", "summary", params],
    queryFn: () => leadsService.summary(params),
    placeholderData: keepPreviousData,
  });
}

export function useLeadsList(
  filters: LeadFilterState,
  page: number,
  pageSize: number,
  ordering = "-created_at",
): LeadsListResult {
  const apiParams = buildApiParams(filters, page, pageSize, ordering);

  const query = useQuery({
    queryKey: ["leads", "list", apiParams],
    queryFn: () => leadsService.list(apiParams),
    placeholderData: keepPreviousData,
  });

  return {
    items: (query.data?.results ?? []).map(adaptApiLeadToListItem),
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}

/* ----------------------------------------------------------- detail hook */

export interface LeadDetailResult {
  lead: Lead | undefined;
  documents: ApiLeadDocument[];
  isLoading: boolean;
  notFound: boolean;
}

export function useLead(routeId?: string): LeadDetailResult {
  const numId = routeId && /^\d+$/.test(routeId) ? Number(routeId) : NaN;

  const query = useQuery({
    queryKey: ["lead", "detail", routeId],
    enabled: !Number.isNaN(numId),
    queryFn: async () => {
      const [lead, calls, acts, fus, docs, interests, enrolls] = await Promise.all([
        leadsService.get(numId),
        leadsService.calls(numId).catch(() => EMPTY_PAGE),
        leadsService.activities(numId).catch(() => EMPTY_PAGE),
        leadsService.followups(numId).catch(() => EMPTY_PAGE),
        leadsService.documents(numId).catch(() => EMPTY_PAGE),
        leadsService.courseInterests(numId).catch(() => EMPTY_PAGE),
        leadsService.enrollments(numId, { ordering: "-id" }).catch(() => EMPTY_PAGE),
      ]);
      const ui = adaptApiLead(lead);
      ui.activities = [
        ...calls.results.map(adaptApiCall),
        ...acts.results.map(adaptApiActivity),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      ui.followUps = fus.results.map(adaptApiFollowup);
      // Enquiries without a course are not course interests.
      const withCourse = interests.results.filter((ci) => ci.course != null);
      if (withCourse.length) ui.courseInterests = withCourse.map(adaptApiCourseInterest);

      // `enrollments` is ordered newest-first, so results[0] is the latest one;
      // it feeds the hero/summary. The Enrollment tab lists them all via
      // `useLeadEnrollments`.
      const latestEnr = enrolls.results[0];
      if (latestEnr) {
        ui.enrollment = adaptApiEnrollment(latestEnr);
        const pays = await leadsService
          .payments(numId, latestEnr.id, { ordering: "-payment_date", page_size: 100 })
          .catch(() => EMPTY_PAGE);
        ui.payments = pays.results.map(adaptApiPayment);
      }
      return { lead: ui, documents: docs.results as ApiLeadDocument[] };
    },
  });

  return {
    lead: query.data?.lead,
    documents: query.data?.documents ?? [],
    isLoading: query.isLoading,
    notFound: !query.isLoading && !query.data,
  };
}

/* ------------------------------------------------------------ mutations */

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApiLeadPayload) => leadsService.create(payload),
    onSuccess: (lead) => {
      toast.success(`Lead "${lead.full_name}" created`);
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => {
      // A phone match is shown on the form itself.
      if (phoneMatchOf(e)) return;
      toast.error(apiErrorMessage(e, "Could not create lead"));
    },
  });
}

/** Leads in any branch with the typed phone number (7 digits or more). */
export function usePhoneMatch(phone: string, exclude?: number) {
  const debounced = useDebouncedValue(phone.trim(), 400);
  const digits = debounced.replace(/\D/g, "");
  return useQuery({
    queryKey: ["leads", "phone-match", debounced, exclude],
    queryFn: () => leadsService.phoneMatch(debounced, exclude),
    enabled: digits.length >= 7,
    staleTime: 30_000,
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ApiLeadPayload }) => leadsService.update(id, payload),
    onSuccess: () => {
      toast.success("Lead updated");
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["lead"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update lead")),
  });
}

/* --------------------------------------------------------- recycle bin */

/** A soft-deleted lead row, with the delete metadata the bin needs to show. */
export type RecycleItem = LeadListItem & { deletedAt?: string | null };

export function useRecycleBin(page: number, pageSize: number) {
  const query = useQuery({
    queryKey: ["leads", "recycle-bin", page, pageSize],
    queryFn: () => leadsService.recycleBin({ page, page_size: pageSize }),
    placeholderData: keepPreviousData,
  });
  const items: RecycleItem[] = (query.data?.results ?? []).map((l) => ({
    ...adaptApiLeadToListItem(l),
    deletedAt: l.deleted_at ?? null,
  }));
  return {
    items,
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
  };
}

/** Undelete a soft-deleted lead (out of the recycle bin). */
export function useRestoreLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => leadsService.restore(id),
    onSuccess: () => {
      toast.success("Lead restored");
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["lead"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not restore lead")),
  });
}

/** Permanently delete a lead (staff only). Irreversible. */
export function usePurgeLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => leadsService.purge(id),
    onSuccess: () => {
      toast.success("Lead permanently deleted");
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not permanently delete lead")),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await leadsService.remove(id);
    },
    onSuccess: () => {
      toast.success("Lead moved to recycle bin");
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete lead")),
  });
}

/**
 * Bulk soft-delete. The backend has no bulk endpoint (see lead-additional.md),
 * so we fan out the per-lead DELETE and report partial failures. Recoverable
 * from the recycle bin.
 */
export function useBulkDeleteLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => leadsService.remove(id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      return { ok: ids.length - failed, failed };
    },
    onSuccess: ({ ok, failed }) => {
      if (failed) {
        toast.warning(`Moved ${ok} to recycle bin — ${failed} could not be deleted`);
      } else {
        toast.success(`${ok} lead${ok === 1 ? "" : "s"} moved to recycle bin`);
      }
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete leads")),
  });
}

/**
 * Bulk assign. No bulk endpoint exists, so fan out per-lead PATCH of
 * `assigned_counselor` (same field the edit form writes) and report failures.
 */
export function useBulkAssignLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, counselorId }: { ids: number[]; counselorId: number }) => {
      const results = await Promise.allSettled(
        ids.map((id) => leadsService.update(id, { assigned_counselor: counselorId })),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return { ok: ids.length - failed, failed };
    },
    onSuccess: ({ ok, failed }) => {
      if (failed) {
        toast.warning(`Assigned ${ok} — ${failed} could not be updated`);
      } else {
        toast.success(`${ok} lead${ok === 1 ? "" : "s"} assigned`);
      }
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not assign leads")),
  });
}

/** Assign (or unassign) a lead's counselor — PATCH assigned_counselor. */
export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, counselorId }: { id: number; counselorId: number | null }) =>
      leadsService.update(id, { assigned_counselor: counselorId }),
    onSuccess: () => {
      toast.success("Lead assigned");
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not assign lead")),
  });
}

export function useAddCall(leadId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ApiLeadCall>) => leadsService.addCall(leadId as number, payload),
    onSuccess: () => {
      toast.success("Call logged");
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not log call")),
  });
}

/** PATCH an existing lead call (outcome/notes/next steps). */
export function useUpdateCall(leadId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, payload }: { callId: number; payload: Partial<ApiLeadCall> }) =>
      leadsService.updateCall(leadId as number, callId, payload),
    onSuccess: () => {
      toast.success("Call updated");
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update call")),
  });
}

export function useAddFollowup(leadId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<ApiFollowup>) => leadsService.addFollowup(leadId as number, payload),
    onSuccess: () => {
      toast.success("Follow-up scheduled");
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not schedule follow-up")),
  });
}

/* ------------------------------------------- enrollments & payments (live) */
// Nested under a lead: /api/leads/{lead}/enrollments/[{id}/payments/].
// See be-mds/lead_app_enrollments_payments_api_guide.md.

/** All enrollments of one lead (newest first by default). */
export function useLeadEnrollments(leadId?: number, params: EnrollmentListParams = {}) {
  const enabled = leadId != null;
  const query = useQuery({
    queryKey: ["lead", "enrollments", leadId, params],
    enabled,
    queryFn: () => leadsService.enrollments(leadId as number, { ordering: "-id", ...params }),
    placeholderData: keepPreviousData,
  });
  return {
    enrollments: (query.data?.results ?? []) as ApiEnrollment[],
    count: query.data?.count ?? 0,
    isLoading: enabled && query.isLoading,
    isFetching: enabled && query.isFetching,
  };
}

/** Payments of one enrollment (newest first by default). */
export function useEnrollmentPayments(
  leadId?: number,
  enrollmentId?: number,
  params: PaymentListParams = {},
) {
  const enabled = leadId != null && enrollmentId != null;
  const query = useQuery({
    queryKey: ["lead", "payments", leadId, enrollmentId, params],
    enabled,
    queryFn: () =>
      leadsService.payments(leadId as number, enrollmentId as number, {
        ordering: "-payment_date",
        page_size: 100,
        ...params,
      }),
    placeholderData: keepPreviousData,
  });
  return {
    payments: (query.data?.results ?? []) as ApiPayment[],
    isLoading: enabled && query.isLoading,
  };
}

/**
 * Every payment of a lead, across all of its enrollments (newest first).
 * Shares the cache with `useEnrollmentPayments` (same query keys).
 */
export function useLeadPayments(leadId?: number) {
  const { enrollments, isLoading: enrLoading } = useLeadEnrollments(leadId);

  const queries = useQueries({
    queries: enrollments.map((e) => ({
      queryKey: ["lead", "payments", leadId, e.id, {}],
      enabled: leadId != null,
      queryFn: () =>
        leadsService.payments(leadId as number, e.id, {
          ordering: "-payment_date",
          page_size: 100,
        }),
    })),
  });

  const rows = queries
    .flatMap((q, i) =>
      (q.data?.results ?? []).map((p) => ({ payment: p as ApiPayment, enrollment: enrollments[i] })),
    )
    .sort((a, b) => +new Date(b.payment.payment_date) - +new Date(a.payment.payment_date));

  return {
    rows,
    isLoading: enrLoading || queries.some((q) => q.isLoading && q.fetchStatus !== "idle"),
  };
}

export function useAddEnrollment(leadId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApiEnrollmentPayload) => leadsService.addEnrollment(leadId as number, payload),
    onSuccess: () => {
      toast.success("Enrollment created");
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["enrollments"] });
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create enrollment")),
  });
}

export function useUpdateEnrollment(leadId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ApiEnrollmentPayload }) =>
      leadsService.updateEnrollment(leadId as number, id, payload),
    onSuccess: () => {
      toast.success("Enrollment updated");
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["enrollments"] });
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update enrollment")),
  });
}

/** Reason trail of one enrollment (who, when, what, from → to, why). */
export function useEnrollmentReminders(leadId?: number, enrollmentId?: number, load = true) {
  const enabled = leadId != null && enrollmentId != null && load;
  const query = useQuery({
    queryKey: ["lead", "reminders", leadId, enrollmentId],
    enabled,
    queryFn: () => leadsService.enrollmentReminders(leadId as number, enrollmentId as number),
  });
  return { reminders: query.data?.results ?? [], isLoading: enabled && query.isLoading };
}

export function useEnrollmentHistory(leadId?: number, enrollmentId?: number, load = true) {
  const enabled = leadId != null && enrollmentId != null && load;
  const query = useQuery({
    queryKey: ["lead", "history", leadId, enrollmentId],
    enabled,
    queryFn: () => leadsService.enrollmentHistory(leadId as number, enrollmentId as number),
  });
  return {
    history: (query.data?.results ?? []) as ApiEnrollmentHistory[],
    isLoading: enabled && query.isLoading,
  };
}

/** Add a money entry (extra charge, discount, write-off, refund) with a reason. */
export function useAddAdjustment(leadId?: number, enrollmentId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { kind: ApiAdjustmentKind; amount: string; reason: string }) =>
      leadsService.addAdjustment(leadId as number, enrollmentId as number, payload),
    onSuccess: (data) => {
      toast.success(`${data.kind_display} added`);
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["enrollments"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not add the money entry")),
  });
}

/** Confirm a pending enrollment: the lead becomes a student and gets the fee invoice. */
export function useConfirmEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      id,
      dueDates,
      firstPayment,
    }: {
      leadId: number;
      id: number;
      dueDates?: ApiDuePart[];
      firstPayment?: ApiFirstPayment;
    }) => leadsService.confirmEnrollment(leadId, id, dueDates, firstPayment),
    onSuccess: () => {
      toast.success("Enrollment confirmed");
      // Confirm also takes a seat and may record the first payment.
      for (const key of [
        "lead",
        "leads",
        "enrollments",
        "invoices",
        "students",
        "course-batches",
        "payments",
      ]) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not confirm the enrollment")),
  });
}

/** Change the due dates of an enrollment, with a reason. */
export function useSetDueDates(leadId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dueDates, reason }: { id: number; dueDates: ApiDuePart[]; reason: string }) =>
      leadsService.setDueDates(leadId as number, id, dueDates, reason),
    onSuccess: () => {
      toast.success("Due dates changed");
      for (const key of ["lead", "enrollments", "reports"]) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not change the due dates")),
  });
}

/** Make a new fee invoice after the old one was cancelled. */
export function useMakeFeeInvoice(leadId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => leadsService.makeFeeInvoice(leadId as number, id),
    onSuccess: (invoice) => {
      toast.success("Fee invoice created", { description: invoice.invoice_number });
      for (const key of ["lead", "enrollments", "invoices"]) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create the fee invoice")),
  });
}

const SEAT_DONE: Record<ApiSeatAction, string> = {
  join: "Added to batch",
  move: "Batch changed",
  pause: "Enrollment paused",
  resume: "Enrollment resumed",
};

/** Join batch, Move, Pause or Resume. Each needs a reason and adds a seat history row. */
export function useSeatAction(leadId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, body }: { id: number; action: ApiSeatAction; body: ApiSeatActionBody }) =>
      leadsService.seatAction(leadId as number, id, action, body),
    onSuccess: (data, vars) => {
      toast.success(SEAT_DONE[vars.action], {
        description: data.current_batch_name ?? undefined,
      });
      for (const key of ["lead", "enrollments", "course-batches", "teams"]) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not change the seat")),
  });
}

/** Cancel or reinstate an enrollment. Both need a reason and add a history row. */
export function useEnrollmentStatusAction(leadId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: number;
      action: "cancel" | "reinstate";
      reason: string;
    }) =>
      action === "cancel"
        ? leadsService.cancelEnrollment(leadId as number, id, reason)
        : leadsService.reinstateEnrollment(leadId as number, id, reason),
    onSuccess: (_data, vars) => {
      toast.success(vars.action === "cancel" ? "Enrollment cancelled" : "Enrollment reinstated");
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["enrollments"] });
      // Cancel frees the seat; the Teams licence then shows "Action required".
      void qc.invalidateQueries({ queryKey: ["course-batches"] });
      void qc.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update the enrollment")),
  });
}

/** Change status: active, completed, dropped out… Dropping out or transferring frees the seat. */
export function useChangeEnrollmentStatus(leadId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: ApiEnrollmentStatus; reason: string }) =>
      leadsService.changeEnrollmentStatus(leadId as number, id, status, reason),
    onSuccess: () => {
      toast.success("Status changed");
      for (const key of ["lead", "leads", "enrollments", "course-batches", "teams", "students"]) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not change the status")),
  });
}

export function useAddPayment(leadId?: number, enrollmentId?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApiPaymentPayload) =>
      leadsService.addPayment(leadId as number, enrollmentId as number, payload),
    onSuccess: () => {
      toast.success("Payment recorded");
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["enrollments"] });
      void qc.invalidateQueries({ queryKey: ["payments"] });
      // A successful payment generates a receipt invoice server-side.
      void qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not record payment")),
  });
}

/**
 * Confirm a pending payment (issues its receipt) or void one with a reason.
 * Payments are never edited — a wrong one is voided and a new one recorded.
 */
export function usePaymentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      enrollmentId,
      id,
      action,
      reason,
    }: {
      leadId: number;
      enrollmentId: number;
      id: number;
      action: "confirm" | "void";
      reason?: string;
    }) =>
      action === "confirm"
        ? leadsService.confirmPayment(leadId, enrollmentId, id)
        : leadsService.voidPayment(leadId, enrollmentId, id, reason ?? ""),
    onSuccess: (_data, vars) => {
      toast.success(vars.action === "confirm" ? "Payment confirmed" : "Payment voided");
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["enrollments"] });
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update the payment")),
  });
}

export function useArchiveLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, restore }: { id: number; restore?: boolean }) => {
      await (restore ? leadsService.restore(id) : leadsService.archive(id));
      return { restore };
    },
    onSuccess: (r) => {
      toast.success(r?.restore ? "Lead restored" : "Lead archived");
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["lead"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update lead")),
  });
}

/**
 * One enrollment for its own page. The global endpoint gives the lead, then
 * the lead's enrollment endpoint gives the full record the actions need.
 * The key starts with "lead", so every enrollment action refreshes it.
 */
export function useEnrollmentPage(id?: number) {
  return useQuery({
    queryKey: ["lead", "enrollment-page", id],
    enabled: id != null && Number.isFinite(id),
    queryFn: async () => {
      const row = await globalListsService.enrollment(id!);
      const enrollment = await leadsService.enrollment(row.lead, id!);
      return { leadId: row.lead, enrollment };
    },
    retry: false,
  });
}


/** Checks an import file and says what would happen. Saves nothing. */
export function useLeadImportPreview() {
  return useMutation({
    mutationFn: (options: ApiLeadImportOptions) => leadsService.importPreview(options),
  });
}

/** Imports the rows that pass; the lead list and notifications refresh after. */
export function useImportLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (options: ApiLeadImportOptions) => leadsService.importLeads(options),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
