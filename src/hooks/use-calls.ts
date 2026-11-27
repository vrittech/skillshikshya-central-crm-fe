import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { callsService } from "@/services/calls.service";
import type { CallsFilters, CallsParams } from "@/types/calls-api";

export function useCalls(params: CallsParams, enabled = true) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCallsSummary(params: CallsFilters, enabled = true) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}
