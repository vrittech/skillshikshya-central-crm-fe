import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { CallsParams, CallsSummary, GlobalCall } from "@/types/calls";

export const callsService = {
  async list(params: CallsParams) {
    return (await api.get<Paginated<GlobalCall>>("/calls/", { params })).data;
  },
  async summary(params: CallsParams) {
    return (await api.get<CallsSummary>("/calls/summary/", { params })).data;
  },
  async exportCsv(params: CallsParams) {
    const response = await api.get<Blob>("/calls/export_csv/", { params, responseType: "blob" });
    const filename =
      /filename="([^"]+)"/.exec(response.headers["content-disposition"] ?? "")?.[1] ?? "calls.csv";
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
