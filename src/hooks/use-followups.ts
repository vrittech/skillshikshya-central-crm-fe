import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDataSource } from "@/context/data-source";
import { ALL_LEADS } from "@/data/mock-leads";
import { apiErrorMessage } from "@/lib/api";
import { isDueToday, isOverdue } from "@/lib/leads-format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { globalListsService } from "@/services/global-lists.service";
import { leadsService } from "@/services/leads.service";
import type { ApiFollowupDue, ApiFollowupSummary } from "@/types/leads-api";

export type FollowUpBucket = ApiFollowupDue;

export interface FollowUpRow {
  key: string;
  leadId: string;
  leadApiId?: number;
  followupId?: number;
  leadName: string;
  phone: string;
  purpose?: string;
  dueAt: string;
  assignedToName?: string;
  /** A payment follow-up made by the reminder job, and its course. */
  payment?: boolean;
  courseName?: string;
  bucket: FollowUpBucket;
}

function bucketOf(dueAt: string): FollowUpBucket {
  if (isDueToday(dueAt)) return "today";
  if (isOverdue(dueAt)) return "overdue";
  return "upcoming";
}

export interface FollowUpListParams {
  page: number;
  pageSize: number;
  search: string;
  due?: FollowUpBucket;
  /** Payment follow-ups (made by the reminder job) or the others. */
  kind?: "payment" | "other";
}

/**
 * Global follow-up queue: open follow-ups (pending or missed), soonest first,
 * one page at a time, with overdue / today / upcoming counts across every page.
 * Live data is filtered and paged by `GET /api/followups/`; mock data is done here.
 */
export function useFollowUps({ page, pageSize, search, due, kind }: FollowUpListParams) {
  const { source } = useDataSource();
  const isApi = source === "api";
  const q = useDebouncedValue(search.trim(), 300);
  const filters = {
    open: true,
    search: q || undefined,
    payment: kind ? kind === "payment" : undefined,
  };

  const query = useQuery({
    queryKey: ["followups", "queue", { page, pageSize, due, ...filters }],
    enabled: isApi,
    queryFn: () =>
      globalListsService.followups({
        ordering: "scheduled_at",
        page,
        page_size: pageSize,
        due,
        ...filters,
      }),
    placeholderData: keepPreviousData,
  });
  const summary = useQuery({
    queryKey: ["followups", "summary", filters],
    enabled: isApi,
    queryFn: () => globalListsService.followupsSummary(filters),
    placeholderData: keepPreviousData,
  });

  let rows: FollowUpRow[];
  let count: number;
  let counts: ApiFollowupSummary;
  if (isApi) {
    rows = (query.data?.results ?? []).map((f) => ({
        key: `fu-${f.id}`,
        leadId: String(f.lead),
        leadApiId: f.lead,
        followupId: f.id,
        leadName: f.lead_name,
        phone: f.lead_phone ?? "",
        purpose: f.purpose ?? undefined,
        dueAt: f.scheduled_at,
        assignedToName: f.assigned_to_name,
        payment: f.enrollment != null,
        courseName: f.enrollment_course_name ?? undefined,
        bucket: f.due ?? bucketOf(f.scheduled_at),
      }));
    count = query.data?.count ?? 0;
    counts = summary.data ?? { overdue: 0, today: 0, upcoming: 0, total: 0 };
  } else {
    const all: FollowUpRow[] = ALL_LEADS.flatMap((lead) =>
      lead.followUps
        .filter((f) => f.status === "pending" || f.status === "overdue")
        .map((f) => ({
          key: `${lead.id}-${f.id}`,
          leadId: lead.id,
          leadApiId: lead.apiId,
          followupId: Number(String(f.id).replace(/\D/g, "")) || undefined,
          leadName: lead.fullName,
          phone: lead.primaryPhone,
          purpose: f.purpose,
          dueAt: f.dueAt,
          assignedToName: f.assignedTo,
          bucket: bucketOf(f.dueAt),
        })),
    );
    all.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    const needle = q.toLowerCase();
    const matched = all.filter(
      (r) =>
        !needle ||
        `${r.leadName} ${r.phone} ${r.purpose ?? ""} ${r.assignedToName ?? ""}`
          .toLowerCase()
          .includes(needle),
    );
    const inBucket = (b: FollowUpBucket) => matched.filter((r) => r.bucket === b).length;
    counts = {
      overdue: inBucket("overdue"),
      today: inBucket("today"),
      upcoming: inBucket("upcoming"),
      total: matched.length,
    };
    const shown = due ? matched.filter((r) => r.bucket === due) : matched;
    count = shown.length;
    rows = shown.slice((page - 1) * pageSize, page * pageSize);
  }

  return { rows, count, counts, isLoading: isApi && query.isLoading, isApi };
}

/** Mark a follow-up completed (PATCH the nested endpoint). Recomputes lead_score BE-side. */
export function useCompleteFollowup() {
  const { isMock } = useDataSource();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadApiId, followupId }: { leadApiId: number; followupId: number }) => {
      if (isMock) return null;
      return leadsService.updateFollowup(leadApiId, followupId, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    },
    onSuccess: (r) => {
      toast.success("Follow-up completed", r ? undefined : { description: "Mock preview — not saved." });
      void qc.invalidateQueries({ queryKey: ["followups"] });
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not complete follow-up")),
  });
}
