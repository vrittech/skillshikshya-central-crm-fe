import { api } from "@/lib/api";
import { fileNameFrom, saveBlob } from "@/lib/download";
import type { Paginated } from "@/types";
import type {
  ApiAdjustment,
  ApiAdjustmentKind,
  ApiCourseInterest,
  ApiPhoneMatch,
  ApiEnrollment,
  ApiEnrollmentHistory,
  ApiEnrollmentPayload,
  ApiEnrollmentStatus,
  EnrollmentListParams,
  PaymentListParams,
  ApiFollowup,
  ApiLead,
  ApiLeadActivity,
  ApiLeadCall,
  ApiLeadDocument,
  ApiLeadPayload,
  ApiPayment,
  ApiPaymentPayload,
  ApiSeatAction,
  ApiSeatActionBody,
  ApiDuePart,
  ApiFirstPayment,
  ApiReminderLog,
  ApiLeadFileType,
  ApiLeadImportOptions,
  ApiLeadImportPreview,
  ApiLeadImportResult,
} from "@/types/leads-api";
import type { ApiInvoice } from "@/types/invoices";

/** Query params accepted by GET /api/leads/ (see be-mds/lead_app_lead_api_guide.md). */
export interface LeadListParams {
  page?: number;
  page_size?: number;
  search?: string;
  source?: number;
  source__in?: string;
  campaign?: number;
  campaign__in?: string;
  branch?: number;
  branch__in?: string;
  /** Branch scoping (staff only) — see lead_app_overview.md §Branch Scoping. */
  branch_id?: number;
  province?: number;
  province__in?: string;
  city?: number;
  city__in?: string;
  priority?: number;
  status?: number;
  status__in?: string;
  assigned_counselor?: number;
  primary_course?: number;
  is_converted?: boolean;
  is_archived?: boolean;
  include_archived?: boolean;
  tags?: number;
  lead_score__gte?: number;
  lead_score__lte?: number;
  expected_revenue__gte?: number;
  expected_revenue__lte?: number;
  next_followup_at__gte?: string;
  next_followup_at__lte?: string;
  last_contact_at__gte?: string;
  last_contact_at__lte?: string;
  created_at__gte?: string;
  created_at__lte?: string;
  /** Exact created day, `YYYY-MM-DD`. */
  created_date?: string;
  /** Created on or after, `YYYY-MM-DD` — date-only alternative to created_at__gte. */
  from_date?: string;
  /** Created on or before, `YYYY-MM-DD`. */
  to_date?: string;
  /** Leads with an enrollment in this status, e.g. "pending". */
  enrollment_status?: string;
  ordering?: string;
}

/** The most rows the server sends in one page (CustomPagination.max_page_size). */
const MAX_PAGE = 100;

/** Counts for the cards on the lead list (GET /api/leads/summary/). */
export interface LeadSummary {
  pending_enrollment: number;
  new_this_week: number;
  new_last_week: number;
  followups_today: number;
  followups_overdue: number;
  enrolled_this_month: number;
  enrolled_last_month: number;
}

/** Query params accepted by GET /api/leads/{id}/calls/ (see lead_app_calls_api_guide.md). */
export interface CallListParams {
  page?: number;
  page_size?: number;
  direction?: "inbound" | "outbound";
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
  /** e.g. "-call_timestamp" for newest first. */
  ordering?: string;
}

