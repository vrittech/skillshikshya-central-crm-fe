import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { callsService } from "@/services/calls.service";
import type { CallParams } from "@/types/calls";

export function useCalls(params: CallParams, enabled = true) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}
