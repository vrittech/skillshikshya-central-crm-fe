import { Mic, Pause, Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import {
  BAR,
  GAP,
  MAX_RECORDING_SECONDS,
  SAMPLE_MS,
  SAVED_PEAKS,
  audioContext,
  fitBars,
  normalise,
  pickType,
} from "@/lib/audio-waveform";

/** A finished recording: the audio, its length, and its waveform (0–1 per bar). */
export interface RecordedAudio {
  blob: Blob;
  seconds: number;
  peaks: number[];
}

function barCount(canvas: HTMLCanvasElement) {
  return Math.max(1, Math.floor((canvas.clientWidth + GAP) / (BAR + GAP)));
}

/** Draw bars centred on the line. Bars left of `playedUpTo` (0–1) use `played`. */
function drawBars(
  canvas: HTMLCanvasElement,
  bars: number[],
  color: string,
  played?: { color: string; upTo: number },
) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  bars.forEach((v, i) => {
    const bh = Math.max(2, v * (h - 2));
    const x = i * (BAR + GAP);
    const y = (h - bh) / 2;
    ctx.fillStyle = played && (i + 0.5) / bars.length <= played.upTo ? played.color : color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, BAR, bh, 1.5);
    else ctx.rect(x, y, BAR, bh);
    ctx.fill();
  });
}

const colorOf = (el: HTMLElement | null, fallback: string) => (el ? getComputedStyle(el).color : fallback);

/** Redraw when the canvas changes size. */
function useOnResize(ref: React.RefObject<HTMLElement | null>, onResize: () => void) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => onResize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, onResize]);
}

type Mode = "idle" | "starting" | "recording" | "paused" | "blocked";

/**
 * Record from the microphone with a live waveform, then listen back.
 * `value` is the finished recording; `onChange(null)` clears it.
 */
