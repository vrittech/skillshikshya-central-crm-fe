import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDataSource } from "@/context/data-source";
import { callsService, type GlobalCallParams } from "@/services/calls.service";

export function useGlobalCalls(params: GlobalCallParams, enabled = true) {
  const { source } = useDataSource();
  return useQuery({
    queryKey: ["calls", "list", params],
    queryFn: () => callsService.list(params),
    enabled: enabled && source === "api",
    placeholderData: keepPreviousData,
  });
}

export function useCallSummary(params: GlobalCallParams, enabled = true) {
  const { source } = useDataSource();
  return useQuery({
    queryKey: ["calls", "summary", params],
    queryFn: () => callsService.summary(params),
    enabled: enabled && source === "api",
    placeholderData: keepPreviousData,
  });
}
