import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDataSource } from "@/context/data-source";
import { ALL_LEADS } from "@/data/mock-leads";
import { apiErrorMessage } from "@/lib/api";
import { isDueToday, isOverdue } from "@/lib/leads-format";
import { globalListsService } from "@/services/global-lists.service";
import { leadsService } from "@/services/leads.service";

export type FollowUpBucket = "overdue" | "today" | "upcoming";

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

/** Global follow-up queue — `GET /api/followups/` (live) or mock leads' follow-ups. */
export function useFollowUps() {
  const { source } = useDataSource();
  const isApi = source === "api";

  const query = useQuery({
    queryKey: ["followups", "queue"],
    enabled: isApi,
    queryFn: () => globalListsService.followups({ ordering: "scheduled_at", page_size: 100 }),
    placeholderData: keepPreviousData,
  });

  let rows: FollowUpRow[];
  if (isApi) {
    rows = (query.data?.results ?? [])
      // Only actionable follow-ups belong in the queue.
      .filter((f) => f.status === "pending" || f.status === "missed")
      .map((f) => ({
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
        bucket: bucketOf(f.scheduled_at),
      }));
  } else {
    rows = ALL_LEADS.flatMap((lead) =>
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
  }
  rows.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  return { rows, isLoading: isApi && query.isLoading, isApi };
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
