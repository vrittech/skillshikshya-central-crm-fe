import { api } from "@/lib/api";
import type { Paginated } from "@/types";

export interface ApiCall {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string;
  call_timestamp: string;
  direction: "inbound" | "outbound";
  caller: string;
  phone_number: string;
  duration_seconds: number;
  outcome: string | null;
  notes: string | null;
  recording_url: string | null;
  next_followup_at: string | null;
  next_action: string | null;
  branch: number | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface CallsParams {
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

export interface CallsSummary {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  talk_seconds: number;
  average_duration_seconds: number;
  connect_rate: number;
  top_callers: { caller: string; total: number }[];
  calls_per_day: { date: string; count: number }[];
}

export const callsService = {
  async list(params: CallsParams) {
    const { data } = await api.get<Paginated<ApiCall>>("/calls/", { params });
    return data;
  },
  async summary(params: Omit<CallsParams, "page" | "page_size" | "ordering">) {
    const { data } = await api.get<CallsSummary>("/calls/summary/", { params });
    return data;
  },
  async exportCsv(params: Omit<CallsParams, "page" | "page_size" | "ordering">) {
    const { data } = await api.get<Blob>("/calls/export_csv/", { params, responseType: "blob" });
    return data;
  },
};
