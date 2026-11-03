import { api } from "@/lib/api";
import type {
  CallListParams,
  CallSummary,
  CallSummaryParams,
  PaginatedCalls,
} from "@/types/calls";

export const callsService = {
  async list(params: CallListParams = {}): Promise<PaginatedCalls> {
    const { data } = await api.get<PaginatedCalls>("/calls/", { params });
    return data;
  },

  async summary(params: CallSummaryParams = {}): Promise<CallSummary> {
    const { data } = await api.get<CallSummary>("/calls/summary/", { params });
    return data;
  },

  async exportCsv(params: CallSummaryParams = {}): Promise<Blob> {
    const { data } = await api.get<Blob>("/calls/export/", {
      params,
      responseType: "blob",
    });
    return data;
  },
};
