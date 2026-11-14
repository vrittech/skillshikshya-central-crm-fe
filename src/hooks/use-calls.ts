import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDataSource } from "@/context/data-source";
import { apiErrorMessage } from "@/lib/api";
import { callsService } from "@/services/calls.service";
import type { CallQueryParams } from "@/types/calls";

export function useCalls(params: CallQueryParams) {
  const { source } = useDataSource();
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    enabled: source === "api",
    placeholderData: keepPreviousData,
  });
}

export function useCallsSummary(params: CallQueryParams) {
  const { source } = useDataSource();
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
    enabled: source === "api",
    placeholderData: keepPreviousData,
  });
}

export function useExportCalls() {
  return useMutation({
    mutationFn: (params: CallQueryParams) => callsService.exportCsv(params),
    onError: (e) => toast.error(apiErrorMessage(e, "Export failed")),
  });
}
