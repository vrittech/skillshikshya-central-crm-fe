import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  ApiCallListRow,
  ApiEnrollmentListRow,
  ApiFollowupListRow,
  ApiPaymentListRow,
} from "@/types/leads-api";

/** Cross-lead flat list endpoints (read-only). See lead_app_global_list_api_guide.md. */
export const globalListsService = {
  async followups(params: Record<string, unknown> = {}) {
    const { data } = await api.get<Paginated<ApiFollowupListRow>>("/followups/", { params });
    return data;
  },
  async enrollments(params: Record<string, unknown> = {}) {
    const { data } = await api.get<Paginated<ApiEnrollmentListRow>>("/enrollments/", { params });
    return data;
  },
  async payments(params: Record<string, unknown> = {}) {
    const { data } = await api.get<Paginated<ApiPaymentListRow>>("/payments/", { params });
    return data;
  },
  async calls(params: Record<string, unknown> = {}) {
    const { data } = await api.get<Paginated<ApiCallListRow>>("/calls/", { params });
    return data;
  },
};
