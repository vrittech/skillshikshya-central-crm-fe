export interface CallRow {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string | null;
  call_timestamp: string;
  direction: "inbound" | "outbound";
  caller: string;
  phone_number: string | null;
  duration_seconds: number | null;
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

export interface CallsListResponse {
  count: number;
  results: CallRow[];
}

export interface CallsFilterParams {
  caller?: string;
  notes?: string;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
  created_by?: number;
  student?: number;
  lead?: number;
  direction?: "inbound" | "outbound";
  outcome?: string;
  search?: string;
  ordering?: string;
  branch_id?: number;
}

export interface CallsListParams extends CallsFilterParams {
  page?: number;
  page_size?: number;
}

export interface CallsSummary {
  total_calls: number;
  inbound: number;
  outbound: number;
  total_seconds: number;
  total_formatted: string;
  avg_seconds: number;
  connected_calls: number;
  connect_rate: number;
  by_day: Array<{
    date: string;
    calls: number;
    seconds: number;
  }>;
  by_user: Array<{
    user_id: number | null;
    name: string;
    calls: number;
    seconds: number;
  }>;
}
