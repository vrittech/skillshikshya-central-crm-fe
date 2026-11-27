import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api";
import { type NewVoiceNote, voiceNotesService } from "@/services/voice-notes.service";

/** All voice notes on the lead; each enquiry card picks its own. */
export function useVoiceNotes(leadId?: number, enabled = true) {
  return useQuery({
    queryKey: ["lead", "voice-notes", leadId],
    queryFn: () => voiceNotesService.list(leadId!),
    enabled: leadId != null && enabled,
  });
}

/** The lead's full history. Keys start with "lead", so other lead changes refresh it. */
export function useLeadTimeline(leadId?: number) {
  return useQuery({
    queryKey: ["lead", "timeline", leadId],
    queryFn: () => voiceNotesService.timeline(leadId!),
    enabled: leadId != null,
  });
}

export function useAddVoiceNote(leadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: NewVoiceNote) => voiceNotesService.create(leadId, v),
    onSuccess: () => {
      toast.success("Voice note saved");
      void qc.invalidateQueries({ queryKey: ["lead"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the voice note")),
  });
}

export function useDeleteVoiceNote(leadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => voiceNotesService.remove(leadId, id),
    onSuccess: () => {
      toast.success("Voice note deleted");
      void qc.invalidateQueries({ queryKey: ["lead"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete the voice note")),
  });
}
