import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage, fieldErrorsOf } from "@/lib/api";
import { type NewEnquiry, enquiriesService } from "@/services/enquiries.service";
import type { ApiEnquiryStage, ApiLostReason } from "@/types/leads-api";

export function useEnquiries(leadId?: number) {
  return useQuery({
    queryKey: ["enquiries", "list", leadId],
    queryFn: () => enquiriesService.list(leadId!),
    enabled: leadId != null,
  });
}

export function useEnquiryHistory(leadId: number, id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["enquiries", "history", leadId, id],
    queryFn: () => enquiriesService.history(leadId, id),
    enabled,
  });
}

/** An enquiry change shows on the lead page, the leads list and the report. */
function refresh(qc: ReturnType<typeof useQueryClient>) {
  for (const key of ["enquiries", "lead", "leads", "reports"]) {
    void qc.invalidateQueries({ queryKey: [key] });
  }
}

export function useAddEnquiry(leadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: NewEnquiry) => enquiriesService.add(leadId, v),
    onSuccess: () => {
      toast.success("Enquiry added");
      refresh(qc);
    },
    onError: (e) => {
      // Field errors show next to the fields in the form.
      if (Object.keys(fieldErrorsOf(e)).length === 0) {
        toast.error(apiErrorMessage(e, "Could not add the enquiry"));
      }
    },
  });
}

export function useMoveEnquiry(leadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, note }: { id: number; stage: ApiEnquiryStage; note?: string }) =>
      enquiriesService.move(leadId, id, stage, note),
    onSuccess: (e) => {
      toast.success(`Enquiry ${e.stage_display?.toLowerCase() ?? "updated"}`);
      refresh(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not change the stage")),
  });
}

export function useLoseEnquiry(leadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, note }: { id: number; reason: ApiLostReason; note?: string }) =>
      enquiriesService.lose(leadId, id, reason, note),
    onSuccess: () => {
      toast.success("Enquiry marked lost");
      refresh(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not mark it lost")),
  });
}
