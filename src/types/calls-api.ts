export interface ApiGlobalCall {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string | null;
  call_timestamp: string;
  direction: "inbound" | "outbound";
  caller: number | string | null;
  phone_number: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  notes: string | null;
  recording_url: string | null;
  next_followup_at: string | null;
  next_action: string | null;
  branch: number | null;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
}

export interface GlobalCallParams {
  page?: number;
  page_size?: number;
  search?: string;
  direction?: "inbound" | "outbound";
  outcome?: string;
  caller?: string;
  notes?: string;
  lead?: number;
  student?: number;
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
  talk_time_seconds: number;
  average_duration_seconds: number;
  connected_calls: number;
  connect_rate: number;
  daily_calls: {
    date: string;
    count: number;
  }[];
   top_callers: {
    created_by__name: string | null;
    call_count: number;
  }[];
}