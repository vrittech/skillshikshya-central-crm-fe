export interface CallRow {
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
}

export interface CallsParams {
  page?: number;
  page_size?: number;
  search?: string;
  direction?: string;
  created_by?: number;
  from_date?: string;
  to_date?: string;
  branch_id?: number;
  ordering?: string;
}

export interface CallsSummary {
  total_calls: number;
  inbound: number;
  outbound: number;
  talk_seconds: number;
  avg_seconds: number;
  connect_rate: number;
  calls_per_day: { date: string; count: number }[];
  top_callers: { user_id: number | null; name: string | null; count: number }[];
}