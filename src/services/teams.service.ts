import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { ApiTeamsLicence, ApiTeamsLicenceParams, ApiTeamsSummary } from "@/types/leads-api";

/** Microsoft Teams licences given to students. */
export const teamsService = {
  async list(params: ApiTeamsLicenceParams = {}) {
    const { data } = await api.get<Paginated<ApiTeamsLicence>>("/teams-licences/", { params });
    return data;
  },

  async summary() {
    const { data } = await api.get<ApiTeamsSummary>("/teams-licences/summary/");
    return data;
  },

  async give(enrollment: number, account: string) {
    const { data } = await api.post<ApiTeamsLicence>("/teams-licences/", { enrollment, account });
    return data;
  },

  async free(id: number, reason: string) {
    const { data } = await api.post<ApiTeamsLicence>(`/teams-licences/${id}/free/`, { reason });
    return data;
  },
};
