
import { api } from "@/lib/api";
import type {
  CallsListResponse,
  CallsParams,
  CallsSummary,
} from "@/types/calls";

function clean(params: object) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}

export const callsService = {
  list(params: CallsParams = {}) {
    return api
      .get<CallsListResponse>("/calls/", { params: clean(params) })
      .then((response) => response.data);
  },

  summary(params: CallsParams = {}) {
    return api
      .get<CallsSummary>("/calls/summary/", {
        params: clean(params),
      })
      .then((response) => response.data);
  },

  async export(params: CallsParams = {}) {
    const response = await api.get<Blob>("/calls/export/", {
      params: clean(params),
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");

    link.href = url;
    link.download = "calls.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  },
};
