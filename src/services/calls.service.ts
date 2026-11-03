import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { CallListParams, CallRecord } from "@/types/calls";

export const callsService = {
  async list(params: CallListParams = {}) {
    const { data } = await api.get<Paginated<CallRecord>>("/calls/", { params });
    return data;
  },
};