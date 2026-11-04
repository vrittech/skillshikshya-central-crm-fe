
import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  ApiCall,
  CallListParams,
  CallSummary,
} from "@/types/calls";

export const callsService = {
  async list(params: CallListParams = {}) {
    const { data } = await api.get<Paginated<ApiCall>>("/calls/", {
    
      params,
    });
    return data;
  },

  async summary(params: CallListParams = {}) {
    const { data } = await api.get<CallSummary>("/calls/summary/", {
      params,
    });
    return data;
  },

  async exportCsv(params: CallListParams = {}) {
    const { data } = await api.get("/calls/export/", {
      params,
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(data);
    const link = document.createElement("a");

    link.href = url;
    link.download = `calls-${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  },
};
