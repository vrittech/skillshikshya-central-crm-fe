export type CallDirection = "inbound" | "outbound";

/** A row of GET /api/calls/. */
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
  /** Left out by the backend when the call has no created_by. */
  created_by_name?: string;
  created_at: string;
}

/** Filters shared by the list, summary and export, so all three agree. */
export interface CallFilterParams {
  search?: string;
  direction?: CallDirection;
  created_by?: number;
  branch_id?: number;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
}

export interface CallListParams extends CallFilterParams {
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface CallSummaryDay {
  date: string;
  calls: number;
  seconds: number;
}

export interface CallSummaryUser {
  user_id: number | null;
  name: string;
  calls: number;
  seconds: number;
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
  connect_rate: number;
  by_day: CallSummaryDay[];
  by_user: CallSummaryUser[];
}
