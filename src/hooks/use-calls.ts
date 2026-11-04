import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { callsService } from '@/services/calls.service';
import type { CallFilterParams } from '@/types/calls';

export function useCalls(params: CallFilterParams) {
  return useQuery({
    queryKey: ['calls', 'list', params],
    queryFn: () => callsService.getCalls(params),
    placeholderData: keepPreviousData,
  });
}

export function useCallSummary(params: Omit<CallFilterParams, 'page' | 'page_size' | 'ordering'>) {
  return useQuery({
    queryKey: ['calls', 'summary', params],
    queryFn: () => callsService.getSummary(params),
    placeholderData: keepPreviousData,
  });
}