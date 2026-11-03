
export type CallDirection = "inbound" | "outbound";

// One call record returned by GET /api/calls/
export interface Call {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string;
  call_timestamp: string;
  direction: CallDirection;
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

// Query parameters supported by the Calls list.
export interface CallsParams {
  page?: number;
  page_size?: number;
  search?: string;
  direction?: CallDirection;
  created_by?: number;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
  ordering?: string;
  branch_id?: number;
}

// Summary cards.
export interface CallSummaryTotals {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  total_talk_time_seconds: number;
  average_duration_seconds: number;
  connected_calls: number;
  connect_rate: number;
}

// Daily call count.
export interface CallsPerDay {
  day: string;
  total_calls: number;
}

// Top caller information.
export interface TopCaller {
  caller_display: string;
  total_calls: number;
  total_talk_time_seconds: number | null;
}

// Complete summary API response.
export interface CallSummary {
  totals: CallSummaryTotals;
  calls_per_day: CallsPerDay[];
  top_callers: TopCaller[];
}
