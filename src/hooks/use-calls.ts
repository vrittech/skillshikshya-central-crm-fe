import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { callsService } from "@/services/calls.service";
import type { CallsParams } from "@/types/calls";

export function useCalls(params: CallsParams) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
  });
}

export function useCallsSummary(params: CallsParams) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
  });
}

export function useExportCalls() {
  return useMutation({
    mutationFn: callsService.exportCsv,
    onError: (error) =>
      toast.error(apiErrorMessage(error, "Could not export calls. Please retry.")),
  });
}
