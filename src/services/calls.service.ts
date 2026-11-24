import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { ApiGlobalCall, CallFilterParams, CallListParams, CallSummary } from "@/types/calls";

export const callsService = {
  async list(params: CallListParams = {}) {
    const { data } = await api.get<Paginated<ApiGlobalCall>>("/calls/", { params });
    return data;
  },
  async summary(params: CallFilterParams = {}) {
    const { data } = await api.get<CallSummary>("/calls/summary/", { params });
    return data;
  },
  async exportCsv(params: CallFilterParams = {}) {
    const { data } = await api.get<Blob>("/calls/export/", { params, responseType: "blob" });
    return data;
  },
};