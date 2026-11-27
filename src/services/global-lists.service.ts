import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  ApiEnrollmentListRow,
  ApiFollowupListRow,
  ApiFollowupSummary,
  ApiPaymentListRow,
  ApiPaymentSummary,
} from "@/types/leads-api";

/** Cross-lead flat list endpoints (read-only). See lead_app_global_list_api_guide.md. */
export const globalListsService = {
  async followups(params: Record<string, unknown> = {}) {
    const { data } = await api.get<Paginated<ApiFollowupListRow>>("/followups/", { params });
    return data;
  },
  /** Overdue / today / upcoming counts for the same filters as followups(). */
  async followupsSummary(params: Record<string, unknown> = {}) {
    const { data } = await api.get<ApiFollowupSummary>("/followups/summary/", { params });
    return data;
  },
  async enrollments(params: Record<string, unknown> = {}) {
    const { data } = await api.get<Paginated<ApiEnrollmentListRow>>("/enrollments/", { params });
    return data;
  },
  async enrollment(id: number) {
    const { data } = await api.get<ApiEnrollmentListRow>(`/enrollments/${id}/`);
    return data;
  },
  async payments(params: Record<string, unknown> = {}) {
    const { data } = await api.get<Paginated<ApiPaymentListRow>>("/payments/", { params });
    return data;
  },
  /** Count and successful total for the same filters as payments(), across every page. */
  async paymentsSummary(params: Record<string, unknown> = {}) {
    const { data } = await api.get<ApiPaymentSummary>("/payments/summary/", { params });
    return data;
  },
};
