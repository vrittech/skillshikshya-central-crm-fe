import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  ApiGlobalCall,
  CallsSummary,
  GlobalCallParams,
} from "@/types/calls-api";

function clean(params: object) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}

export const callsService = {
  async list(params: GlobalCallParams = {}) {
    const { data } = await api.get<Paginated<ApiGlobalCall>>("/calls/", {
      params: clean(params),
    });
    return data;
  },

  async summary(params: GlobalCallParams = {}) {
    const { data } = await api.get<CallsSummary>("/calls/summary/", {
      params: clean(params),
    });
    return data;
  },

  exportCsvUrl(params: GlobalCallParams = {}) {
    const query = new URLSearchParams(
      Object.entries(clean(params)).map(([key, value]) => [
        key,
        String(value),
      ]),
    );

    const search = query.toString();

    return `/api/calls/export_csv/${search ? `?${search}` : ""}`;
  },
};