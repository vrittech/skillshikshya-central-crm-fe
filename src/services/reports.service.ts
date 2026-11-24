import { api } from "@/lib/api";
import type {
  BatchProfitParams,
  BatchProfitReport,
  ConversionReport,
  CounselorPerformanceParams,
  CounselorPerformanceReport,
  DimensionReport,
  DueInMonthParams,
  DueInMonthReport,
  EnrollmentsReport,
  EnrollmentsReportParams,
  LeadTrendParams,
  LeadTrendReport,
  LeadsByNamedDimensionRow,
  LeadsByStatusRow,
  OverviewReport,
  ReportBaseParams,
  RevenueReport,
  WhoOwesParams,
  WhoOwesReport,
} from "@/types/reports-api";

/** Serializes report params, dropping empty values. */
function clean(params: object) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

export const reportsService = {
  /** Each batch's fees, collected, owed, costs and profit, newest first. */
  async batchProfit(params: BatchProfitParams) {
    const { data } = await api.get<BatchProfitReport>("/reports/batch-profit/", {
      params: clean(params),
    });
    return data;
  },
  /** Every student who owes money, most late first. */
  async whoOwes(params: WhoOwesParams) {
    const { data } = await api.get<WhoOwesReport>("/reports/who-owes/", { params: clean(params) });
    return data;
  },
  /** Unpaid parts due in a month (next month by default). */
  async dueInMonth(params: DueInMonthParams) {
    const { data } = await api.get<DueInMonthReport>("/reports/due-in-month/", {
      params: clean(params),
    });
    return data;
  },
  async names() {
    const { data } = await api.get<{ available_reports: string[] }>("/reports/");
    return data.available_reports;
  },

  overview(params: ReportBaseParams = {}) {
    return api.get<OverviewReport>("/reports/overview/", { params: clean(params) }).then((r) => r.data);
  },

  byStatus(params: ReportBaseParams = {}) {
    return api
      .get<DimensionReport<LeadsByStatusRow>>("/reports/leads-by-status/", { params: clean(params) })
      .then((r) => r.data);
  },

  bySource(params: ReportBaseParams = {}) {
    return api
      .get<DimensionReport<LeadsByNamedDimensionRow>>("/reports/leads-by-source/", {
        params: clean(params),
      })
      .then((r) => r.data);
  },

  byType(params: ReportBaseParams = {}) {
    return api
      .get<DimensionReport<LeadsByNamedDimensionRow>>("/reports/leads-by-type/", {
        params: clean(params),
      })
      .then((r) => r.data);
  },

  byBranch(params: ReportBaseParams = {}) {
    return api
      .get<DimensionReport<LeadsByNamedDimensionRow>>("/reports/leads-by-branch/", {
        params: clean(params),
      })
      .then((r) => r.data);
  },

  byCampaign(params: ReportBaseParams = {}) {
    return api
      .get<DimensionReport<LeadsByNamedDimensionRow>>("/reports/leads-by-campaign/", {
        params: clean(params),
      })
      .then((r) => r.data);
  },

  byCounselor(params: ReportBaseParams = {}) {
    return api
      .get<DimensionReport<LeadsByNamedDimensionRow>>("/reports/leads-by-counselor/", {
        params: clean(params),
      })
      .then((r) => r.data);
  },

  leadTrend(params: LeadTrendParams = {}) {
    return api.get<LeadTrendReport>("/reports/lead-trend/", { params: clean(params) }).then((r) => r.data);
  },

  revenue(params: ReportBaseParams = {}) {
    return api.get<RevenueReport>("/reports/revenue/", { params: clean(params) }).then((r) => r.data);
  },

  enrollments(params: EnrollmentsReportParams = {}) {
    return api
      .get<EnrollmentsReport>("/reports/enrollments/", { params: clean(params) })
      .then((r) => r.data);
  },

  conversion(params: ReportBaseParams = {}) {
    return api.get<ConversionReport>("/reports/conversion/", { params: clean(params) }).then((r) => r.data);
  },

  counselorPerformance(params: CounselorPerformanceParams = {}) {
    return api
      .get<CounselorPerformanceReport>("/reports/counselor-performance/", { params: clean(params) })
      .then((r) => r.data);
  },
};
