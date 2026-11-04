export interface CallItem {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number: string;
  call_timestamp: string;
  direction: 'inbound' | 'outbound';
  caller: string;
  phone_number: string;
  duration_seconds: number;
  duration_formatted?: string;
  outcome: string;
  notes?: string;
  recording_url?: string | null;
  next_followup_at?: string | null;
  next_action?: string | null;
  branch?: number | null;
  created_by?: number | null;
  created_by_name?: string;
  created_at: string;
}

export interface CallSummaryByDay {
  date: string;
  calls: number;
  seconds: number;
}

export interface CallSummaryByUser {
  user_id: number | null;
  name: string;
  calls: number;
  seconds: number;
}

export interface CallSummaryResponse {
  total_calls: number;
  inbound: number;
  outbound: number;
  total_seconds: number;
  total_formatted: string;
  avg_seconds: number;
  connected_calls: number;
  connect_rate: number;
  by_day: CallSummaryByDay[];
  by_user: CallSummaryByUser[];
}

export interface CallFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  direction?: string;
  created_by?: string;
  outcome?: string;
  branch_id?: string;
  ordering?: string;
}