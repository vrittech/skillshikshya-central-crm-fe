import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDataSource } from "@/context/data-source";
import { apiErrorMessage } from "@/lib/api";
import { callsService } from "@/services/calls.service";
import type { CallFilterParams, CallListParams } from "@/types/calls";

// Every key starts with "calls", so invalidateQueries(["calls"]) in
// useAddCall refreshes the list and the summary after a call is logged.

export function useCalls(params: CallListParams) {
  const { source } = useDataSource();
  const enabled = source === "api";
  const query = useQuery({
    queryKey: ["calls", "list", params],
    enabled,
    queryFn: () => callsService.list(params),
    placeholderData: keepPreviousData,
  });
  return {
    calls: query.data?.results ?? [],
    count: query.data?.count ?? 0,
    isLoading: enabled && query.isLoading,
    isFetching: enabled && query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useCallsSummary(params: CallFilterParams) {
  const { source } = useDataSource();
  const enabled = source === "api";
  const query = useQuery({
    queryKey: ["calls", "summary", params],
    enabled,
    queryFn: () => callsService.summary(params),
    placeholderData: keepPreviousData,
  });
  return {
    summary: query.data,
    isLoading: enabled && query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useExportCalls() {
  return useMutation({
    mutationFn: (params: CallFilterParams) => callsService.exportCsv(params),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not export calls")),
  });
}