import { ArrowRight, History, Mic, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ReasonDialog } from "@/components/reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { type RecordedAudio, VoiceRecorder } from "@/components/voice-recorder";
import { useAuth } from "@/context/auth";
import {
  useAddEnquiry,
  useEnquiries,
  useEnquiryHistory,
  useLoseEnquiry,
  useMoveEnquiry,
} from "@/hooks/use-enquiries";
import { useVoiceNotes } from "@/hooks/use-voice-notes";
import {
  LOST_REASONS,
  OPEN_STAGES,
  STAGE_CLASS,
  ENQUIRY_STAGES,
  nextStage,
  stageLabel,
} from "@/lib/enquiries";
import { fieldErrorsOf } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type {
  ApiCourseInterest,
  ApiEnquiryStage,
  ApiLostReason,
  ApiVoiceNote,
} from "@/types/leads-api";
import { RecordVoiceNoteDialog, VoiceNoteRow } from "./voice-notes";

/** The course, or what the enquiry is about when it has no course. */
function courseOf(e: ApiCourseInterest) {
  return e.course_name || e.about || "—";
}

export function StagePill({ stage, label }: { stage?: ApiEnquiryStage; label?: string }) {
  if (!stage) return null;
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STAGE_CLASS[stage])}>
      {label ?? stageLabel(stage)}
    </span>
  );
}

