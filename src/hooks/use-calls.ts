import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { callsService } from "@/services/calls.service";
import type { CallListParams } from "@/types/calls";

export function useCalls(params: CallListParams) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    placeholderData: keepPreviousData,
  });
}