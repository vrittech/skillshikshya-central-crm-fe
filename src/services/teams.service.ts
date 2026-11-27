import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  ApiTeamsAccount,
  ApiTeamsAccountParams,
  ApiTeamsLicence,
  ApiTeamsLicenceParams,
  ApiTeamsSummary,
} from "@/types/leads-api";

export interface GiveLicencePayload {
  enrollment: number;
  teams_account: number;
  /** Emailed to the student with the account when send_details is on. Not stored. */
  password?: string;
  send_details?: boolean;
}

/** Microsoft Teams accounts and the licences given to students. */
export const teamsService = {
  async licences(params: ApiTeamsLicenceParams = {}) {
    const { data } = await api.get<Paginated<ApiTeamsLicence>>("/teams-licences/", { params });
    return data;
  },

  async accounts(params: ApiTeamsAccountParams = {}) {
    const { data } = await api.get<ApiTeamsAccount[]>("/teams-accounts/", { params });
    return data;
  },

  async summary(params: { branch_id?: number } = {}) {
    const { data } = await api.get<ApiTeamsSummary>("/teams-accounts/summary/", { params });
    return data;
  },

  async addAccounts(emails: string[], branch: number | null) {
    const { data } = await api.post<{ added: string[]; existing: string[] }>("/teams-accounts/", {
      emails,
      branch,
    });
    return data;
  },

  async retire(id: number, reason: string) {
    const { data } = await api.post<ApiTeamsAccount>(`/teams-accounts/${id}/retire/`, { reason });
    return data;
  },

  async restore(id: number) {
    const { data } = await api.post<ApiTeamsAccount>(`/teams-accounts/${id}/restore/`);
    return data;
  },

  async give(payload: GiveLicencePayload) {
    const { data } = await api.post<ApiTeamsLicence>("/teams-licences/", payload);
    return data;
  },

  async sendDetails(id: number, password: string) {
    const { data } = await api.post<ApiTeamsLicence>(`/teams-licences/${id}/send-details/`, {
      password,
    });
    return data;
  },

  async free(id: number, reason: string) {
    const { data } = await api.post<ApiTeamsLicence>(`/teams-licences/${id}/free/`, { reason });
    return data;
  },
};