function EnquiryHistory({ leadId, enquiry }: { leadId: number; enquiry: ApiCourseInterest }) {
  const { data, isLoading } = useEnquiryHistory(leadId, enquiry.id, true);
  if (isLoading) return <Skeleton className="mt-3 h-10 w-full" />;
  const rows = data ?? [];
  return (
    <ol className="mt-3 space-y-2 border-t pt-3">
      {rows.length === 0 && <li className="text-muted-foreground text-sm">No changes yet.</li>}
      {rows.map((h) => (
        <li key={h.id} className="text-sm">
          <p className="flex flex-wrap items-center gap-1.5">
            <StagePill stage={h.from_stage} label={h.from_stage_display} />
            <ArrowRight className="text-muted-foreground size-3.5" />
            <StagePill stage={h.to_stage} label={h.to_stage_display} />
            <span className="text-muted-foreground text-xs">
              {h.changed_by_name ?? "System"} · {formatDateTime(h.created_at)}
            </span>
          </p>
          {h.note && <p className="text-muted-foreground mt-0.5 pl-1 text-xs">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}

function EnquiryCard({
  leadId,
  enquiry,
  canChange,
  voiceNotes,
  onLose,
  onReopen,
  onRecord,
}: {
  leadId: number;
  enquiry: ApiCourseInterest;
  canChange: boolean;
  voiceNotes: ApiVoiceNote[];
  onLose: () => void;
  onReopen: () => void;
  onRecord: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const move = useMoveEnquiry(leadId);
  const next = nextStage(enquiry.stage);
  const isOpen = enquiry.stage != null && OPEN_STAGES.includes(enquiry.stage);
  const meta = [enquiry.counselor_name, enquiry.source_name, enquiry.branch_name].filter(Boolean);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{courseOf(enquiry)}</span>
            {enquiry.is_primary && <Badge variant="brand">Primary</Badge>}
            <StagePill stage={enquiry.stage} label={enquiry.stage_display} />
          </div>
          <p className="text-muted-foreground text-xs">
            {[...meta, formatDate(enquiry.created_at)].join(" · ")}
          </p>
          {enquiry.course_name && enquiry.about && <p className="text-sm font-medium">{enquiry.about}</p>}
          {enquiry.description && (
            <p className="text-muted-foreground text-sm whitespace-pre-line">{enquiry.description}</p>
          )}
          {enquiry.stage === "lost" && (
            <p className="text-sm">
              {enquiry.lost_reason_display}
              <span className="text-muted-foreground">
                {enquiry.lost_at_stage_display && ` · at ${enquiry.lost_at_stage_display}`}
                {enquiry.lost_note && ` · ${enquiry.lost_note}`}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {canChange && next && (
            <Button
              size="sm"
              variant="outline"
              disabled={move.isPending}
              onClick={() => move.mutate({ id: enquiry.id, stage: next })}
            >
              Mark {stageLabel(next).toLowerCase()}
            </Button>
          )}
          {canChange && isOpen && (
            <Button size="sm" variant="ghost" onClick={onLose}>
              Lost
            </Button>
          )}
          {canChange && enquiry.stage === "lost" && (
            <Button size="sm" variant="ghost" onClick={onReopen}>
              Reopen
            </Button>
          )}
          {canChange && (
            <Button size="sm" variant="ghost" onClick={onRecord}>
              <Mic /> Voice note
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            aria-pressed={showHistory}
            onClick={() => setShowHistory((v) => !v)}
          >
            <History /> History
          </Button>
        </div>
      </div>
      {voiceNotes.length > 0 && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {voiceNotes.map((n) => (
            <VoiceNoteRow key={n.id} leadId={leadId} note={n} />
          ))}
        </div>
      )}
      {showHistory && <EnquiryHistory leadId={leadId} enquiry={enquiry} />}
    </div>
  );
}

function AddEnquiryDialog({
  leadId,
  open,
  onClose,
}: {
  leadId: number;
  open: boolean;
  onClose: () => void;
}) {
  const [about, setAbout] = useState("");
  const [description, setDescription] = useState("");
  const [recording, setRecording] = useState<RecordedAudio | null>(null);
  const [recorderBusy, setRecorderBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const add = useAddEnquiry(leadId);

  useEffect(() => {
    if (open) {
      setAbout("");
      setDescription("");
      setRecording(null);
      setErrors({});
    }
  }, [open]);

  const clear = (key: string) => setErrors((e) => ({ ...e, [key]: "" }));

  function save() {
    const e: Record<string, string> = {};
    if (!about.trim()) e.about = "Enter what the enquiry is about.";
    if (!description.trim() && !recording) e.description = "Write a description or record one.";
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    add.mutate(
      {
        about: about.trim(),
        description: description.trim(),
        recording: recording ? { blob: recording.blob, seconds: recording.seconds } : null,
      },
      {
        onSuccess: onClose,
        onError: (err) => {
          const fields = fieldErrorsOf(err);
          if (Object.keys(fields).length) setErrors(fields);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add enquiry</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="enquiry-about" required>
              Enquiry about
            </Label>
            <Input
              id="enquiry-about"
              maxLength={255}
              aria-invalid={!!errors.about}
              value={about}
              onChange={(e) => {
                setAbout(e.target.value);
                clear("about");
              }}
            />
            <FieldError text={errors.about} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="enquiry-description" required>
              Description
            </Label>
            <Textarea
              id="enquiry-description"
              rows={3}
              aria-invalid={!!errors.description}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clear("description");
              }}
            />
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <span className="bg-border h-px flex-1" />
              or record
              <span className="bg-border h-px flex-1" />
            </div>
            <VoiceRecorder
              value={recording}
              onChange={(r) => {
                setRecording(r);
                clear("description");
                clear("recording");
              }}
              onBusyChange={setRecorderBusy}
              disabled={add.isPending}
            />
            <FieldError text={errors.description || errors.recording} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button variant="brand" disabled={recorderBusy || add.isPending} onClick={save}>
            {add.isPending ? "Saving…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="text-destructive text-sm">{text}</p>;
}

function LostDialog({
  leadId,
  enquiry,
  onClose,
}: {
  leadId: number;
  enquiry: ApiCourseInterest | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ApiLostReason | "">("");
  const [note, setNote] = useState("");
  const lose = useLoseEnquiry(leadId);

  useEffect(() => {
    if (enquiry) {
      setReason("");
      setNote("");
    }
  }, [enquiry]);

  const needsNote = reason === "other";
  const valid = reason !== "" && (!needsNote || note.trim() !== "");

  return (
    <Dialog open={enquiry != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark enquiry lost</DialogTitle>
          {enquiry && <DialogDescription>{courseOf(enquiry)}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label required>Reason</Label>
            <Select value={reason || undefined} onValueChange={(v) => setReason(v as ApiLostReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label required={needsNote}>Note</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button
            variant="destructive"
            disabled={!valid || lose.isPending}
            onClick={() =>
              enquiry &&
              reason &&
              lose.mutate(
                { id: enquiry.id, reason, note: note.trim() },
                { onSuccess: onClose },
              )
            }
          >
            {lose.isPending ? "Saving…" : "Mark lost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReopenDialog({
  leadId,
  enquiry,
  onClose,
}: {
  leadId: number;
  enquiry: ApiCourseInterest | null;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<ApiEnquiryStage>("contacted");
  const move = useMoveEnquiry(leadId);

  useEffect(() => {
    if (enquiry) setStage(enquiry.lost_at_stage ?? "contacted");
  }, [enquiry]);

  return (
    <ReasonDialog
      open={enquiry != null}
      onClose={onClose}
      title="Reopen enquiry"
      description={enquiry ? courseOf(enquiry) : undefined}
      confirmLabel="Reopen"
      pending={move.isPending}
      onConfirm={(note) =>
        enquiry && move.mutate({ id: enquiry.id, stage, note }, { onSuccess: onClose })
      }
    >
      <div className="grid gap-2">
        <Label required>Stage</Label>
        <Select value={stage} onValueChange={(v) => setStage(v as ApiEnquiryStage)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENQUIRY_STAGES.filter((s) => OPEN_STAGES.includes(s.value)).map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ReasonDialog>
  );
}

/** The lead's enquiries, with stage moves, lost and history. */
export function EnquiriesPanel({ leadId }: { leadId: number }) {
  const { hasPerm } = useAuth();
  const canAdd = hasPerm("lead.add_leadcourseinterest");
  const canChange = hasPerm("lead.change_leadcourseinterest");
  const { data, isLoading } = useEnquiries(leadId);
  const [adding, setAdding] = useState(false);
  const [losing, setLosing] = useState<ApiCourseInterest | null>(null);
  const [reopening, setReopening] = useState<ApiCourseInterest | null>(null);
  const [recording, setRecording] = useState<ApiCourseInterest | null>(null);
  const voiceQ = useVoiceNotes(leadId, hasPerm("lead.view_voicenote"));
  const voiceNotes = voiceQ.data?.results ?? [];
  const rows = data?.results ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-headline text-base font-semibold">Enquiries</h3>
        {canAdd && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus /> Add enquiry
          </Button>
        )}
      </div>
      {isLoading && <Skeleton className="h-20 w-full rounded-xl" />}
      {!isLoading && rows.length === 0 && (
        <p className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
          No enquiries.
        </p>
      )}
      {rows.map((e) => (
        <EnquiryCard
          key={e.id}
          leadId={leadId}
          enquiry={e}
          canChange={canChange}
          voiceNotes={voiceNotes.filter((n) => n.enquiry === e.id)}
          onLose={() => setLosing(e)}
          onReopen={() => setReopening(e)}
          onRecord={() => setRecording(e)}
        />
      ))}
      <AddEnquiryDialog leadId={leadId} open={adding} onClose={() => setAdding(false)} />
      <LostDialog leadId={leadId} enquiry={losing} onClose={() => setLosing(null)} />
      <ReopenDialog leadId={leadId} enquiry={reopening} onClose={() => setReopening(null)} />
      <RecordVoiceNoteDialog
        leadId={leadId}
        enquiryId={recording?.id ?? null}
        title={recording ? courseOf(recording) : undefined}
        open={recording != null}
        onClose={() => setRecording(null)}
      />
    </div>
  );
}