export const leadsService = {
  async list(params: LeadListParams = {}) {
    const { data } = await api.get<Paginated<ApiLead>>("/leads/", { params });
    return data;
  },
  async summary(params: { branch_id?: number } = {}) {
    const { data } = await api.get<LeadSummary>("/leads/summary/", { params });
    return data;
  },
  async get(id: number) {
    const { data } = await api.get<ApiLead>(`/leads/${id}/`);
    return data;
  },
  async create(payload: ApiLeadPayload) {
    const { data } = await api.post<ApiLead>("/leads/", payload);
    return data;
  },
  /** Leads in any branch with this phone number. */
  async phoneMatch(phone: string, exclude?: number) {
    const { data } = await api.get<ApiPhoneMatch[]>("/leads/phone-match/", {
      params: { phone, exclude },
    });
    return data;
  },
  async update(id: number, payload: ApiLeadPayload) {
    const { data } = await api.patch<ApiLead>(`/leads/${id}/`, payload);
    return data;
  },
  async remove(id: number) {
    // Soft delete (is_deleted=true) — recoverable from the recycle bin.
    await api.delete(`/leads/${id}/`);
  },
  async archive(id: number) {
    await api.post(`/leads/${id}/archive/`, {});
  },
  async restore(id: number) {
    await api.post(`/leads/${id}/restore/`, {});
  },
  async purge(id: number) {
    await api.post(`/leads/${id}/purge/`, {});
  },
  async recycleBin(params: LeadListParams = {}) {
    const { data } = await api.get<Paginated<ApiLead>>("/leads/recycle_bin/", { params });
    return data;
  },

  // ---- nested collections ----
  // The lead page shows each list whole, up to the server's 100 a page.
  async courseInterests(leadId: number) {
    const { data } = await api.get<Paginated<ApiCourseInterest>>(`/leads/${leadId}/course-interests/`, {
      params: { page_size: MAX_PAGE },
    });
    return data;
  },
  async addCourseInterest(leadId: number, payload: Partial<ApiCourseInterest>) {
    const { data } = await api.post<ApiCourseInterest>(`/leads/${leadId}/course-interests/`, payload);
    return data;
  },
  async removeCourseInterest(leadId: number, id: number) {
    await api.delete(`/leads/${leadId}/course-interests/${id}/`);
  },
  async enrollments(leadId: number, params: EnrollmentListParams = {}) {
    const { data } = await api.get<Paginated<ApiEnrollment>>(`/leads/${leadId}/enrollments/`, {
      params: { page_size: MAX_PAGE, ...params },
    });
    return data;
  },
  async enrollment(leadId: number, id: number) {
    const { data } = await api.get<ApiEnrollment>(`/leads/${leadId}/enrollments/${id}/`);
    return data;
  },
  async addEnrollment(leadId: number, payload: ApiEnrollmentPayload) {
    const { data } = await api.post<ApiEnrollment>(`/leads/${leadId}/enrollments/`, payload);
    return data;
  },
  async updateEnrollment(leadId: number, id: number, payload: ApiEnrollmentPayload) {
    const { data } = await api.patch<ApiEnrollment>(`/leads/${leadId}/enrollments/${id}/`, payload);
    return data;
  },
  /** Cancel with a reason — the only way to cancel; PATCH refuses it. */
  /**
   * Confirm a pending enrollment. This makes the lead a student and sends the
   * fee invoice. Something must be paid first: firstPayment records it in the
   * same step.
   */
  async confirmEnrollment(
    leadId: number,
    id: number,
    dueDates?: ApiDuePart[],
    firstPayment?: ApiFirstPayment,
  ) {
    const { data } = await api.post<ApiEnrollment>(`/leads/${leadId}/enrollments/${id}/confirm/`, {
      ...(dueDates?.length ? { due_dates: dueDates } : {}),
      ...(firstPayment ? { first_payment: firstPayment } : {}),
    });
    return data;
  },

  /** Change the due dates, with a reason. The parts must add up to the agreed amount. */
  async setDueDates(leadId: number, id: number, dueDates: ApiDuePart[], reason: string) {
    const { data } = await api.post<ApiEnrollment>(
      `/leads/${leadId}/enrollments/${id}/due-dates/`,
      { due_dates: dueDates, reason },
    );
    return data;
  },

  /** Make a new fee invoice when the old one was cancelled. */
  async makeFeeInvoice(leadId: number, id: number) {
    const { data } = await api.post<ApiInvoice>(`/leads/${leadId}/enrollments/${id}/fee-invoice/`, {});
    return data;
  },

  /** Join batch, Move, Pause or Resume — each adds a seat history row. */
  async seatAction(leadId: number, id: number, action: ApiSeatAction, body: ApiSeatActionBody) {
    const path = action === "join" ? "join-batch" : action;
    const { data } = await api.post<ApiEnrollment>(
      `/leads/${leadId}/enrollments/${id}/${path}/`,
      body,
    );
    return data;
  },

  async cancelEnrollment(leadId: number, id: number, reason: string) {
    const { data } = await api.post<ApiEnrollment>(
      `/leads/${leadId}/enrollments/${id}/cancel/`,
      { reason },
    );
    return data;
  },
  /** Undo a cancel with a reason — back to the status it had before. */
  async reinstateEnrollment(leadId: number, id: number, reason: string) {
    const { data } = await api.post<ApiEnrollment>(
      `/leads/${leadId}/enrollments/${id}/reinstate/`,
      { reason },
    );
    return data;
  },
  /** Set the status of a confirmed enrollment, with a reason. */
  async changeEnrollmentStatus(
    leadId: number,
    id: number,
    status: ApiEnrollmentStatus,
    reason: string,
  ) {
    const { data } = await api.post<ApiEnrollment>(
      `/leads/${leadId}/enrollments/${id}/status/`,
      { status, reason },
    );
    return data;
  },
  /** Add an extra charge, discount, write-off or refund (needs a reason). */
  async addAdjustment(
    leadId: number,
    enrollmentId: number,
    payload: { kind: ApiAdjustmentKind; amount: string; reason: string },
  ) {
    const { data } = await api.post<ApiAdjustment>(
      `/leads/${leadId}/enrollments/${enrollmentId}/adjustments/`,
      payload,
    );
    return data;
  },
  /** Payment reminders sent for one enrollment, newest first. */
  async enrollmentReminders(leadId: number, enrollmentId: number) {
    const { data } = await api.get<Paginated<ApiReminderLog>>(
      `/leads/${leadId}/enrollments/${enrollmentId}/reminders/`,
      { params: { page_size: 100 } },
    );
    return data;
  },
  /** Reason trail of one enrollment, newest first (read-only). */
  async enrollmentHistory(leadId: number, enrollmentId: number) {
    const { data } = await api.get<Paginated<ApiEnrollmentHistory>>(
      `/leads/${leadId}/enrollments/${enrollmentId}/history/`,
      { params: { page_size: 100 } },
    );
    return data;
  },
  async payments(leadId: number, enrollmentId: number, params: PaymentListParams = {}) {
    const { data } = await api.get<Paginated<ApiPayment>>(
      `/leads/${leadId}/enrollments/${enrollmentId}/payments/`,
      { params },
    );
    return data;
  },
  async addPayment(leadId: number, enrollmentId: number, payload: ApiPaymentPayload) {
    const { data } = await api.post<ApiPayment>(
      `/leads/${leadId}/enrollments/${enrollmentId}/payments/`,
      payload,
    );
    return data;
  },
  /** Pending -> successful (money received). Issues the receipt. */
  async confirmPayment(leadId: number, enrollmentId: number, id: number) {
    const { data } = await api.post<ApiPayment>(
      `/leads/${leadId}/enrollments/${enrollmentId}/payments/${id}/confirm/`,
      {},
    );
    return data;
  },
  /** Payments are never edited: a wrong one is voided with a reason. */
  async voidPayment(leadId: number, enrollmentId: number, id: number, reason: string) {
    const { data } = await api.post<ApiPayment>(
      `/leads/${leadId}/enrollments/${enrollmentId}/payments/${id}/void/`,
      { reason },
    );
    return data;
  },
  /** A new receipt for a successful payment whose receipt was cancelled. */
  async makeReceipt(leadId: number, enrollmentId: number, id: number) {
    const { data } = await api.post<ApiInvoice>(
      `/leads/${leadId}/enrollments/${enrollmentId}/payments/${id}/receipt/`,
      {},
    );
    return data;
  },
  async calls(leadId: number, params: CallListParams = {}) {
    const { data } = await api.get<Paginated<ApiLeadCall>>(`/leads/${leadId}/calls/`, {
      params: { page_size: MAX_PAGE, ...params },
    });
    return data;
  },
  async addCall(leadId: number, payload: Partial<ApiLeadCall>) {
    const { data } = await api.post<ApiLeadCall>(`/leads/${leadId}/calls/`, payload);
    return data;
  },
  /** PATCH a call — backend silently ignores duration_seconds/caller changes. */
  async updateCall(leadId: number, callId: number, payload: Partial<ApiLeadCall>) {
    const { data } = await api.patch<ApiLeadCall>(`/leads/${leadId}/calls/${callId}/`, payload);
    return data;
  },
  async activities(leadId: number) {
    const { data } = await api.get<Paginated<ApiLeadActivity>>(`/leads/${leadId}/activities/`, {
      params: { page_size: MAX_PAGE },
    });
    return data;
  },
  async addActivity(leadId: number, payload: Partial<ApiLeadActivity>) {
    const { data } = await api.post<ApiLeadActivity>(`/leads/${leadId}/activities/`, payload);
    return data;
  },
  async followups(leadId: number) {
    const { data } = await api.get<Paginated<ApiFollowup>>(`/leads/${leadId}/followups/`, {
      params: { page_size: MAX_PAGE },
    });
    return data;
  },
  async addFollowup(leadId: number, payload: Partial<ApiFollowup>) {
    const { data } = await api.post<ApiFollowup>(`/leads/${leadId}/followups/`, payload);
    return data;
  },
  async updateFollowup(leadId: number, id: number, payload: Partial<ApiFollowup>) {
    const { data } = await api.patch<ApiFollowup>(`/leads/${leadId}/followups/${id}/`, payload);
    return data;
  },
  async documents(leadId: number) {
    const { data } = await api.get<Paginated<ApiLeadDocument>>(`/leads/${leadId}/documents/`, {
      params: { page_size: MAX_PAGE },
    });
    return data;
  },
  async addDocument(leadId: number, payload: { document_type: string; file: string }) {
    const { data } = await api.post<ApiLeadDocument>(`/leads/${leadId}/documents/`, payload);
    return data;
  },

  /** Absolute URL for the CSV export (opened in a new tab; cookies authenticate). */
  /** Downloads the leads the list shows (its filters, not its page), or only `ids`. */
  async exportLeads(params: LeadListParams, fileType: ApiLeadFileType, ids?: number[]) {
    const query: Record<string, unknown> = { ...params, file_type: fileType };
    delete query.page;
    delete query.page_size;
    if (ids?.length) query.ids = ids.join(",");
    const res = await api.get<Blob>("/leads/export_csv/", { params: query, responseType: "blob" });
    saveBlob(res.data, fileNameFrom(res.headers["content-disposition"], `leads.${fileType}`));
  },
  /** The import template: CSV, or Excel with dropdowns of the CRM's lists. */
  async importTemplate(fileType: ApiLeadFileType) {
    const res = await api.get<Blob>("/leads/import-template/", {
      params: { file_type: fileType },
      responseType: "blob",
    });
    saveBlob(res.data, fileNameFrom(res.headers["content-disposition"], `lead-import-template.${fileType}`));
  },
  /** Checks a file and says what an import would do. Saves nothing. */
  async importPreview(options: ApiLeadImportOptions) {
    const { data } = await api.post<ApiLeadImportPreview>("/leads/import/preview/", importForm(options), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  /** Saves the rows that pass; duplicates only with duplicates: "import". */
  async importLeads(options: ApiLeadImportOptions) {
    const { data } = await api.post<ApiLeadImportResult>("/leads/import/", importForm(options), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

function importForm(options: ApiLeadImportOptions) {
  const form = new FormData();
  for (const [key, value] of Object.entries(options)) {
    if (value == null || value === "") continue;
    form.append(key, value instanceof File ? value : String(value));
  }
  return form;
}
