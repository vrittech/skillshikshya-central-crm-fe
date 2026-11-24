/**
 * Lead Reports API DTOs — see src/docs/be-mds/lead_app_reports_api_guide.md.
 * All endpoints are GET under /api/reports/ and read-only.
 */

export interface ReportDateRange {
  start_date: string | null;
  end_date: string | null;
}

/** Window + scoping shared by every report. */
export interface ReportBaseParams {
  /** YYYY-MM-DD */
  start_date?: string;
  /** YYYY-MM-DD */
  end_date?: string;
  /** Staff only — scope to one branch. */
  branch_id?: number;
}

/** Optional lead dimension filters accepted by lead-based reports. */
export interface LeadDimensionFilters {
  status?: number;
  source?: number;
  campaign?: number;
  lead_type?: number;
  priority?: number;
  assigned_counselor?: number;
  primary_course?: number;
  is_converted?: boolean;
  is_archived?: boolean;
}

export type ReportParams = ReportBaseParams & LeadDimensionFilters;

/* --------------------------------------------------------------- overview */

export interface OverviewReport {
  date_range: ReportDateRange;
  leads: {
    total: number;
    new_in_range: number;
    converted_total: number;
    converted_in_range: number;
    conversion_rate: number;
    archived: number;
    lost: number;
  };
  pipeline: {
    active_leads: number;
    expected_revenue: string;
  };
  enrollments: {
    total: number;
    revenue_collected: string;
  };
  students: number;
  communication: {
    calls: number;
    activities: number;
    followups: {
      pending: number;
      overdue: number;
      completed: number;
      missed: number;
    };
  };
}

/* --------------------------------------------- dimension breakdown reports */

export interface LeadsByStatusRow {
  status: number;
  status__name: string;
  status__color: string;
  count: number;
}

/**
 * Rows of source/type/branch/campaign/counselor breakdowns. The name lives
 * under the dimension key (e.g. `source__name`, `branch__name`).
 */
export type LeadsByNamedDimensionRow = {
  count: number;
} & Record<string, number | string | null>;

export interface DimensionReport<Row> {
  dimension: string;
  total: number;
  date_range: ReportDateRange;
  results: Row[];
}

/* ------------------------------------------------------------------ trend */

export type TrendGroupBy = "day" | "week" | "month";

export interface LeadTrendRow {
  period: string;
  leads: number;
  converted: number;
  revenue: string;
}

export interface LeadTrendReport {
  group_by: TrendGroupBy;
  date_range: ReportDateRange;
  results: LeadTrendRow[];
}

export interface LeadTrendParams extends ReportBaseParams {
  group_by?: TrendGroupBy;
}

/* ---------------------------------------------------------------- revenue */

export interface RevenueReport {
  date_range: ReportDateRange;
  summary: {
    total_collected: string;
    outstanding_to_collect: string;
    successful_payments: number;
  };
  by_payment_method: { payment_method: string; amount: string; count: number }[];
  by_branch: { branch__name: string; amount: string; count: number }[];
}

/* ------------------------------------------------------------ enrollments */

export type EnrollmentStatusFilter =
  | "pending"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "dropped_out"
  | "transferred";

export interface EnrollmentsReport {
  date_range: ReportDateRange;
  summary: {
    total_enrollments: number;
    total_listed_fee: string;
    total_agreed_amount: string;
    collected: string;
  };
  by_course: { course__name: string; count: number; agreed_total: string }[];
  by_status: { status: string; count: number }[];
}

export interface EnrollmentsReportParams extends ReportBaseParams {
  course?: number;
  enrollment_status?: EnrollmentStatusFilter;
}

/* ------------------------------------------------------------- conversion */

export interface ConversionReport {
  date_range: ReportDateRange;
  funnel: {
    total_leads: number;
    contacted: number;
    with_activity: number;
    interested: number;
    enrolled: number;
    converted: number;
    lost: number;
  };
  rates: {
    contacted_rate: number;
    with_activity_rate: number;
    interested_rate: number;
    enrolled_rate: number;
    converted_rate: number;
    lost_rate: number;
    conversion_rate: number;
  };
}

/* -------------------------------------------------- counselor performance */

export type CounselorSortBy =
  | "leads_assigned"
  | "converted"
  | "conversion_rate"
  | "calls"
  | "activities"
  | "enrollments"
  | "revenue_collected";

export interface CounselorPerformanceRow {
  counselor: { id: number; name: string; email: string };
  leads_assigned: number;
  converted: number;
  conversion_rate: number;
  calls: number;
  activities: number;
  followups_assigned: number;
  followups_completed: number;
  followups_pending: number;
  enrollments: number;
  revenue_collected: string;
}

