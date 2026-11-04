import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { callsService } from "@/services/calls.service";
import type { CallFilterParams, CallListParams } from "@/types/calls";

export function useCalls(params: CallListParams) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    placeholderData: keepPreviousData,
  });
}

/** Totals for the same filters as the table (no page or ordering). */
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
      const { blob, filename } = await callsService.exportCsv(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not export calls")),
  });
}