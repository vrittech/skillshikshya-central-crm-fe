import type { ApiLeadCall } from "@/types/leads-api";

export interface GlobalCall extends ApiLeadCall {
  lead_name: string;
  lead_reference_number: string;
  duration_seconds: number;
  duration_formatted: string;
  branch: number | null;
}

export interface CallFilters {
  search?: string;
  direction?: "inbound" | "outbound";
  created_by?: number;
  branch_id?: number;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
}

export type CallOrdering =
  | "call_timestamp"
  | "-call_timestamp"
  | "duration_seconds"
  | "-duration_seconds";

export interface CallListParams extends CallFilters {
  ordering?: CallOrdering;
  page?: number;
  page_size?: number;
}

export interface CallSummary {
  total_calls: number;
  inbound: number;
  outbound: number;
  total_seconds: number;
  total_formatted: string;
  avg_seconds: number;
  connected_calls: number;
  connect_rate: number;
  by_day: { date: string; calls: number; seconds: number }[];
  by_user: {
    user_id: number | null;
    name: string;
    calls: number;
    seconds: number;
  }[];
}
