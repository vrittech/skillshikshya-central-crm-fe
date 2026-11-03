
import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  Call,
  CallsParams,
  CallSummary,
} from "@/types/calls";

export const callsService = {
  // Retrieve paginated calls.
  async list(params: CallsParams = {}) {
    const { data } = await api.get<Paginated<Call>>(
      "/calls/",
      { params },
    );

    return data;
  },

  // Retrieve summary cards, daily calls and top callers.
  async summary(params: CallsParams = {}) {
    const { data } = await api.get<CallSummary>(
      "/calls/summary/",
      { params },
    );

    return data;
  },

  async exportCsv(params: Omit<CallsParams, "page" | "page_size" | "ordering"> = {}) {
    const { data } = await api.get<Blob>("/calls/export/", {
      params,
      responseType: "blob",
    });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "calls.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  },
};
