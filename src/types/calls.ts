/**
 * Calls API DTOs — see src/docs/be-mds/lead_app_calls_api_guide.md §Calls.
 * All endpoints are read-only GET under /api/calls/.
 */

export type CallDirection = "inbound" | "outbound";

/** Shared filter params for lists, passed to every calls endpoint that accepts them. */
export interface CallListParams {
  page?: number;
  page_size?: number;
  search?: string;
  direction?: CallDirection;
  outcome?: string;
  lead?: number;
  caller?: string;
  notes?: string;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
  created_by?: number;
  student?: number;
  ordering?: string;
}

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
  outcome: string;
  notes: string;
  recording_url: string | null;
  next_followup_at: string | null;
  next_action: string | null;
  branch: number | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

/** GET /calls/summary/ — aggregate statistics over all matching calls. */
export interface CallsSummaryResponse {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  total_duration_seconds: number;
  average_duration_seconds: number;
}
