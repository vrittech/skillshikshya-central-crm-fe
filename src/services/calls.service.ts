import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  CallListParams,
  CallRecord,
  CallSummary,
  CallSummaryParams,
} from "@/types/calls";

export const callsService = {
  async list(params: CallListParams = {}) {
    const { data } = await api.get<Paginated<CallRecord>>("/calls/", { params });
    return data;
  },

  async summary(params: CallSummaryParams = {}) {
    const { data } = await api.get<CallSummary>("/calls/summary/", { params });
    return data;
  },
};