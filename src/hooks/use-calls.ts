import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { callsService } from "@/services/calls.service";
import type { CallsFilterParams, CallsListParams } from "@/types/calls";

export function useCalls(params: CallsListParams = {}) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCallSummary(params: CallsFilterParams = {}) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
  });
}

export function useExportCalls() {
  return useMutation({
    mutationFn: (params: CallsFilterParams = {}) => callsService.export(params),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Could not export calls")),
  });
}
