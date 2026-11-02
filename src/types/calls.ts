export type CallDirection = "inbound" | "outbound";

export interface ApiCallListRow {
  id: number;
  lead: number;
  lead_name: string;
  lead_reference_number?: string;
  call_timestamp: string;
  direction: CallDirection;
  caller: string | null;
  phone_number: string | null;
  duration_seconds: number;
  duration_formatted?: string;
  outcome: string | null;
  notes: string | null;
  recording_url: string | null;
  next_followup_at: string | null;
  next_action: string | null;
  branch?: number | null;
  branch_name?: string;
  created_by?: number | null;
  created_by_name?: string;
  created_at: string;
}

export interface ApiCallsPerDay {
  date: string;
  count: number;
}

export interface ApiTopCaller {
  caller: string;
  calls: number;
  seconds: number;
  duration_formatted?: string;
}

export interface ApiCallSummary {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  total_seconds: number;
  talk_time_formatted: string;
  avg_duration_seconds: number;
  avg_duration_formatted: string;
  connected_calls: number;
  connect_rate: number;
  calls_per_day: ApiCallsPerDay[];
  top_callers: ApiTopCaller[];
}

export interface CallRow {
  id: string;
  leadId?: string;
  leadName: string;
  leadReference?: string;
  phoneNumber?: string;
  callTimestamp: string;
  direction: CallDirection;
  caller: string;
  loggedBy: string;
  durationSeconds: number;
  durationFormatted: string;
  outcome?: string;
  notes?: string;
  recordingUrl?: string;
  nextFollowupAt?: string;
  nextAction?: string;
  branchId?: number;
  branchName?: string;
  createdById?: number;
  createdAt: string;
}

export interface CallListParams {
  page?: number;
  page_size?: number;
  search?: string;
  direction?: string;
  outcome?: string;
  created_by?: number | string;
  lead?: number | string;
  student?: number | string;
  call_timestamp__gte?: string;
  call_timestamp__lte?: string;
  ordering?: string;
  branch_id?: number | string;
}

export type DatePreset = "all" | "today" | "last_7_days" | "this_month" | "custom";

export interface CallsFilterState {
  search: string;
  direction: string;
  outcome: string;
  createdBy: string;
  datePreset: DatePreset;
  startDate: string;
  endDate: string;
  branchId: string;
  ordering: string;
  page: number;
}
