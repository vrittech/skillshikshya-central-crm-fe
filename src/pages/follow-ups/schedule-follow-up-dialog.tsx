import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth";
import { useDataSource } from "@/context/data-source";
import { formatDateToNepalIso, toNepalIso } from "@/lib/leads-format";
import { useAddFollowup } from "@/hooks/use-leads";
import { useLeadOptions } from "@/hooks/use-lead-options";
import { useCounselors } from "@/hooks/use-users";

interface FollowUpForm {
  scheduledAt: string;
  assignedTo: string;
  purpose: string;
  reminder: "30m" | "1h" | "1d";
}

const EMPTY_FU: FollowUpForm = { scheduledAt: "", assignedTo: "", purpose: "", reminder: "1h" };

const REMINDER_OFFSETS_MS: Record<FollowUpForm["reminder"], number> = {
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

/**
 * Schedule a follow-up for a lead — used by the global /follow-ups page.
 * With `allowLeadPick` and no preset `leadApiId`, a lead search combobox is
 * shown inline so the target is chosen in the same dialog. Same payload as
 * the lead-detail quick action.
 */
export function ScheduleFollowUpDialog({
  open,
  onClose,
  leadApiId,
  leadName,
  allowLeadPick = false,
}: {
  open: boolean;
  onClose: () => void;
  leadApiId?: number;
  leadName?: string;
  /** Inline lead picker when opened without a preset lead (global flow). */
  allowLeadPick?: boolean;
}) {
  const { isMock } = useDataSource();
  const { user } = useAuth();
  const needsLead = allowLeadPick && leadApiId == null;
  const [pickedLeadId, setPickedLeadId] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const effectiveLeadId = leadApiId ?? (pickedLeadId ? Number(pickedLeadId) : undefined);
  const leadOptionsQ = useLeadOptions(open && needsLead ? leadSearch : "");
  const effectiveLeadName =
    leadName ?? leadOptionsQ.options.find((o) => o.value === pickedLeadId)?.label.split(" · ")[0];
  const addFollowup = useAddFollowup(effectiveLeadId);
  const counselorsQ = useCounselors("", undefined, !isMock);
  const [fu, setFu] = useState<FollowUpForm>(EMPTY_FU);

  useEffect(() => {
    if (!open) return;
    setPickedLeadId("");
    setLeadSearch("");
    setFu(EMPTY_FU);
  }, [open]);

  const setF = <K extends keyof FollowUpForm>(k: K, v: FollowUpForm[K]) =>
    setFu((f) => ({ ...f, [k]: v }));

  const counselorOptions = isMock
    ? []
    : (counselorsQ.data?.results ?? []).map((u) => ({ value: String(u.id), label: u.name }));
  const fuAssigned = fu.assignedTo || (user?.id != null ? String(user.id) : "");

  function submit() {
    if (isMock || effectiveLeadId == null) {
      toast.info(isMock ? "Switch to Live to schedule follow-ups." : "Pick a lead first.");
      return;
    }
    if (!fu.scheduledAt) {
      toast.error("Pick a date & time for the follow-up.");
      return;
    }
    const scheduledDate = new Date(fu.scheduledAt);
    addFollowup.mutate(
      {
        scheduled_at: toNepalIso(fu.scheduledAt),
        assigned_to: fuAssigned ? Number(fuAssigned) : null,
        purpose: fu.purpose.trim() || null,
        reminder_at: formatDateToNepalIso(
          new Date(scheduledDate.getTime() - REMINDER_OFFSETS_MS[fu.reminder]),
        ),
        status: "pending",
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Schedule follow-up{effectiveLeadName ? ` — ${effectiveLeadName}` : ""}
          </DialogTitle>
          <DialogDescription>Set the next touchpoint and its purpose.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {needsLead && (
            <div className="grid gap-2">
              <Label required>Lead</Label>
              <Combobox
                value={pickedLeadId}
                onChange={setPickedLeadId}
                onSearchChange={setLeadSearch}
                options={leadOptionsQ.options}
                loading={leadOptionsQ.isLoading && !!leadSearch}
                placeholder="Search leads by name or phone…"
                searchPlaceholder="Type to search…"
                emptyText="No leads match."
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label required>Date &amp; time</Label>
              <Input
                type="datetime-local"
                value={fu.scheduledAt}
                onChange={(e) => setF("scheduledAt", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Assigned to</Label>
              <Select value={fuAssigned} onValueChange={(v) => setF("assignedTo", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select counselor" />
                </SelectTrigger>
                <SelectContent>
                  {counselorOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Purpose</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Confirm preferred batch and share fee structure"
              value={fu.purpose}
              onChange={(e) => setF("purpose", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Reminder</Label>
            <Select value={fu.reminder} onValueChange={(v) => setF("reminder", v as FollowUpForm["reminder"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30m">30 minutes before</SelectItem>
                <SelectItem value="1h">1 hour before</SelectItem>
                <SelectItem value="1d">1 day before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={addFollowup.isPending}>
            Cancel
          </Button>
          <Button
            variant="brand"
            onClick={submit}
            disabled={addFollowup.isPending || (needsLead && !effectiveLeadId)}
          >
            {addFollowup.isPending ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
