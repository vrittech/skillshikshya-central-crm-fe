import type { Paginated } from "@/types";

export interface Call {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string;
  call_timestamp: string;
  direction: "inbound" | "outbound";
  caller: string;
  phone_number: string;
  duration_seconds: number;
  duration_formatted: string;
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

export type PaginatedCalls = Paginated<Call>;

export interface CallDayStat {
  date: string;
  calls: number;
  seconds: number;
}

export interface CallUserStat {
  user_id: number | null;
  name: string;
  calls: number;
  seconds: number;
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
  by_day: CallDayStat[];
  by_user: CallUserStat[];
}

export interface CallListParams {
  direction?: "inbound" | "outbound";
  created_by?: number | string;
  student?: number | string;
  lead?: number | string;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
  search?: string;
  ordering?: string;
  branch_id?: number | string;
  page?: number;
  page_size?: number;
}

export interface CallSummaryParams {
  direction?: "inbound" | "outbound";
  created_by?: number | string;
  student?: number | string;
  lead?: number | string;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
  search?: string;
  branch_id?: number | string;
}
