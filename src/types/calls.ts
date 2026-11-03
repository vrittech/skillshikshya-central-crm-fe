export type CallDirection = "inbound" | "outbound";

export interface CallRow {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string;
  call_timestamp: string;
  direction: CallDirection;
  caller: string | null;
  phone_number: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  notes: string | null;
  recording_url: string | null;
  branch: number | null;
  created_by: number | null;
  created_by_name: string | null;
}

/** Query params shared by the list, summary and export endpoints. */
export interface CallsFilterParams {
  search?: string;
  direction?: CallDirection;
  created_by?: number;
  branch_id?: number;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
}

export interface CallsListParams extends CallsFilterParams {
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface CallsSummary {
  total_calls: number;
  inbound: number;
  outbound: number;
  talk_seconds: number;
  average_seconds: number;
  connected_calls: number;
  connect_rate: number;
  calls_per_day: { date: string; count: number }[];
  top_callers: { caller: string; calls: number; talk_seconds: number }[];
}
