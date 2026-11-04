import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { CallFilterParams, CallListParams, CallsSummary, GlobalCall } from "@/types/calls";

export const callsService = {
  async list(params: CallListParams = {}) {
    const { data } = await api.get<Paginated<GlobalCall>>("/calls/", { params });
    return data;
  },

  /** Totals, calls per day and top callers for the same filters as the list. */
  async summary(params: CallFilterParams = {}) {
    const { data } = await api.get<CallsSummary>("/calls/summary/", { params });
    return data;
  },

  /** Downloads the filtered calls as CSV; the server names the file (calls-YYYY-MM-DD.csv). */
  async exportCsv(params: CallFilterParams = {}) {
    const response = await api.get<Blob>("/calls/export/", {
      params,
      responseType: "blob",
    });
    const disposition = String(response.headers["content-disposition"]);
    const filename = disposition.match(/filename="(.+)"/)?.[1] ?? "calls.csv";
    const url = URL.createObjectURL(response.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
