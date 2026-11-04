import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { callsService } from "@/services/calls.service";
import type { GlobalCallParams } from "@/types/calls-api";

const STALE = 60 * 1000;

export function useGlobalCalls(params: GlobalCallParams, enabled = true) {
  return useQuery({
    queryKey: ["global-calls", "list", params],
    queryFn: () => callsService.list(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useCallsSummary(params: GlobalCallParams, enabled = true) {
  return useQuery({
    queryKey: ["global-calls", "summary", params],
    queryFn: () => callsService.summary(params),
    enabled,
    staleTime: STALE,
  });
}