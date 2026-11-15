export type CallDirection = "inbound" | "outbound";

export interface ApiCallRow {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string;
  call_timestamp: string;
  direction: CallDirection;
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

/** Filters shared by the list, the summary and the export. */
export interface CallFilterParams {
  search?: string;
  direction?: CallDirection;
  created_by?: number;
  branch_id?: number;
  date_from?: string;
  date_to?: string;
}

export interface CallListParams extends CallFilterParams {
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface CallsSummary {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  talk_seconds: number;
  avg_duration_seconds: number;
  connected_calls: number;
  connect_rate: number;
  calls_per_day: { date: string; count: number }[];
  top_callers: { caller_id: string; caller: string; count: number }[];
}