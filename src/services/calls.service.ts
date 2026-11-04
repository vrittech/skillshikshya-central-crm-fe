import { api } from "@/lib/api";
import type {
  CallListParams,
  CallListResponse,
  CallSummary,
  CallSummaryParams,
} from "@/types/leads-api";

export const callsService = {
  async list(params: CallListParams) {
    const { data } = await api.get<CallListResponse>("/calls/", { params });
    return data;
  },
  async summary(params: CallSummaryParams = {}) {
    const { data } = await api.get<CallSummary>("/calls/summary/", { params });
    return data;
  },
  async exportCsv(params: CallSummaryParams = {}) {
    const response = await api.get<Blob>("/calls/export-csv/", {
      params,
      responseType: "blob",
    });
    const contentDisposition = response.headers["content-disposition"];
    const filename = /filename="?([^";]+)"?/i.exec(contentDisposition ?? "")?.[1];
    const localDate = new Date();
    const fallbackFilename = `calls-${[
      localDate.getFullYear(),
      String(localDate.getMonth() + 1).padStart(2, "0"),
      String(localDate.getDate()).padStart(2, "0"),
    ].join("-")}.csv`;

    return {
      blob: response.data,
      filename: filename || fallbackFilename,
    };
  },
};
