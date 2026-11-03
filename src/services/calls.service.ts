import { api } from "@/lib/api";
import type { Call, CallListParams, CallsSummaryResponse } from "@/types/calls";

function clean(params: object) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

export const callsService = {
  /** Paginated calls list — GET /calls/. */
  async list(params?: CallListParams) {
    const { data } = await api.get<{ results: Call[]; count: number; next: string | null; previous: string | null }>(
      "/calls/",
      { params: clean(params ?? {}) },
    );
    return data;
  },

  /** Summary statistics — GET /calls/summary/ (read-only aggregate; no pagination params). */
  async summary(params?: CallListParams) {
    // Strip pagination parameters so they can't shift the aggregate meaning.
    const { page, page_size, ...rest } = clean(params ?? {});
    void page;
    void page_size;
    const { data } = await api.get<CallsSummaryResponse>("/calls/summary/", { params: clean(rest) });
    return data;
  },

  /** Single call detail — GET /calls/{id}/. */
  async detail(id: number) {
    const { data } = await api.get<Call>(`/calls/${id}/`);
    return data;
  },

  /** CSV export — GET /calls/export_csv/. */
  async exportCsv(params?: CallListParams) {
    const { page, page_size, ...filters } = clean(params ?? {});
    void page;
    void page_size;

    const { data } = await api.get<Blob>("/calls/export_csv/", {
      params: clean(filters),
      responseType: "blob",
    });

    return data;
  },
};
