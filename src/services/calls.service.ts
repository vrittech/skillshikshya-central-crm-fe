import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { ApiGlobalCall, CallQueryParams, CallsSummary } from "@/types/calls";

/** Global call log. See be apps/app_documents/lead_app_calls_api_guide.md. */
export const callsService = {
  async list(params: CallQueryParams) {
    const { data } = await api.get<Paginated<ApiGlobalCall>>("/calls/", { params });
    return data;
  },
  async summary(params: CallQueryParams) {
    const { data } = await api.get<CallsSummary>("/calls/summary/", { params });
    return data;
  },
  /** Downloads every call matching `params` (all pages) as calls-YYYY-MM-DD.csv. */
  async exportCsv(params: CallQueryParams) {
    const res = await api.get<Blob>("/calls/export_csv/", { params, responseType: "blob" });
    const name = /filename="([^"]+)"/.exec(String(res.headers["content-disposition"] ?? ""))?.[1];
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name ?? "calls.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
};
