import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { authService } from "@/services/auth.service";
import { usersService } from "@/services/users.service";
import { useGroups } from "@/hooks/use-groups";
import type { RegisterPayload, UpdateUserPayload } from "@/types";

export function useUsers(page: number, pageSize: number, search = "", branchId?: number) {
  return useQuery({
    queryKey: ["users", page, pageSize, search, branchId ?? null],
    queryFn: () =>
      usersService.list({
        page,
        page_size: pageSize,
        search: search || undefined,
        branch_id: branchId,
      }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Assignable counselors — active users in the "Counselor" role (Django group),
 * optionally scoped to a branch. Falls back to all active users if no group
 * named like "counselor" exists. Only meaningful on the live API path.
 */
export function useCounselors(search = "", branchId?: number, enabled = true) {
  const groups = useGroups(enabled);
  // Every role named like "counselor" ("Counselor", "Senior Counselor"…).
  // With none, anyone can be picked.
  const counselorGroups = (groups.data?.results ?? [])
    .filter((g) => /counsel/i.test(g.name))
    .map((g) => g.id)
    .join(",");
  return useQuery({
    queryKey: ["users", "counselors", search, branchId ?? null, counselorGroups],
    queryFn: () =>
      usersService.list({
        page: 1,
        page_size: 100,
        search: search || undefined,
        branch_id: branchId,
        group__in: counselorGroups || undefined,
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
