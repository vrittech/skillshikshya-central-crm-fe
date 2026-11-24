import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  ApiCourseInterest,
  ApiEnquiryStage,
  ApiEnquiryStageChange,
  ApiLostReason,
} from "@/types/leads-api";

const base = (leadId: number) => `/leads/${leadId}/course-interests/`;

/** A lead's enquiries, one per course, each with its own stage. */
export const enquiriesService = {
  async list(leadId: number) {
    const { data } = await api.get<Paginated<ApiCourseInterest>>(base(leadId), {
      params: { page_size: 100 },
    });
    return data;
  },

  async add(leadId: number, course: number) {
    const { data } = await api.post<ApiCourseInterest>(base(leadId), { course });
    return data;
  },

  async move(leadId: number, id: number, stage: ApiEnquiryStage, note = "") {
    const { data } = await api.post<ApiCourseInterest>(`${base(leadId)}${id}/stage/`, {
      stage,
      note,
    });
    return data;
  },

  async lose(leadId: number, id: number, reason: ApiLostReason, note = "") {
    const { data } = await api.post<ApiCourseInterest>(`${base(leadId)}${id}/lose/`, {
      reason,
      note,
    });
    return data;
  },

  async history(leadId: number, id: number) {
    const { data } = await api.get<ApiEnquiryStageChange[]>(`${base(leadId)}${id}/history/`);
    return data;
  },
};