export interface CounselorPerformanceReport {
  date_range: ReportDateRange;
  results: CounselorPerformanceRow[];
}

export interface CounselorPerformanceParams extends ReportBaseParams {
  sort_by?: CounselorSortBy;
}

/* ------------------------------------------------------------ money owed */

/** Who a dues row is about — shared by Who owes and Due in month. */
export interface DuesPerson {
  enrollment: number;
  lead: number;
  name: string;
  phone: string | null;
  student_id: string | null;
  course_name: string;
  /** The money batch. */
  batch?: number | null;
  batch_name: string | null;
  branch_name: string | null;
  /** The lead's counselor: the person who chases the money. */
  counselor?: number | null;
  counselor_name?: string | null;
}

export interface WhoOwesRow extends DuesPerson {
  owed: string;
  late: string;
  /** Days since the oldest late part was due; 0 when nothing is late. */
  days_late: number;
  next_due_on: string | null;
  next_due_amount: string | null;
}

export interface WhoOwesReport {
  as_of: string;
  summary: {
    students: number;
    total_owed: string;
    total_late: string;
    not_late: string;
    days_1_30: string;
    days_31_60: string;
    days_61_90: string;
    over_90: string;
  };
  /** Rows added up per counselor; counselor null = nobody assigned. */
  by_counselor?: (OwedGroup & { counselor: number | null; counselor_name: string | null })[];
  /** Rows added up per money batch; batch null = no batch. */
  by_batch?: (OwedGroup & { batch: number | null; batch_name: string | null })[];
  results: WhoOwesRow[];
  error?: string;
}

/** Who owes, added up for one counselor or one batch. */
export interface OwedGroup {
  students: number;
  owed: string;
  late: string;
  /** The longest any of them is late, in days. */
  days_late: number;
}

export interface WhoOwesParams {
  branch_id?: number;
  course?: number;
  batch?: number;
  /** A counselor id, or "none" for students with nobody assigned. */
  counselor?: number | "none";
  late_only?: boolean;
}

export interface DueInMonthRow extends DuesPerson {
  kind: "part" | "extra_charge";
  due_on: string;
  amount: string;
  paid: string;
  left: string;
}

export interface DueInMonthReport {
  month: string;
  start_date: string;
  end_date: string;
  summary: { total_due: string; parts: number; students: number };
  results: DueInMonthRow[];
  error?: string;
}

export interface DueInMonthParams {
  branch_id?: number;
  /** YYYY-MM; next month when left out. */
  month?: string;
  course?: number;
  batch?: number;
}

/* ------------------------------------------------------------ batch profit */

/** Money of a batch, counted on the batch the student first joined. */
export interface BatchProfitFigures {
  students: number;
  fees: string;
  collected: string;
  owed: string;
  costs: string;
  profit: string;
}

export interface BatchProfitRow extends BatchProfitFigures {
  batch: number;
  coursebatch_id: string;
  name: string;
  course_name: string;
  status: "upcoming" | "running" | "closed";
  status_display: string;
  start_date: string | null;
  end_date: string | null;
  /** Closed batches only. */
  closed_at: string | null;
  at_close: BatchProfitFigures | null;
}

export interface BatchProfitReport {
  summary: BatchProfitFigures & { batches: number };
  results: BatchProfitRow[];
  error?: string;
}

export interface BatchProfitParams {
  branch_id?: number;
  course?: number;
  status?: "upcoming" | "running" | "closed";
  /** Batches that start on or after this day, YYYY-MM-DD. */
  start_date?: string;
  /** Batches that start on or before this day, YYYY-MM-DD. */
  end_date?: string;
}

export interface EnquiryFunnelParams extends ReportBaseParams {
  course?: number;
  source?: number;
  counselor?: number;
}

export interface EnquiryFunnelStage {
  stage: "new" | "contacted" | "interested" | "won";
  label: string;
  reached: number;
  reached_rate: number;
  open: number;
  lost: number;
  lost_rate: number;
}

export interface EnquiryBreakdownRow {
  id: number | null;
  name: string;
  enquiries: number;
  won: number;
  lost: number;
  open: number;
  win_rate: number;
}

/** Where enquiries die: reached per stage, where the lost ones stopped and why. */
export interface EnquiryFunnelReport {
  summary: {
    enquiries: number;
    won: number;
    lost: number;
    open: number;
    stale: number;
    stale_days: number;
    win_rate: number;
  };
  funnel: EnquiryFunnelStage[];
  lost_by_reason: { reason: string; label: string; count: number; rate: number }[];
  by_course: EnquiryBreakdownRow[];
  by_source: EnquiryBreakdownRow[];
  by_counselor: EnquiryBreakdownRow[];
  error?: string;
}

