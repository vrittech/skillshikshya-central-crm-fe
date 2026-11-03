import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { callsService } from "@/services/calls.service";
import type {
  CallListParams,
  CallSummary,
  CallSummaryParams,
  PaginatedCalls,
} from "@/types/calls";

export function useCalls(params: CallListParams = {}) {
  return useQuery<PaginatedCalls>({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCallSummary(params: CallSummaryParams = {}) {
  return useQuery<CallSummary>({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
    placeholderData: keepPreviousData,
  });
}

export async function downloadCallsCsv(params: CallSummaryParams = {}): Promise<void> {
  const blob = await callsService.exportCsv(params);
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const filename = `calls-${y}-${m}-${d}.csv`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
