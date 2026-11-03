export interface CallParams {
  search?: string;
  direction?: "inbound" | "outbound";
  created_by?: number;
  branch_id?: number;
  "call_timestamp__gte"?: string;
  "call_timestamp__lte"?: string;
  ordering?: string;
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
  by_user: { user_id: number | null; name: string; calls: number; seconds: number }[];
}

export interface CallRecord {
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
  created_by: number | null;
  created_by_name: string | null;
}

export interface PaginatedCalls {
  count: number;
  page_size: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: CallRecord[];
}
