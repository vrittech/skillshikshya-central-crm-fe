import { api } from "@/lib/api";
import type { CallParams, CallSummary, PaginatedCalls } from "@/types/calls";

export type { CallParams } from "@/types/calls";

export const callsService = {
  async summary(params: CallParams) {
    const { data } = await api.get<CallSummary>("/calls/summary/", { params });
    return data;
  },
  async list(params: CallParams) {
    const { data } = await api.get<PaginatedCalls>("/calls/", { params });
    return data;
  },
  async export(params: CallParams) {
    const { data } = await api.get<Blob>("/calls/export/", {
      params,
      responseType: "blob",
    });
    return data;
  },
};
