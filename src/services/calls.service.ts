import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { ApiGlobalCall, CallSummary } from "@/types/leads-api";

export interface GlobalCallParams {
  page?: number;
  page_size?: number;
  search?: string;
  direction?: "inbound" | "outbound";
  created_by?: number;
  branch_id?: number;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
  ordering?: string;
}

export const callsService = {
  async list(params: GlobalCallParams = {}) {
    const { data } = await api.get<Paginated<ApiGlobalCall>>("/calls/", {
      params,
    });
    return data;
  },
  async summary(params: GlobalCallParams = {}) {
    const { data } = await api.get<CallSummary>("/calls/summary/", { params });
    return data;
  },
  async exportCsv(params: GlobalCallParams = {}) {
    const { data, headers } = await api.get<Blob>("/calls/export/", {
      params,
      responseType: "blob",
    });
    return {
      data,
      filename: headers["content-disposition"] as string | undefined,
    };
  },
};
