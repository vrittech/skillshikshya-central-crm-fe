import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
 * Filtered and paged by `GET /api/followups/`.
 */
export function useFollowUps({ page, pageSize, search, due, kind }: FollowUpListParams) {
  const q = useDebouncedValue(search.trim(), 300);
  const filters = {
    open: true,
    search: q || undefined,
    payment: kind ? kind === "payment" : undefined,
  };

  const query = useQuery({
    queryKey: ["followups", "queue", { page, pageSize, due, ...filters }],
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
    queryFn: () => globalListsService.followupsSummary(filters),
    placeholderData: keepPreviousData,
  });

  const rows: FollowUpRow[] = (query.data?.results ?? []).map((f) => ({
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
  const count = query.data?.count ?? 0;
  const counts: ApiFollowupSummary = summary.data ?? { overdue: 0, today: 0, upcoming: 0, total: 0 };

  return { rows, count, counts, isLoading: query.isLoading };
}

/** Mark a follow-up completed (PATCH the nested endpoint). Recomputes lead_score BE-side. */
export function useCompleteFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadApiId, followupId }: { leadApiId: number; followupId: number }) =>
      leadsService.updateFollowup(leadApiId, followupId, {
        status: "completed",
        completed_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      toast.success("Follow-up completed");
      void qc.invalidateQueries({ queryKey: ["followups"] });
      void qc.invalidateQueries({ queryKey: ["lead"] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not complete follow-up")),
  });
}
