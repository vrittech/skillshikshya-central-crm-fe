import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { CallFilterParams, CallListParams, CallRow, CallSummary } from "@/types/calls";

export const callsService = {
  async list(params: CallListParams = {}) {
    const { data } = await api.get<Paginated<CallRow>>("/calls/", { params });
    return data;
  },
  async summary(params: CallFilterParams = {}) {
    const { data } = await api.get<CallSummary>("/calls/summary/", { params });
    return data;
  },
  /** CSV of every call matching the filters. Uses axios so the cookie refresh in lib/api.ts applies. */
  async exportCsv(params: CallFilterParams = {}) {
    const res = await api.get<Blob>("/calls/export/", { params, responseType: "blob" });
    const disposition = String(res.headers["content-disposition"] ?? "");
    const match = /filename="?([^"]+)"?/.exec(disposition);
    const fallback = `calls-${new Date().toISOString().slice(0, 10)}.csv`;
    return { blob: res.data, filename: match?.[1] ?? fallback };
  },
};