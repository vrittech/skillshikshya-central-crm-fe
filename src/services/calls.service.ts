import { api } from "@/lib/api";
import { nepalDate } from "@/lib/calls-filters";
import type { Paginated } from "@/types";
import type {
  CallFilters,
  CallListParams,
  CallSummary,
  GlobalCall,
} from "@/types/calls";

export const callsService = {
  async list(params: CallListParams, signal?: AbortSignal) {
    const { data } = await api.get<Paginated<GlobalCall>>("/calls/", {
      params,
      signal,
    });
    return data;
  },
  async summary(params: CallFilters, signal?: AbortSignal) {
    const { data } = await api.get<CallSummary>("/calls/summary/", {
      params,
      signal,
    });
    return data;
  },
  async exportCsv(params: Omit<CallListParams, "page" | "page_size">) {
    const response = await api.get<Blob>("/calls/export/", {
      params,
      responseType: "blob",
    });
    const filename =
      /filename="(calls-\d{4}-\d{2}-\d{2}\.csv)"/.exec(
        String(response.headers["content-disposition"] ?? ""),
      )?.[1] ?? `calls-${nepalDate()}.csv`;
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
