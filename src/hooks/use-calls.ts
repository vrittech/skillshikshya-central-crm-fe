import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDataSource } from "@/context/data-source";
import { ALL_LEADS } from "@/data/mock-leads";
import { formatDuration } from "@/lib/leads-format";
import { callsService } from "@/services/calls.service";
import type {
  ApiCallSummary,
  ApiCallsPerDay,
  ApiTopCaller,
  CallListParams,
  CallRow,
} from "@/types/calls";

export { type CallRow };

export interface CallsSummaryStats {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  totalSeconds: number;
  talkTimeFormatted: string;
  avgDurationSeconds: number;
  avgDurationFormatted: string;
  connectedCalls: number;
  connectRate: number; // percentage (0 - 100)
  callsPerDay: ApiCallsPerDay[];
  topCallers: ApiTopCaller[];
}

/**
 * Returns Nepal date string (YYYY-MM-DD) for a given UTC / ISO timestamp.
 * Nepal is UTC + 5:45. A call at 11:00 PM NPT belongs to that day, not the next one.
 */
export function toNepalDateKey(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const npt = new Date(d.getTime() + (5 * 60 + 45) * 60 * 1000);
  const y = npt.getUTCFullYear();
  const m = String(npt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(npt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toNepalDateTimeString(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const npt = new Date(d.getTime() + (5 * 60 + 45) * 60 * 1000);
  const y = npt.getUTCFullYear();
  const m = String(npt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(npt.getUTCDate()).padStart(2, "0");
  const hh = String(npt.getUTCHours()).padStart(2, "0");
  const mm = String(npt.getUTCMinutes()).padStart(2, "0");
  const ss = String(npt.getUTCSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

export function useCalls(params: CallListParams = {}) {
  const { source, isMock } = useDataSource();
  const isApi = source === "api";
  const [isExporting, setIsExporting] = useState(false);

  // Summary params omit page and page_size so all matching calls are summarized
  const summaryParams = useMemo(() => {
    const { page: _p, page_size: _ps, ...rest } = params;
    return rest;
  }, [params]);

  // List query (table rows, 20 per page)
  const listQuery = useQuery({
    queryKey: ["calls", "list", params],
    enabled: isApi,
    queryFn: () => callsService.list({ page_size: 20, ...params }),
    placeholderData: keepPreviousData,
  });

  // Summary query (backend totals, chart per day in NPT, and top 10 callers)
  const summaryQuery = useQuery({
    queryKey: ["calls", "summary", summaryParams],
    enabled: isApi,
    queryFn: () => callsService.summary(summaryParams),
    placeholderData: keepPreviousData,
  });

  // Map API list rows
  const apiRows = useMemo<CallRow[]>(() => {
    if (!listQuery.data?.results) return [];
    return listQuery.data.results.map((c) => ({
      id: String(c.id),
      leadId: String(c.lead),
      leadName: c.lead_name || "Lead",
      leadReference: c.lead_reference_number,
      phoneNumber: c.phone_number ?? undefined,
      callTimestamp: c.call_timestamp,
      direction: c.direction,
      caller: c.caller || "Counselor",
      loggedBy: c.created_by_name || c.caller || "Counselor",
      durationSeconds: c.duration_seconds || 0,
      durationFormatted: c.duration_formatted || formatDuration(c.duration_seconds),
      outcome: c.outcome ?? undefined,
      notes: c.notes ?? undefined,
      recordingUrl: c.recording_url ?? undefined,
      nextFollowupAt: c.next_followup_at ?? undefined,
      nextAction: c.next_action ?? undefined,
      branchId: c.branch ?? undefined,
      branchName: c.branch_name,
      createdById: c.created_by ?? undefined,
      createdAt: c.created_at,
    }));
  }, [listQuery.data]);

  // Extract all mock rows
  const mockAllRows = useMemo<CallRow[]>(() => {
    const rows: CallRow[] = [];
    for (const lead of ALL_LEADS) {
      for (const act of lead.activities) {
        if (act.type === "call") {
          const duration = act.durationSeconds ?? 0;
          rows.push({
            id: act.id,
            leadId: lead.id,
            leadName: lead.fullName,
            leadReference: lead.referenceNumber || lead.id,
            phoneNumber: lead.primaryPhone,
            callTimestamp: act.at,
            direction: act.direction ?? "outbound",
            caller: act.performedBy || "Counselor",
            loggedBy: act.performedBy || "Counselor",
            durationSeconds: duration,
            durationFormatted: formatDuration(duration),
            outcome: act.outcome,
            notes: act.notes,
            recordingUrl: act.recordingUrl,
            nextFollowupAt: act.followUpAt,
            nextAction: act.nextAction,
            branchName: (lead as { branchName?: string }).branchName || "Kathmandu",
            createdAt: act.at,
          });
        }
      }
    }
    return rows;
  }, []);

  // Filter mock rows
  const mockFilteredRows = useMemo(() => {
    let result = mockAllRows;
    const q = params.search?.trim().toLowerCase();
    if (q) {
      result = result.filter((r) =>
        `${r.leadName} ${r.leadReference ?? ""} ${r.phoneNumber ?? ""} ${r.caller} ${r.notes ?? ""}`
          .toLowerCase()
          .includes(q),
      );
    }
    if (params.direction && params.direction !== "all") {
      result = result.filter((r) => r.direction === params.direction);
    }
    if (params.outcome && params.outcome !== "all") {
      result = result.filter((r) => r.outcome === params.outcome);
    }
    if (params.created_by && params.created_by !== "all") {
      result = result.filter(
        (r) =>
          String(r.createdById) === String(params.created_by) ||
          r.caller.toLowerCase().includes(String(params.created_by).toLowerCase()) ||
          r.loggedBy.toLowerCase().includes(String(params.created_by).toLowerCase()),
      );
    }
    if (params.call_timestamp__gte) {
      const start = new Date(params.call_timestamp__gte).getTime();
      result = result.filter((r) => new Date(r.callTimestamp).getTime() >= start);
    }
    if (params.call_timestamp__lte) {
      const end = new Date(params.call_timestamp__lte).getTime();
      result = result.filter((r) => new Date(r.callTimestamp).getTime() <= end);
    }

    // Ordering
    const ordering = params.ordering || "-call_timestamp";
    result = [...result].sort((a, b) => {
      if (ordering === "call_timestamp") {
        return new Date(a.callTimestamp).getTime() - new Date(b.callTimestamp).getTime();
      }
      if (ordering === "-call_timestamp") {
        return new Date(b.callTimestamp).getTime() - new Date(a.callTimestamp).getTime();
      }
      if (ordering === "duration_seconds") {
        return a.durationSeconds - b.durationSeconds;
      }
      if (ordering === "-duration_seconds") {
        return b.durationSeconds - a.durationSeconds;
      }
      return new Date(b.callTimestamp).getTime() - new Date(a.callTimestamp).getTime();
    });

    return result;
  }, [mockAllRows, params]);

  // Paginate mock rows (20 per page)
  const pageSize = params.page_size ?? 20;
  const currentPage = params.page ?? 1;
  const mockPaginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return mockFilteredRows.slice(start, start + pageSize);
  }, [mockFilteredRows, currentPage, pageSize]);

  const rows = isApi ? apiRows : mockPaginatedRows;
  const totalCount = isApi ? listQuery.data?.count ?? 0 : mockFilteredRows.length;

  // Mock summary computation
  const mockSummary = useMemo<CallsSummaryStats>(() => {
    let totalSeconds = 0;
    let outboundCalls = 0;
    let inboundCalls = 0;
    let connectedCalls = 0;
    const dailyMap = new Map<string, number>();
    const callersMap = new Map<string, { calls: number; seconds: number }>();

    for (const r of mockFilteredRows) {
      totalSeconds += r.durationSeconds;
      if (r.direction === "inbound") inboundCalls++;
      else outboundCalls++;

      // A call counts as connected when it lasted more than 0 seconds
      if (r.durationSeconds > 0) {
        connectedCalls++;
      }

      // Group in Nepal time
      const dateKey = toNepalDateKey(r.callTimestamp);
      if (dateKey) {
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
      }

      const c = callersMap.get(r.caller) || { calls: 0, seconds: 0 };
      c.calls += 1;
      c.seconds += r.durationSeconds;
      callersMap.set(r.caller, c);
    }

    const totalCalls = mockFilteredRows.length;
    const avgDurationSeconds = totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0;
    const connectRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 1000) / 10 : 0;

    const callsPerDay: ApiCallsPerDay[] = Array.from(dailyMap.keys())
      .sort()
      .map((date) => ({ date, count: dailyMap.get(date)! }));

    const topCallers: ApiTopCaller[] = Array.from(callersMap.entries())
      .map(([caller, st]) => ({
        caller,
        calls: st.calls,
        seconds: st.seconds,
        duration_formatted: formatDuration(st.seconds),
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    return {
      totalCalls,
      inboundCalls,
      outboundCalls,
      totalSeconds,
      talkTimeFormatted: formatDuration(totalSeconds),
      avgDurationSeconds,
      avgDurationFormatted: formatDuration(avgDurationSeconds),
      connectedCalls,
      connectRate,
      callsPerDay,
      topCallers,
    };
  }, [mockFilteredRows]);

  // Final summary stats
  const stats = useMemo<CallsSummaryStats>(() => {
    if (!isApi) return mockSummary;
    if (summaryQuery.data) {
      const d: ApiCallSummary = summaryQuery.data;
      return {
        totalCalls: d.total_calls,
        inboundCalls: d.inbound_calls,
        outboundCalls: d.outbound_calls,
        totalSeconds: d.total_seconds,
        talkTimeFormatted: d.talk_time_formatted,
        avgDurationSeconds: d.avg_duration_seconds,
        avgDurationFormatted: d.avg_duration_formatted,
        connectedCalls: d.connected_calls,
        connectRate: d.connect_rate,
        callsPerDay: d.calls_per_day || [],
        topCallers: d.top_callers || [],
      };
    }
    return mockSummary;
  }, [isApi, summaryQuery.data, mockSummary]);

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      if (isApi) {
        await callsService.exportCsv(summaryParams);
        toast.success("Calls exported successfully");
      } else {
        // Mock export with exact US-4 specs: UTF-8 BOM, NPT timestamp, formula sanitization
        const headers = [
          "Date & time (NPT)",
          "Direction",
          "Lead",
          "Reference",
          "Phone",
          "Caller",
          "Logged by",
          "Duration (MM:SS)",
          "Seconds",
          "Outcome",
          "Notes",
          "Recording",
        ];

        const sanitizeFormula = (val: string | undefined | null) => {
          if (!val) return "";
          if (["=", "+", "-", "@"].includes(val[0])) {
            return `"'${val.replace(/"/g, '""')}"`;
          }
          return `"${val.replace(/"/g, '""')}"`;
        };

        const csvRows = [headers.join(",")];
        for (const r of mockFilteredRows) {
          csvRows.push(
            [
              sanitizeFormula(toNepalDateTimeString(r.callTimestamp)),
              sanitizeFormula(r.direction),
              sanitizeFormula(r.leadName),
              sanitizeFormula(r.leadReference),
              sanitizeFormula(r.phoneNumber),
              sanitizeFormula(r.caller),
              sanitizeFormula(r.loggedBy),
              sanitizeFormula(r.durationFormatted),
              r.durationSeconds,
              sanitizeFormula(r.outcome),
              sanitizeFormula(r.notes),
              sanitizeFormula(r.recordingUrl),
            ].join(","),
          );
        }

        // Prepend UTF-8 BOM \ufeff for Excel
        const blob = new Blob(["\ufeff", csvRows.join("\n")], {
          type: "text/csv;charset=utf-8;",
        });
        const now = new Date();
        const npt = new Date(now.getTime() + (5 * 60 + 45) * 60 * 1000);
        const y = npt.getUTCFullYear();
        const m = String(npt.getUTCMonth() + 1).padStart(2, "0");
        const d = String(npt.getUTCDate()).padStart(2, "0");
        const fileName = `calls-${y}-${m}-${d}.csv`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Calls exported successfully");
      }
    } catch {
      toast.error("Failed to export calls");
    } finally {
      setIsExporting(false);
    }
  };

  return {
    rows,
    totalCount,
    stats,
    isLoading: isApi && listQuery.isLoading,
    isSummaryLoading: isApi && summaryQuery.isLoading,
    isError: isApi && (listQuery.isError || summaryQuery.isError),
    error: listQuery.error || summaryQuery.error,
    isExporting,
    exportCsv,
    refetch: () => {
      void listQuery.refetch();
      void summaryQuery.refetch();
    },
    isMock,
  };
}
