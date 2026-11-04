import { api } from "@/lib/api";
import type { CallFilterParams, CallItem, CallSummaryResponse } from "@/types/calls";

export const callsService = {
  getCalls: async (params: CallFilterParams) => {
    const response = await api.get<{ count: number; results: CallItem[] }>("/calls/", { params });
    return response.data;
  },

  getSummary: async (params: Omit<CallFilterParams, "page" | "page_size" | "ordering">) => {
    const response = await api.get<CallSummaryResponse>("/calls/summary/", { params });
    return response.data;
  },

  /**
   * Export calls matching current filters as a CSV file (US-4)
   */
  exportCsv: async (params: Omit<CallFilterParams, "page" | "page_size">) => {
    // Exclude pagination parameters to export ALL matching rows across all pages
    const { page: _page, page_size: _page_size, ...exportParams } = params as CallFilterParams;


    const response = await api.get("/calls/export/", {
      params: exportParams,
      responseType: "blob", // Critical: prevents Axios from parsing raw binary/CSV text as JSON
    });

    // Create a temporary Object URL and trigger file download
    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    const todayStr = new Date().toISOString().slice(0, 10);
    link.href = downloadUrl;
    link.setAttribute("download", `calls-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();

    // Clean up temporary DOM elements & memory
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};