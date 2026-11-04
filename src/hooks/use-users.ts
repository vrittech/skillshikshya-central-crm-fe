import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { authService } from "@/services/auth.service";
import { usersService } from "@/services/users.service";
import { useGroups } from "@/hooks/use-groups";
import type { RegisterPayload, UpdateUserPayload, User } from "@/types";

export function useUsers(
  page: number,
  pageSize: number,
  search = "",
  branchId?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ["users", page, pageSize, search, branchId ?? null],
    queryFn: () =>
      usersService.list({
        page,
        page_size: pageSize,
        search: search || undefined,
        branch_id: branchId,
      }),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCallLogUsers(enabled = true) {
  return useQuery({
    queryKey: ["users", "call-log-options"],
    queryFn: async (): Promise<User[]> => {
      const pageSize = 100;
      const firstPage = await usersService.list({ page: 1, page_size: pageSize });
      const pageCount = Math.ceil(firstPage.count / pageSize);
      if (pageCount <= 1) return firstPage.results;

      const remainingPages = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) =>
          usersService.list({ page: index + 2, page_size: pageSize }),
        ),
      );
      return [...firstPage.results, ...remainingPages.flatMap((page) => page.results)];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Assignable counselors — active users in the "Counselor" role (Django group),
 * optionally scoped to a branch. Falls back to all active users if no group
 * named like "counselor" exists. Only meaningful on the live API path.
 */
export function useCounselors(search = "", branchId?: number, enabled = true) {
  const groups = useGroups(enabled);
  const counselorGroupId = groups.data?.results.find((g) => /counsel/i.test(g.name))?.id;
  return useQuery({
    queryKey: ["users", "counselors", search, branchId ?? null, counselorGroupId ?? null],
    queryFn: () =>
      usersService.list({
        page: 1,
        page_size: 100,
        search: search || undefined,
        branch_id: branchId,
        group: counselorGroupId,
        is_active: true,
      }),
    // Wait for groups so the role filter is applied on the first fetch.
    enabled: enabled && !groups.isLoading,
    placeholderData: keepPreviousData,
  });
}

export function useRegisterUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: (data) => {
      toast.success(`${data.user.name} registered`);
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Registration failed")),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) =>
      usersService.update(id, payload),
    onSuccess: (user) => {
      toast.success(`${user.name} updated`);
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Update failed")),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersService.remove(id),
    onSuccess: () => {
      toast.success("User deleted");
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Delete failed")),
  });
}
