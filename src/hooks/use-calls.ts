import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { callsService } from "@/services/calls.service";
import type { CallListParams, CallSummaryParams } from "@/types/calls";

export function useCallSummary(params: CallSummaryParams = {}) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
  });
}

export function useCalls(params: CallListParams = {}) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useExportCalls() {
  return useMutation({
    mutationFn: (params: Omit<CallListParams, "page" | "page_size">) =>
      callsService.exportCsv(params),
    onError: (error) => toast.error(apiErrorMessage(error, "Could not export calls.")),
  });
}
