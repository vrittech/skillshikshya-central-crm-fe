/** One call from the calls log (GET /api/calls/). */
export interface ApiCall {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string | null;
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
  created_at: string;
}

export interface CallsFilters {
  search?: string;
  direction?: "inbound" | "outbound";
  outcome?: string;
  /** Who logged the call (user id). */
  created_by?: number;
  /** Whole days, YYYY-MM-DD. */
  date_from?: string;
  date_to?: string;
  /** Staff only. */
  branch_id?: number;
}

export interface CallsParams extends CallsFilters {
  page?: number;
  page_size?: number;
}

/** GET /api/calls/summary/ — totals for the same filters. */
export interface CallsSummary {
  calls: number;
  leads: number;
  talk_seconds: number;
  average_seconds: number;
  inbound: number;
  outbound: number;
}
