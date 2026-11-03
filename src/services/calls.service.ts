import { api } from "@/lib/api";
import type {
  CallsFilterParams,
  CallsListParams,
  CallsListResponse,
  CallsSummary,
} from "@/types/calls";

function fallbackExportFilename(): string {
  const today = new Date();
  const date = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return `calls-${date}.csv`;
}

function filenameFromContentDisposition(header: string | undefined): string | null {
  if (!header) return null;

  const encodedMatch = header.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  const regularMatch = header.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  const value = encodedMatch?.[1] ?? regularMatch?.[1] ?? regularMatch?.[2];
  if (!value) return null;

  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return null;
  if (encodedMatch) {
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export const callsService = {
  async list(params: CallsListParams = {}) {
    const { data } = await api.get<CallsListResponse>("/calls/", { params });
    return data;
  },

  async summary(params: CallsFilterParams = {}) {
    const { data } = await api.get<CallsSummary>("/calls/summary/", { params });
    return data;
  },

  async export(params: CallsFilterParams = {}) {
    const response = await api.get<Blob>("/calls/export/", {
      params,
      responseType: "blob",
    });
    return {
      blob: response.data,
      filename:
        filenameFromContentDisposition(response.headers["content-disposition"]) ??
        fallbackExportFilename(),
    };
  },
};
