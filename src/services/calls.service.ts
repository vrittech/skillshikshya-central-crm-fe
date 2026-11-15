import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { ApiCallRow, CallFilterParams, CallListParams, CallsSummary } from "@/types/calls";

/** Global call log — see lead_app_calls_api_guide.md. */
export const callsService = {
  async list(params: CallListParams) {
    const { data } = await api.get<Paginated<ApiCallRow>>("/calls/", { params });
    return data;
  },
  async summary(params: CallFilterParams) {
    const { data } = await api.get<CallsSummary>("/calls/summary/", { params });
    return data;
  },
  /** Every page of the filtered calls as one CSV file. */
  async exportCsv(params: CallFilterParams) {
    const res = await api.get<Blob>("/calls/export/", { params, responseType: "blob" });
    const disposition = String(res.headers["content-disposition"] ?? "");
    const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? "calls.csv";
    return { blob: res.data, filename };
  },
};