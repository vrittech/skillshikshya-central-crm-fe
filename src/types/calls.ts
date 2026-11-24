export type CallDirection = "inbound" | "outbound";

/** One row of GET /api/calls/ (GlobalCallSerializer). */
export interface ApiGlobalCall {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string;
  call_timestamp: string;
  direction: CallDirection;
  caller: number | string | null;
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
  /** Omitted by the API when the call has no created_by. */
  created_by_name?: string;
  created_at: string;
}

/** Filters shared by the list, the summary and the export. */
export interface CallFilterParams {
  search?: string;
  direction?: CallDirection;
  created_by?: number;
  /** Staff only: narrows to one branch. */
  branch_id?: number;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
}

export interface CallListParams extends CallFilterParams {
  page?: number;
  page_size?: number;
  /** e.g. "-call_timestamp", "duration_seconds". */
  ordering?: string;
}

/** GET /api/calls/summary/ */
export interface CallSummary {
  total_calls: number;
  inbound: number;
  outbound: number;
  total_seconds: number;
  total_formatted: string;
  avg_seconds: number;
  connected_calls: number;
  /** Fraction 0..1, not a percentage. */
  connect_rate: number;
  by_day: { date: string; calls: number; seconds: number }[];
  by_user: { user_id: number | null; name: string; calls: number; seconds: number }[];
}