import { api } from "@/lib/api";
import type {
  CallListParams,
  CallListResponse,
  CallSummary,
  CallSummaryParams,
} from "@/types/calls";

export const callsService = {
  async list(params: CallListParams = {}) {
    const { data } = await api.get<CallListResponse>("/calls/", { params });
    return data;
  },

  async summary(params: CallSummaryParams = {}) {
    const { data } = await api.get<CallSummary>("/calls/summary/", { params });
    return data;
  },

  async exportCsv(params: Omit<CallListParams, "page" | "page_size"> = {}) {
    const { data, headers } = await api.get<Blob>("/calls/export/", {
      params,
      responseType: "blob",
    });
    const disposition = headers["content-disposition"];
    const filename = /filename="?([^";]+)"?/i.exec(disposition ?? "")?.[1];
    if (!filename) {
      throw new Error("The calls export response did not include a filename.");
    }

    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
