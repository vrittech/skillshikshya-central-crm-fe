import { useMutation, useQuery } from "@tanstack/react-query";
import { callsService } from "@/services/calls.service";
import type { CallListParams, CallSummaryParams } from "@/types/leads-api";

export function useCallsList(params: CallListParams) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
  });
}

export function useCallsSummary(params: CallSummaryParams = {}, enabled = true) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
    staleTime: 30_000,
    enabled,
  });
}

export function useExportCalls() {
  return useMutation({
    mutationFn: (params: CallSummaryParams = {}) => callsService.exportCsv(params),
  });
}