export function VoiceRecorder({
  value,
  onChange,
  onBusyChange,
  disabled,
  className,
}: {
  value: RecordedAudio | null;
  onChange: (audio: RecordedAudio | null) => void;
  /** True while the microphone is on, so a form can wait before saving. */
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [seconds, setSeconds] = useState(0);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const liveColor = useRef<HTMLSpanElement | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const frame = useRef<number | null>(null);
  const levels = useRef<number[]>([]);
  const elapsed = useRef({ total: 0, since: 0, paused: false });
  const discard = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onBusyChange?.(mode === "starting" || mode === "recording" || mode === "paused");
  }, [mode, onBusyChange]);

  const msSoFar = () => {
    const e = elapsed.current;
    return e.total + (e.paused ? 0 : performance.now() - e.since);
  };

  const drawLive = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const count = barCount(c);
    const recent = levels.current.slice(-count);
    const bars = [...new Array<number>(count - recent.length).fill(0), ...recent];
    drawBars(c, bars, colorOf(liveColor.current, "#ef4444"));
  }, []);
  useOnResize(canvas, drawLive);

  const release = useCallback(() => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (ctx.current && ctx.current.state !== "closed") void ctx.current.close();
    ctx.current = null;
  }, []);

  // Closing the dialog mid-recording turns the microphone off and drops the take.
  useEffect(
    () => () => {
      discard.current = true;
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      release();
    },
    [release],
  );

  async function start() {
    const type = pickType();
    if (type === null || !navigator.mediaDevices?.getUserMedia) {
      setMode("blocked");
      return;
    }
    setMode("starting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      release();
      setMode("blocked");
      return;
    }

    const audio = audioContext();
    const analyser = audio?.createAnalyser();
    if (audio && analyser) {
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.5;
      audio.createMediaStreamSource(stream.current).connect(analyser);
      ctx.current = audio;
    }
    const samples = new Uint8Array(analyser?.fftSize ?? 0);

    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream.current, type ? { mimeType: type } : undefined);
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      const took = msSoFar();
      release();
      recorder.current = null;
      if (discard.current) {
        discard.current = false;
        return;
      }
      const blob = new Blob(chunks, { type: rec.mimeType || type || "audio/webm" });
      setMode("idle");
      onChangeRef.current({
        blob,
        seconds: Math.max(1, Math.round(took / 1000)),
        peaks: normalise(fitBars(levels.current, SAVED_PEAKS)),
      });
    };

    recorder.current = rec;
    levels.current = [];
    discard.current = false;
    elapsed.current = { total: 0, since: performance.now(), paused: false };
    setSeconds(0);
    rec.start(250);
    setMode("recording");

    let lastSample = 0;
    let lastSecond = 0;
    const tick = (now: number) => {
      if (!elapsed.current.paused && now - lastSample >= SAMPLE_MS) {
        lastSample = now;
        let level = 0;
        if (analyser) {
          analyser.getByteTimeDomainData(samples);
          let sum = 0;
          for (const s of samples) sum += ((s - 128) / 128) ** 2;
          level = Math.min(1, Math.sqrt(Math.sqrt(sum / samples.length)) * 1.6);
        }
        levels.current.push(level);
        drawLive();
      }
      const s = Math.floor(msSoFar() / 1000);
      if (s !== lastSecond) {
        lastSecond = s;
        setSeconds(s);
        if (s >= MAX_RECORDING_SECONDS && rec.state !== "inactive") rec.stop();
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  function stop() {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  }

  function togglePause() {
    const rec = recorder.current;
    if (!rec) return;
    const e = elapsed.current;
    if (rec.state === "recording") {
      rec.pause();
      e.total += performance.now() - e.since;
      e.paused = true;
      setMode("paused");
    } else if (rec.state === "paused") {
      rec.resume();
      e.since = performance.now();
      e.paused = false;
      setMode("recording");
    }
  }

  function throwAway() {
    discard.current = true;
    stop();
    levels.current = [];
    setSeconds(0);
    setMode("idle");
  }

  if (value) {
    return (
      <RecordingPlayer
        audio={value}
        className={className}
        trailing={
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="Record again"
              title="Record again"
              disabled={disabled}
              onClick={() => {
                onChange(null);
                void start();
              }}
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="Delete recording"
              title="Delete recording"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        }
      />
    );
  }

  const live = mode === "recording" || mode === "paused";

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "bg-muted/40 flex items-center gap-3 rounded-xl border p-3 transition-colors",
          live && "border-red-500/40 bg-red-500/5",
        )}
      >
        <span ref={liveColor} className="hidden text-red-500" />
        <div className="relative shrink-0">
          {mode === "recording" && (
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40 motion-reduce:animate-none" />
          )}
          <button
            type="button"
            disabled={disabled || mode === "starting"}
            onClick={live ? stop : () => void start()}
            aria-label={live ? "Stop" : "Record"}
            title={live ? "Stop" : "Record"}
            className={cn(
              "relative flex size-12 cursor-pointer items-center justify-center rounded-full shadow-sm transition-[background-color,transform] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
              live ? "bg-red-500 text-white hover:bg-red-600" : "bg-brand text-brand-foreground hover:bg-brand/90",
            )}
          >
            {live ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
          </button>
        </div>

        <div className="relative h-10 min-w-0 flex-1">
          <canvas ref={canvas} className={cn("absolute inset-0 size-full", !live && "invisible")} aria-hidden="true" />
          {!live && (
            <div className="border-muted-foreground/30 absolute inset-x-0 top-1/2 border-t border-dashed" />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span
            className={cn(
              "flex min-w-[4.5rem] items-center justify-end gap-1.5 font-mono text-sm tabular-nums",
              mode === "recording" ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
            )}
          >
            {mode === "recording" && <span className="size-2 rounded-full bg-red-500" />}
            {mode === "paused" ? "Paused" : formatClock(seconds)}
          </span>
          {live && (
            <>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label={mode === "paused" ? "Resume" : "Pause"}
                title={mode === "paused" ? "Resume" : "Pause"}
                onClick={togglePause}
              >
                {mode === "paused" ? <Mic className="size-4" /> : <Pause className="size-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label="Discard"
                title="Discard"
                onClick={throwAway}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      {mode === "blocked" && <p className="text-destructive text-sm">Microphone not available.</p>}
    </div>
  );
}

/** Play a finished recording held in memory. */
function RecordingPlayer({
  audio,
  className,
  trailing,
}: {
  audio: RecordedAudio;
  className?: string;
  trailing?: React.ReactNode;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(audio.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [audio.blob]);
  if (!url) return null;
  return (
    <WaveformPlayer
      src={url}
      peaks={audio.peaks}
      seconds={audio.seconds}
      className={className}
      trailing={trailing}
    />
  );
}

/** Play button, waveform that fills as it plays (click to jump), and the time. */
export function WaveformPlayer({
  src,
  peaks,
  seconds,
  autoPlay,
  className,
  trailing,
}: {
  src: string;
  peaks: number[];
  /** Length in seconds; recordings from the browser often don't carry it. */
  seconds?: number | null;
  autoPlay?: boolean;
  className?: string;
  trailing?: React.ReactNode;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const playedColor = useRef<HTMLSpanElement | null>(null);
  const restColor = useRef<HTMLSpanElement | null>(null);
  const frame = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [mediaLength, setMediaLength] = useState(0);
  const duration = seconds && seconds > 0 ? seconds : mediaLength;

  const draw = useCallback(
    (at: number) => {
      const c = canvas.current;
      if (!c) return;
      drawBars(c, fitBars(peaks, barCount(c)), colorOf(restColor.current, "#a1a1aa"), {
        color: colorOf(playedColor.current, "#0d9488"),
        upTo: duration > 0 ? at / duration : 0,
      });
    },
    [peaks, duration],
  );

  useEffect(() => draw(current), [draw, current]);
  const redraw = useCallback(() => draw(audio.current?.currentTime ?? 0), [draw]);
  useOnResize(canvas, redraw);

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      setCurrent(audio.current?.currentTime ?? 0);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [playing]);

  useEffect(() => {
    if (autoPlay) void audio.current?.play().catch(() => undefined);
  }, [autoPlay, src]);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => undefined);
    else a.pause();
  }

  function seekTo(ratio: number) {
    const a = audio.current;
    if (!a || duration <= 0) return;
    const t = Math.min(duration, Math.max(0, ratio * duration));
    a.currentTime = t;
    setCurrent(t);
  }

  function onKey(e: React.KeyboardEvent) {
    const step = 5;
    if (e.key === "ArrowRight") seekTo((current + step) / duration);
    else if (e.key === "ArrowLeft") seekTo((current - step) / duration);
    else if (e.key === "Home") seekTo(0);
    else if (e.key === "End") seekTo(1);
    else if (e.key === " " || e.key === "Enter") toggle();
    else return;
    e.preventDefault();
  }

  return (
    <div className={cn("bg-muted/40 flex items-center gap-3 rounded-xl border p-3", className)}>
      <span ref={playedColor} className="text-brand hidden" />
      <span ref={restColor} className="text-muted-foreground/40 hidden" />
      <audio
        ref={audio}
        src={src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setMediaLength(d);
        }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        title={playing ? "Pause" : "Play"}
        className="bg-brand text-brand-foreground hover:bg-brand/90 flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-sm transition-[background-color,transform] active:scale-95"
      >
        {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
      </button>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(current)}
        aria-valuetext={`${formatClock(Math.floor(current))} of ${formatClock(Math.round(duration))}`}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          seekTo((e.clientX - box.left) / box.width);
        }}
        className="focus-visible:ring-brand/40 relative h-10 min-w-0 flex-1 cursor-pointer rounded outline-none focus-visible:ring-2"
      >
        <canvas ref={canvas} className="absolute inset-0 size-full" aria-hidden="true" />
      </div>
      <span className="text-muted-foreground shrink-0 font-mono text-sm tabular-nums">
        {formatClock(Math.floor(current))} / {formatClock(Math.round(duration))}
      </span>
      {trailing && <div className="flex shrink-0 items-center">{trailing}</div>}
    </div>
  );
}
