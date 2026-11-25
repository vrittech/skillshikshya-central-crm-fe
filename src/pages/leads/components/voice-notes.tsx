import { Loader2, Play, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { type RecordedAudio, VoiceRecorder, WaveformPlayer } from "@/components/voice-recorder";
import { useAuth } from "@/context/auth";
import { useAddVoiceNote, useDeleteVoiceNote } from "@/hooks/use-voice-notes";
import { peaksFromBlob } from "@/lib/audio-waveform";
import { formatClock, formatDateTime } from "@/lib/leads-format";
import { voiceNotesService } from "@/services/voice-notes.service";
import type { ApiVoiceNote } from "@/types/leads-api";

/** Record a voice note in the browser, listen back, then save it. */
export function RecordVoiceNoteDialog({
  leadId,
  enquiryId,
  title,
  open,
  onClose,
}: {
  leadId: number;
  enquiryId: number | null;
  title?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const add = useAddVoiceNote(leadId);

  useEffect(() => {
    if (!open) {
      setAudio(null);
      setNote("");
      setBusy(false);
    }
  }, [open]);

  function save() {
    if (!audio) return;
    add.mutate(
      { audio: audio.blob, enquiry: enquiryId, durationSeconds: audio.seconds, note: note.trim() },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Voice note</DialogTitle>
          {title && <DialogDescription>{title}</DialogDescription>}
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <VoiceRecorder value={audio} onChange={setAudio} onBusyChange={setBusy} disabled={add.isPending} />
          {audio && (
            <div className="grid gap-2">
              <Label htmlFor="voice-note-text">Note</Label>
              <Input
                id="voice-note-text"
                maxLength={255}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="brand" onClick={save} disabled={!audio || busy || add.isPending}>
            {add.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Loads the recording on first play; recordings are private, so they come through the CRM. */
export function VoiceNotePlayer({ leadId, id, seconds }: { leadId: number; id: number; seconds?: number | null }) {
  const [loaded, setLoaded] = useState<{ url: string; peaks: number[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(
    () => () => {
      if (loaded) URL.revokeObjectURL(loaded.url);
    },
    [loaded],
  );

  async function load() {
    setLoading(true);
    setFailed(false);
    try {
      const blob = await voiceNotesService.audio(leadId, id);
      const peaks = await peaksFromBlob(blob);
      setLoaded({ url: URL.createObjectURL(blob), peaks });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (loaded) {
    return (
      <WaveformPlayer
        src={loaded.url}
        peaks={loaded.peaks}
        seconds={seconds}
        autoPlay
        className="w-full max-w-md p-2"
      />
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" /> : <Play />}
      {seconds ? formatClock(seconds) : "Play"}
      {failed && <span className="text-destructive">· Not found</span>}
    </Button>
  );
}

/** A voice note in a list: play, who and when, and delete for the recorder or staff. */
export function VoiceNoteRow({ leadId, note }: { leadId: number; note: ApiVoiceNote }) {
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const del = useDeleteVoiceNote(leadId);
  const canDelete = !!user && (user.is_staff || user.is_superuser || note.created_by === user.id);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <VoiceNotePlayer leadId={leadId} id={note.id} seconds={note.duration_seconds} />
      <div className="min-w-0 flex-1 text-xs">
        {note.note && <p className="text-sm">{note.note}</p>}
        <p className="text-muted-foreground">
          {note.created_by_name ?? "—"} · {formatDateTime(note.created_at)}
        </p>
      </div>
      {canDelete && (
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label="Delete voice note"
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete voice note?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => del.mutate(note.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
