import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { CallRow, CallsFilterParams, CallsListParams, CallsSummary } from "@/types/calls";

export const callsService = {
  /** Paginated global call log (branch-scoped by the backend). */
  async list(params: CallsListParams = {}) {
    const { data } = await api.get<Paginated<CallRow>>("/calls/", { params });
    return data;
  },

  /** Cards + chart data for the same filters as the list. */
  async summary(params: CallsFilterParams = {}) {
    const { data } = await api.get<CallsSummary>("/calls/summary/", { params });
    return data;
  },

  /** All filtered calls as a CSV blob (not just one page). */
  async exportCsv(params: CallsFilterParams = {}) {
    const { data } = await api.get<Blob>("/calls/export/", { params, responseType: "blob" });
    return data;
  },
};
