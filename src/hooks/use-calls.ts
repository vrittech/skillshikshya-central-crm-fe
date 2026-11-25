
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { callsService } from "@/services/calls.service";

import type { CallsParams } from "@/types/calls";

const STALE = 60 * 1000;

export function useCalls(params: CallsParams, enabled = true) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE,
  });
}

export function useCallsSummary(params: CallsParams, enabled = true) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
    enabled,
    staleTime: STALE,
  });
}
