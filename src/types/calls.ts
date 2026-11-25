
export interface GlobalCall {
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

export interface CallsListResponse {
  count: number;
  page_size: number;
  max_page_size: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: GlobalCall[];
}

export interface DailyCall {
  date: string;
  total_calls: number;
}

export interface TopCaller {
  caller: string;
  total_calls: number;
  total_talk_time: number;
}

export interface CallsSummary {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  total_talk_time: number;
  average_duration: number;
  connected_calls: number;
  connect_rate: number;
  daily_calls: DailyCall[];
  top_callers: TopCaller[];
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
