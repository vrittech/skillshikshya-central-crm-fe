import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  ApiCourseInterest,
  ApiEnrollment,
  ApiEnrollmentPayload,
  EnrollmentListParams,
  PaymentListParams,
  ApiFollowup,
  ApiLead,
  ApiLeadActivity,
  ApiLeadCall,
  ApiLeadCallCreateResponse,
  ApiLeadDocument,
  ApiLeadPayload,
  ApiPayment,
  ApiPaymentPayload,
} from "@/types/leads-api";

/** Query params accepted by GET /api/leads/ (see be-mds/lead_app_lead_api_guide.md). */
export interface LeadListParams {
  page?: number;
  page_size?: number;
  search?: string;
  lead_type?: number | string;
  lead_type__in?: string;
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
  ordering?: string;
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
  async get(id: number) {
    const { data } = await api.get<ApiLead>(`/leads/${id}/`);
    return data;
  },
  async create(payload: ApiLeadPayload) {
    const { data } = await api.post<ApiLead>("/leads/", payload);
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
  async courseInterests(leadId: number) {
    const { data } = await api.get<Paginated<ApiCourseInterest>>(`/leads/${leadId}/course-interests/`);
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
      params,
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
  async deleteEnrollment(leadId: number, id: number) {
    await api.delete(`/leads/${leadId}/enrollments/${id}/`);
  },
  async payments(leadId: number, enrollmentId: number, params: PaymentListParams = {}) {
    const { data } = await api.get<Paginated<ApiPayment>>(
      `/leads/${leadId}/enrollments/${enrollmentId}/payments/`,
      { params },
    );
    return data;
  },
  async payment(leadId: number, enrollmentId: number, id: number) {
    const { data } = await api.get<ApiPayment>(
      `/leads/${leadId}/enrollments/${enrollmentId}/payments/${id}/`,
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
  /**
   * Correct a recorded payment (amount, method, reference, status…).
   * Flipping a `pending` payment to `successful` issues its receipt at that moment;
   * editing an already-successful payment does not regenerate the issued receipt.
   */
  async updatePayment(
    leadId: number,
    enrollmentId: number,
    id: number,
    payload: ApiPaymentPayload,
  ) {
    const { data } = await api.patch<ApiPayment>(
      `/leads/${leadId}/enrollments/${enrollmentId}/payments/${id}/`,
      payload,
    );
    return data;
  },
  async deletePayment(leadId: number, enrollmentId: number, id: number) {
    await api.delete(`/leads/${leadId}/enrollments/${enrollmentId}/payments/${id}/`);
  },
  async calls(leadId: number, params: CallListParams = {}) {
    const { data } = await api.get<Paginated<ApiLeadCall>>(`/leads/${leadId}/calls/`, { params });
    return data;
  },
  async addCall(leadId: number, payload: Partial<ApiLeadCall> & { duration_input?: string }) {
    const { data } = await api.post<ApiLeadCallCreateResponse>(`/leads/${leadId}/calls/`, payload);
    return data;
  },
  /** PATCH a call — backend silently ignores duration_seconds/caller changes. */
  async updateCall(leadId: number, callId: number, payload: Partial<ApiLeadCall>) {
    const { data } = await api.patch<ApiLeadCall>(`/leads/${leadId}/calls/${callId}/`, payload);
    return data;
  },
  async activities(leadId: number) {
    const { data } = await api.get<Paginated<ApiLeadActivity>>(`/leads/${leadId}/activities/`);
    return data;
  },
  async addActivity(leadId: number, payload: Partial<ApiLeadActivity>) {
    const { data } = await api.post<ApiLeadActivity>(`/leads/${leadId}/activities/`, payload);
    return data;
  },
  async followups(leadId: number) {
    const { data } = await api.get<Paginated<ApiFollowup>>(`/leads/${leadId}/followups/`);
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
    const { data } = await api.get<Paginated<ApiLeadDocument>>(`/leads/${leadId}/documents/`);
    return data;
  },
  async addDocument(leadId: number, payload: { document_type: string; file: string }) {
    const { data } = await api.post<ApiLeadDocument>(`/leads/${leadId}/documents/`, payload);
    return data;
  },

  /** Absolute URL for the CSV export (opened in a new tab; cookies authenticate). */
  exportCsvUrl(params: LeadListParams = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) => (v == null ? [] : [[k, String(v)]])),
    );
    const q = qs.toString();
    return `/api/leads/export_csv/${q ? `?${q}` : ""}`;
  },
};
