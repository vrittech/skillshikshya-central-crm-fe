
export interface ApiCall {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number?: string | null;
  call_timestamp: string;
  direction: "inbound" | "outbound";
  caller: number | string | null;
  phone_number: string | null;
  duration_seconds: number | null;
  duration_formatted?: string;
  outcome: string | null;
  notes: string | null;
  next_followup_at?: string | null;
  next_action?: string | null;
  recording_url?: string | null;
  branch?: number | null;
  created_by?: number | null;
  created_by_name?: string;
  created_at: string;
}

export interface CallListParams {
  page?: number;
  page_size?: number;
  direction?: "inbound" | "outbound";
  created_by?: number;
  student?: number;
  lead?: number;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
  search?: string;
  ordering?: string;
  branch_id?: number;
}

export interface DailyCall {
  date: string;
  total_calls: number;
}

export interface TopCaller {
  caller: string | null;
  total_calls: number;
}

export interface CallSummary {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  talk_time_seconds: number;
  average_duration_seconds: number;
  connected_calls: number;
  connect_rate: number;
  daily_calls: DailyCall[];
  top_callers: TopCaller[];
}
