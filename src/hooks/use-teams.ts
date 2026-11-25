import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { type GiveLicencePayload, teamsService } from "@/services/teams.service";
import type {
  ApiTeamsAccountParams,
  ApiTeamsLicence,
  ApiTeamsLicenceParams,
} from "@/types/leads-api";

export function useTeamsLicences(params: ApiTeamsLicenceParams, enabled = true) {
  return useQuery({
    queryKey: ["teams", "licences", params],
    queryFn: () => teamsService.licences(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useTeamsAccounts(params: ApiTeamsAccountParams, enabled = true) {
  return useQuery({
    queryKey: ["teams", "accounts", params],
    queryFn: () => teamsService.accounts(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useTeamsSummary(params: { branch_id?: number } = {}, enabled = true) {
  return useQuery({
    queryKey: ["teams", "summary", params],
    queryFn: () => teamsService.summary(params),
    enabled,
  });
}

/** A Teams change shows on the Teams page and on the enrollment card. */
function refresh(qc: ReturnType<typeof useQueryClient>) {
  for (const key of ["teams", "lead", "enrollments"]) {
    void qc.invalidateQueries({ queryKey: [key] });
  }
}

/** Tells staff whether the sign-in email went. */
function emailToast(licence: ApiTeamsLicence) {
  const email = licence.email;
  if (!email) return;
  if (email.status === "sent") toast.success("Sign-in details sent", { description: email.to });
  else if (email.status === "skipped") toast.warning("Sign-in details not sent", { description: "No email address." });
  else toast.error("Sign-in details not sent", { description: email.error || undefined });
}

export function useGiveLicence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GiveLicencePayload) => teamsService.give(payload),
    onSuccess: (licence) => {
      toast.success("Teams licence given", { description: licence.account });
      emailToast(licence);
      refresh(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not give the licence")),
  });
}

export function useSendTeamsDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      teamsService.sendDetails(id, password),
    onSuccess: (licence) => {
      emailToast(licence);
      refresh(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not send the details")),
  });
}

export function useFreeLicence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => teamsService.free(id, reason),
    onSuccess: (licence) => {
      toast.success("Teams licence taken back", { description: licence.account });
      refresh(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not take the licence back")),
  });
}

export function useAddTeamsAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ emails, branch }: { emails: string[]; branch: number | null }) =>
      teamsService.addAccounts(emails, branch),
    onSuccess: ({ added, existing }) => {
      toast.success(`${added.length} account${added.length === 1 ? "" : "s"} added`, {
        description: existing.length ? `Already added: ${existing.join(", ")}` : undefined,
      });
      refresh(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not add the accounts")),
  });
}

export function useRetireTeamsAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => teamsService.retire(id, reason),
    onSuccess: (account) => {
      toast.success("Account retired", { description: account.email });
      refresh(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not retire the account")),
  });
}

export function useRestoreTeamsAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => teamsService.restore(id),
    onSuccess: (account) => {
      toast.success("Account restored", { description: account.email });
      refresh(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not restore the account")),
  });
}
