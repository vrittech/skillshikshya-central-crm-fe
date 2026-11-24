import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { callsService } from "@/services/calls.service";
import type { CallFilterParams, CallListParams } from "@/types/calls";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { nepalToday } from "@/lib/call-dates";
import { saveBlob } from "@/lib/download";

export function useCalls(params: CallListParams) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCallSummary(params: CallFilterParams) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
    placeholderData: keepPreviousData,
  });
}

export function useExportCalls() {
  return useMutation({
    mutationFn: async (params: CallFilterParams) => {
      const blob = await callsService.exportCsv(params);
      saveBlob(blob, `calls-${nepalToday()}.csv`);
    },
    onSuccess: () => toast.success("Calls exported"),
    onError: (e) => toast.error(apiErrorMessage(e, "Export failed")),
  });
}
