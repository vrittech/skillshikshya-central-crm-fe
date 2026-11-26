import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { groupsService } from "@/services/groups.service";
import { permissionsService } from "@/services/permissions.service";

/** Roles list (role picker, counselor list). Anyone signed in may read it; only admins change it. */
export function useGroups(enabled = true) {
  return useQuery({
    queryKey: ["groups"],
    queryFn: () => groupsService.list({ page_size: 100 }),
    enabled,
    retry: false,
  });
}

export function usePermissions(enabled = true) {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsService.listAll(),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; permissions: number[] }) =>
      groupsService.create(payload),
    onSuccess: (g) => {
      toast.success(`Role "${g.name}" created`);
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create role")),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<{ name: string; permissions: number[] }>;
    }) => groupsService.update(id, payload),
    onSuccess: (g) => {
      toast.success(`Role "${g.name}" updated`);
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update role")),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => groupsService.remove(id),
    onSuccess: () => {
      toast.success("Role deleted");
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete role")),
  });
}
