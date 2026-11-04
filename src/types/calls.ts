export type CallDirection = "inbound" | "outbound";

/** One row of GET /api/calls/ (GlobalCallSerializer). */
export interface CallRow {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string;
  /** ISO 8601, UTC. */
  call_timestamp: string;
  direction: CallDirection;
  caller: string | null;
  phone_number: string | null;
  duration_seconds: number | null;
  /** "MM:SS", built by the backend. */
  duration_formatted: string;
  outcome: string | null;
  notes: string | null;
  recording_url: string | null;
  next_followup_at: string | null;
  next_action: string | null;
  branch: number | null;
  created_by: number | null;
  /** Left out by the backend when the call has no creator. */
  created_by_name?: string;
  created_at: string;
}

/** Filters shared by the list, the summary and the CSV export. */
export interface CallFilterParams {
  search?: string;
  direction?: CallDirection;
  /** User id of whoever logged the call. */
  created_by?: number;
  /** Staff only: narrow to one branch. Ignored for non-staff users. */
  branch_id?: number;
  /** ISO strings with a timezone offset. */
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
}

/** Query params for GET /api/calls/. */
export interface CallListParams extends CallFilterParams {
  page?: number;
  page_size?: number;
  /** call_timestamp, duration_seconds or created_at, with "-" for descending. */
  ordering?: string;
}

/** GET /api/calls/summary/ */
export interface CallSummary {
  total_calls: number;
  inbound: number;
  outbound: number;
  total_seconds: number;
  /** "HH:MM:SS" */
  total_formatted: string;
  avg_seconds: number;
  connected_calls: number;
  /** 0 to 1 */
  connect_rate: number;
  /** Oldest first. Days are counted in Nepal time. */
  by_day: { date: string; calls: number; seconds: number }[];
  /** Top 10 callers by number of calls. user_id is null when there is no creator. */
  by_user: { user_id: number | null; name: string; calls: number; seconds: number }[];
}