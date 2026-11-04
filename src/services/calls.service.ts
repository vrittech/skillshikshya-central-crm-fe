import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { CallFilterParams, CallListParams, CallRow, CallSummary } from "@/types/calls";

/** Pull the file name out of a Content-Disposition header, with a dated fallback. */
function fileNameFrom(disposition: unknown): string {
  const match = typeof disposition === "string" ? /filename="?([^";]+)"?/.exec(disposition) : null;
  return match?.[1] ?? `calls-${new Date().toISOString().slice(0, 10)}.csv`;
}

export const callsService = {
  async list(params: CallListParams = {}) {
    const { data } = await api.get<Paginated<CallRow>>("/calls/", { params });
    return data;
  },
  async summary(params: CallFilterParams = {}) {
    const { data } = await api.get<CallSummary>("/calls/summary/", { params });
    return data;
  },
  /**
   * CSV of every call matching the filters, across all pages.
   * Fetched with axios (not a plain link) so the login-cookie refresh in lib/api.ts applies.
   */
  async exportCsv(params: CallFilterParams = {}) {
    const res = await api.get<Blob>("/calls/export/", { params, responseType: "blob" });
    return { blob: res.data, filename: fileNameFrom(res.headers["content-disposition"]) };
  },
};