import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { ApiCallListRow, ApiCallSummary, CallListParams } from "@/types/calls";

export { type CallListParams };

/** Global flat call log endpoints. See lead_app_calls_api_guide.md and GET /api/calls/. */
export const callsService = {
  async list(params: CallListParams = {}) {
    const { data } = await api.get<Paginated<ApiCallListRow>>("/calls/", { params });
    return data;
  },

  /** Calls summary totals, calls per day, and top callers (scoped by current filters). */
  async summary(params: Omit<CallListParams, "page" | "page_size"> = {}) {
    const { data } = await api.get<ApiCallSummary>("/calls/summary/", { params });
    return data;
  },

  /** Downloads the filtered call log as calls-YYYY-MM-DD.csv */
  async exportCsv(params: Omit<CallListParams, "page" | "page_size"> = {}) {
    const { data } = await api.get<Blob>("/calls/export_csv/", {
      params,
      responseType: "blob",
    });
    // Formulate today's date in local Nepal time YYYY-MM-DD
    const now = new Date();
    const npt = new Date(now.getTime() + (5 * 60 + 45) * 60 * 1000);
    const y = npt.getUTCFullYear();
    const m = String(npt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(npt.getUTCDate()).padStart(2, "0");
    const fileName = `calls-${y}-${m}-${d}.csv`;

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
