import { api } from "@/lib/api";
import { nepalToday } from "@/lib/nepal-time";
import type { Paginated } from "@/types";
import type { Call, CallFilterParams, CallListParams, CallSummary } from "@/types/calls";

export const callsService = {
  async list(params: CallListParams = {}) {
    const { data } = await api.get<Paginated<Call>>("/calls/", { params });
    return data;
  },

  async summary(params: CallFilterParams = {}) {
    const { data } = await api.get<CallSummary>("/calls/summary/", { params });
    return data;
  },

  /** Goes through axios, not a plain link, so an expired login cookie still gets refreshed. */
  async exportCsv(params: CallFilterParams & { ordering?: string } = {}) {
    const { data } = await api.get<Blob>("/calls/export/", {
      params,
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calls-${nepalToday()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
