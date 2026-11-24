import { Loader2, Mic, Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { useAuth } from "@/context/auth";
import { useAddVoiceNote, useDeleteVoiceNote } from "@/hooks/use-voice-notes";
import { formatClock, formatDateTime } from "@/lib/leads-format";
import { voiceNotesService } from "@/services/voice-notes.service";
import type { ApiVoiceNote } from "@/types/leads-api";

const MAX_SECONDS = 10 * 60;
// Chrome and Firefox record webm or ogg; Safari records mp4.
const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickType() {
  if (typeof MediaRecorder === "undefined") return null;
  return TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

type Stage = "idle" | "recording" | "done" | "blocked";

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
  const [stage, setStage] = useState<Stage>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const add = useAddVoiceNote(leadId);

  function stopTracks() {
    if (timer.current != null) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }

  function reset() {
    if (recorder.current?.state === "recording") {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    recorder.current = null;
    stopTracks();
    setStage("idle");
    setSeconds(0);
    setAudio(null);
    setNote("");
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }

  useEffect(() => {
    if (!open) reset();
    return reset;
    // reset only touches refs and setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function start() {
    const type = pickType();
    if (type === null || !navigator.mediaDevices?.getUserMedia) {
      setStage("blocked");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStage("blocked");
      return;
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream.current, type ? { mimeType: type } : undefined);
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      stopTracks();
      const blob = new Blob(chunks, { type: rec.mimeType || type || "audio/webm" });
      setAudio(blob);
      setUrl(URL.createObjectURL(blob));
      setSeconds(Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
      setStage("done");
    };
    recorder.current = rec;
    startedAt.current = Date.now();
    setSeconds(0);
    rec.start();
    setStage("recording");
    timer.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) rec.stop();
    }, 250);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function again() {
    reset();
    void start();
  }

  function save() {
    if (!audio) return;
    add.mutate(
      { audio, enquiry: enquiryId, durationSeconds: seconds, note: note.trim() },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Voice note</DialogTitle>
          {title && <DialogDescription>{title}</DialogDescription>}
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {stage === "blocked" && (
            <p className="text-destructive text-sm">Microphone not available.</p>
          )}

          {(stage === "idle" || stage === "blocked") && (
            <Button variant="outline" className="h-16 text-base" onClick={() => void start()}>
              <Mic className="size-5" /> Record
            </Button>
          )}

          {stage === "recording" && (
            <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
              <span className="flex items-center gap-2 font-mono text-lg tabular-nums">
                <span className="size-2.5 animate-pulse rounded-full bg-red-500" />
                {formatClock(seconds)}
              </span>
              <Button variant="destructive" onClick={stop}>
                <Square className="size-4" /> Stop
              </Button>
            </div>
          )}

          {stage === "done" && url && (
            <>
              <div className="flex items-center gap-2">
                <audio controls src={url} className="h-10 w-full" />
                <span className="text-muted-foreground font-mono text-sm tabular-nums">
                  {formatClock(seconds)}
                </span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="voice-note-text">Note</Label>
                <Input
                  id="voice-note-text"
                  maxLength={255}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {stage === "done" && (
            <Button variant="outline" onClick={again} disabled={add.isPending}>
              <RotateCcw /> Record again
            </Button>
          )}
          {stage === "done" && (
            <Button variant="brand" onClick={save} disabled={add.isPending}>
              {add.isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Loads the recording on first play; recordings are private, so they come through the CRM. */
export function VoiceNotePlayer({ leadId, id, seconds }: { leadId: number; id: number; seconds?: number | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  async function load() {
    setLoading(true);
    setFailed(false);
    try {
      const blob = await voiceNotesService.audio(leadId, id);
      setUrl(URL.createObjectURL(blob));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (url) return <audio controls autoPlay src={url} className="h-9 w-full max-w-xs" />;
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
