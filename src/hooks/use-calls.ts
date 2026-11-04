import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { callsService } from "@/services/calls.service";
import type { CallsParams } from "@/types/calls";

export function useCalls(params: CallsParams) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCallsSummary(params: CallsParams) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
    placeholderData: keepPreviousData,
  });
}