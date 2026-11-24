import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { teamsService } from "@/services/teams.service";
import type { ApiTeamsLicenceParams } from "@/types/leads-api";

export function useTeamsLicences(params: ApiTeamsLicenceParams, enabled = true) {
  return useQuery({
    queryKey: ["teams", "list", params],
    queryFn: () => teamsService.list(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useTeamsSummary(enabled = true) {
  return useQuery({
    queryKey: ["teams", "summary"],
    queryFn: () => teamsService.summary(),
    enabled,
  });
}

/** Giving or freeing a licence changes the Teams page and the enrollment card. */
function refresh(qc: ReturnType<typeof useQueryClient>) {
  for (const key of ["teams", "lead", "enrollments"]) {
    void qc.invalidateQueries({ queryKey: [key] });
  }
}

export function useGiveLicence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollment, account }: { enrollment: number; account: string }) =>
      teamsService.give(enrollment, account),
    onSuccess: (licence) => {
      toast.success("Teams licence given", { description: licence.account });
      refresh(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not give the licence")),
  });
}

export function useFreeLicence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => teamsService.free(id, reason),
    onSuccess: (licence) => {
      toast.success("Teams licence freed", { description: licence.account });
      refresh(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not free the licence")),
  });
}
