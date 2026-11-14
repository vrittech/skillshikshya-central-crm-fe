/** Row of GET /api/calls/ (GlobalCallSerializer). */
export interface ApiGlobalCall {
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
  created_by_name?: string;
  created_at: string;
}

/** GET /api/calls/summary/ */
export interface CallsSummary {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  connected_calls: number;
  connect_rate: number;
  talk_time_seconds: number;
  avg_duration_seconds: number;
  per_day: { date: string; count: number }[];
  top_callers: { user_id: number | null; name: string; calls: number; talk_time_seconds: number }[];
}

export type CallQueryParams = Record<string, string | number | undefined>;
