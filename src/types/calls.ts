export type CallDirection = "inbound" | "outbound";

export interface CallRecord {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string;
  call_timestamp: string;
  direction: CallDirection;
  caller: string;
  phone_number: string | null;
  duration_seconds: number;
  duration_formatted: string;
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

export interface CallListParams {
  page?: number;
  page_size?: number;
  search?: string;
  direction?: CallDirection;
  created_by?: number;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
  ordering?: string;
  branch_id?: number;
}