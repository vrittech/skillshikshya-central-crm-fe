import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { callsService, type CallsParams } from "@/services/calls.service";

export function useCalls(params: CallsParams) {
  return useQuery({
    queryKey: ["calls", params],
    queryFn: () => callsService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCallsSummary(params: Omit<CallsParams, "page" | "page_size" | "ordering">) {
  return useQuery({
    queryKey: ["calls-summary", params],
    queryFn: () => callsService.summary(params),
  });
}
