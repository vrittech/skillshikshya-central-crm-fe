import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { ApiCall, CallsFilters, CallsParams, CallsSummary } from "@/types/calls-api";

/** Drops empty values so they don't reach the query string. */
function clean(params: object) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

/** Calls across every lead, newest first. */
export const callsService = {
  async list(params: CallsParams) {
    const { data } = await api.get<Paginated<ApiCall>>("/calls/", { params: clean(params) });
    return data;
  },
  async summary(params: CallsFilters) {
    const { data } = await api.get<CallsSummary>("/calls/summary/", { params: clean(params) });
    return data;
  },
};
