import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { callsService } from "@/services/calls.service";
import type { CallsFilterParams, CallsListParams } from "@/types/calls";

/** Table rows: one page, with the current filters and sort. */
export function useCalls(params: CallsListParams) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    placeholderData: keepPreviousData,
  });
}

/** Cards and charts: filters only, no paging or sorting. */
export function useCallsSummary(params: CallsFilterParams) {
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
    placeholderData: keepPreviousData,
  });
}

/** Today's date in Nepal time as YYYY-MM-DD (en-CA formats dates that way). */
function nepalToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date());
}

/** Downloads every filtered call as calls-YYYY-MM-DD.csv. */
export function useExportCalls() {
  return useMutation({
    mutationFn: (params: CallsFilterParams) => callsService.exportCsv(params),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calls-${nepalToday()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Export failed")),
  });
}
