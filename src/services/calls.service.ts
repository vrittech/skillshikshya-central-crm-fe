import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  CallListParams,
  CallRecord,
  CallSummary,
  CallSummaryParams,
} from "@/types/calls";

export const callsService = {
  async list(params: CallListParams = {}) {
    const { data } = await api.get<Paginated<CallRecord>>("/calls/", { params });
    return data;
  },

  async summary(params: CallSummaryParams = {}) {
    const { data } = await api.get<CallSummary>("/calls/summary/", { params });
    return data;
  },

  async exportCsv(params: CallSummaryParams = {}) {
    const { data } = await api.get<Blob>("/calls/export/", {
      params,
      responseType: "blob",
    });

    const dateParts = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Kathmandu",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const datePart = (type: string) =>
      dateParts.find((part) => part.type === type)?.value ?? "";

    const filename = `calls-${datePart("year")}-${datePart("month")}-${datePart("day")}.csv`;
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },
};