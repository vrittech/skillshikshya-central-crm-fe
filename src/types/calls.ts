import type { ApiLeadCall } from "./leads-api";

export interface GlobalCall extends ApiLeadCall {
  lead_name: string;
  lead_reference_number: string;
  branch: number | null;
}

export interface CallsParams {
  search?: string;
  direction?: string;
  created_by?: string;
  branch_id?: string;
  from_date?: string;
  to_date?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface CallsSummary {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  talk_time_seconds: number;
  average_duration_seconds: number;
  connected_calls: number;
  connect_rate: number;
  calls_per_day: { date: string; count: number }[];
  top_callers: { created_by: number | null; created_by__name: string | null; count: number }[];
}
