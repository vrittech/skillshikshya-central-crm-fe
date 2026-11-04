import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { callsService } from "@/services/calls.service";
import type { CallFilterParams, CallListParams } from "@/types/calls";

/** Paginated call log (GET /api/calls/). */
export function useCalls(params: CallListParams) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    placeholderData: keepPreviousData,
  });
}

/** Totals for the same filters as the list (GET /api/calls/summary/). */
export function useCallSummary(params: CallFilterParams) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
    placeholderData: keepPreviousData,
  });
}

/** Save a blob to disk through a temporary object URL. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Download the filtered calls as CSV. */
export function useExportCalls() {
  return useMutation({
    mutationFn: async (params: CallFilterParams) => {
      const { blob, filename } = await callsService.exportCsv(params);
      saveBlob(blob, filename);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not export calls")),
  });
}