import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";
import { apiErrorMessage } from "@/lib/api";
import { callsService } from "@/services/calls.service";
import type { CallFilters, CallListParams } from "@/types/calls";

export function useCalls(params: CallListParams, enabled = true) {
  const { user } = useAuth();
  const scope = `${user?.id}:${user?.branch}:${user?.is_staff}:${user?.is_superuser}`;
  return useQuery({
    queryKey: ["calls", "list", scope, params],
    queryFn: ({ signal }) => callsService.list(params, signal),
    enabled,
    placeholderData: (data, query) =>
      query?.queryKey[2] === scope ? keepPreviousData(data) : undefined,
  });
}

export function useCallSummary(params: CallFilters, enabled = true) {
  const { user } = useAuth();
  const scope = `${user?.id}:${user?.branch}:${user?.is_staff}:${user?.is_superuser}`;
  return useQuery({
    queryKey: ["calls", "summary", scope, params],
    queryFn: ({ signal }) => callsService.summary(params, signal),
    enabled,
    placeholderData: (data, query) =>
      query?.queryKey[2] === scope ? keepPreviousData(data) : undefined,
  });
}

export function useExportCalls() {
  return useMutation({
    mutationFn: (params: Omit<CallListParams, "page" | "page_size">) =>
      callsService.exportCsv(params),
    onError: (error) =>
      toast.error(
        apiErrorMessage(error, "Could not export calls. Please try again."),
      ),
  });
}
