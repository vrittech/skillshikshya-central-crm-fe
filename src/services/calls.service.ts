import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { CallRow, CallsParams, CallsSummary } from "@/types/calls";

export const callsService = {
  async list(params: CallsParams = {}) {
    const { data } = await api.get<Paginated<CallRow>>("/calls/", { params });
    return data;
  },

  async summary(params: CallsParams = {}) {
    const { data } = await api.get<CallsSummary>("/calls/summary/", { params });
    return data;
  },

  async exportCsv(params: CallsParams = {}) {
    const { data } = await api.get<Blob>("/calls/export/", {
      params,
      responseType: "blob",
    });
    return data;
  },
};