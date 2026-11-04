/** Global call log. See lead_app_calls_api_guide.md §Global Call Log, §Call Summary and §Call Export. */

export type CallDirection = "inbound" | "outbound";

/** One row of GET /calls/. */
export interface GlobalCall {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string;
  call_timestamp: string;
  direction: CallDirection;
  /** Free-text name of who made the call. */
  caller: string;
  phone_number: string;
  duration_seconds: number;
  outcome: string | null;
  notes: string | null;
  recording_url: string | null;
  next_followup_at: string | null;
  next_action: string | null;
  branch: number | null;
  /** Shown as "Logged by". */
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

/** Filters shared by list, summary and export. Dates are Nepal calendar days (YYYY-MM-DD). */
export interface CallFilterParams {
  search?: string;
  direction?: CallDirection;
  created_by?: number;
  branch_id?: number;
  date_from?: string;
  date_to?: string;
  ordering?: string;
}

export interface CallListParams extends CallFilterParams {
  page?: number;
  page_size?: number;
}

/** GET /calls/summary/ */
export interface CallsSummary {
  total_calls: number;
  inbound: number;
  outbound: number;
  total_seconds: number;
  average_seconds: number;
  connected: number;
  /** Percentage of all calls with duration > 0, one decimal. */
  connect_rate: number;
  calls_per_day: { date: string; count: number }[];
  top_callers: { user_id: number; name: string; count: number }[];
}
