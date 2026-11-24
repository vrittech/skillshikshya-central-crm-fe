import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsService } from "@/services/reports.service";
import type {
  CounselorPerformanceParams,
  DueInMonthParams,
  EnrollmentsReportParams,
  LeadTrendParams,
  ReportBaseParams,
  WhoOwesParams,
} from "@/types/reports-api";

/** Shared staleTime — report aggregates don't need to be real-time. */
const STALE = 5 * 60 * 1000;

export function useReportsOverview(params: ReportBaseParams, enabled = true) {
  return useQuery({
    queryKey: ["reports", "overview", params],
    queryFn: () => reportsService.overview(params),
    enabled,
    staleTime: STALE,
  });
}

export function useLeadsByStatus(params: ReportBaseParams, enabled = true) {
  return useQuery({
    queryKey: ["reports", "by-status", params],
    queryFn: () => reportsService.byStatus(params),
    enabled,
    staleTime: STALE,
  });
}

export function useLeadsBySource(params: ReportBaseParams, enabled = true) {
  return useQuery({
    queryKey: ["reports", "by-source", params],
    queryFn: () => reportsService.bySource(params),
    enabled,
    staleTime: STALE,
  });
}

export function useLeadsByType(params: ReportBaseParams, enabled = true) {
  return useQuery({
    queryKey: ["reports", "by-type", params],
    queryFn: () => reportsService.byType(params),
    enabled,
    staleTime: STALE,
  });
}

export function useLeadTrend(params: LeadTrendParams, enabled = true) {
  return useQuery({
    queryKey: ["reports", "trend", params],
    queryFn: () => reportsService.leadTrend(params),
    enabled,
    staleTime: STALE,
  });
}

export function useConversionReport(params: ReportBaseParams, enabled = true) {
  return useQuery({
    queryKey: ["reports", "conversion", params],
    queryFn: () => reportsService.conversion(params),
    enabled,
    staleTime: STALE,
  });
}

export function useRevenueReport(params: ReportBaseParams, enabled = true) {
  return useQuery({
    queryKey: ["reports", "revenue", params],
    queryFn: () => reportsService.revenue(params),
    enabled,
    staleTime: STALE,
  });
}

export function useEnrollmentsReport(params: EnrollmentsReportParams, enabled = true) {
  return useQuery({
    queryKey: ["reports", "enrollments", params],
    queryFn: () => reportsService.enrollments(params),
    enabled,
    staleTime: STALE,
  });
}

export function useCounselorPerformance(params: CounselorPerformanceParams, enabled = true) {
  return useQuery({
    queryKey: ["reports", "counselor-performance", params],
    queryFn: () => reportsService.counselorPerformance(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useWhoOwes(params: WhoOwesParams, enabled = true) {
  return useQuery({
    queryKey: ["reports", "who-owes", params],
    queryFn: () => reportsService.whoOwes(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useDueInMonth(params: DueInMonthParams, enabled = true) {
  return useQuery({
    queryKey: ["reports", "due-in-month", params],
    queryFn: () => reportsService.dueInMonth(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}
