import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { callsService } from "@/services/calls.service";
import type { CallListParams } from "@/types/calls";

/** Shared staleTime — call aggregates don't need to be real-time. */
const STALE = 5 * 60 * 1000;

function formatDurationSeconds(sec: number): string {
  if (!Number.isFinite(sec)) return "—";
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = Math.round(sec % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

/** Paginated calls list — GET /calls/. Shared filter params via CallListParams. */
export function useCalls(params?: CallListParams) {
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}

/** Summary statistics — GET /calls/summary/. Reads the same active filters as the list (minus pagination). */
export function useCallsSummary(params?: CallListParams) {
  const { page, page_size, ...filters } = params ?? {};
  void page;
  void page_size;

  return useQuery({
    queryKey: ["calls", "summary", filters],
    queryFn: () => callsService.summary(filters),
    staleTime: STALE,
  });
}

/** Single call detail — GET /calls/{id}/. */
export function useCallDetail(id: number | null) {
  return useQuery({
    queryKey: ["calls", "detail", id],
    queryFn: () => callsService.detail(id as number),
    enabled: id != null,
    staleTime: STALE,
  });
}

/** Utility: trigger a CSV download from a Blob. */
export async function downloadCallCsv(params?: CallListParams) {
  const blob = await callsService.exportCsv(params);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "calls.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useExportCsv() {
  return {
    action: downloadCallCsv,
    failure: (e: unknown) =>
      toast.error(apiErrorMessage(e, "Failed to export calls")),
  };
}