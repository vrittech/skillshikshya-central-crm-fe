import { useQuery } from "@tanstack/react-query";
import { callsService } from "@/services/calls.service";
import type { CallsParams } from "@/types/calls";
import { keepPreviousData } from "@tanstack/react-query";

export function useCallSummary(params: CallsParams = {}) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
    staleTime: 30 * 1000,
  });
}

export function useCalls(params: CallsParams = {}) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}