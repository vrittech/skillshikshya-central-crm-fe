/** Helpers for recording audio in the browser and drawing its waveform. */

export const MAX_RECORDING_SECONDS = 10 * 60;
// Chrome and Firefox record webm or ogg; Safari records mp4.
const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
export const BAR = 3;
export const GAP = 2;
export const SAMPLE_MS = 50;
export const SAVED_PEAKS = 120;

export function pickType() {
  if (typeof MediaRecorder === "undefined") return null;
  return TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function audioContext(): AudioContext | null {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

/** `count` bars from `values`: the loudest value in each slice. */
export function fitBars(values: number[], count: number): number[] {
  if (count <= 0) return [];
  if (values.length === 0) return new Array<number>(count).fill(0);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const from = Math.floor((i * values.length) / count);
    const to = Math.max(from + 1, Math.floor(((i + 1) * values.length) / count));
    let max = 0;
    for (let j = from; j < to && j < values.length; j++) max = Math.max(max, values[j]);
    out.push(max);
  }
  return out;
}

/** Scale so the loudest bar is full height; quiet recordings still show a shape. */
export function normalise(values: number[]): number[] {
  const max = Math.max(0.05, ...values);
  return values.map((v) => Math.min(1, v / max));
}

/** Waveform of a saved recording; a flat line if the browser can't decode it. */
export async function peaksFromBlob(blob: Blob, count = SAVED_PEAKS): Promise<number[]> {
  const ctx = audioContext();
  if (!ctx) return new Array<number>(count).fill(0.15);
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = buffer.getChannelData(0);
    const size = Math.max(1, Math.floor(data.length / count));
    const peaks: number[] = [];
    for (let i = 0; i < count; i++) {
      let max = 0;
      for (let j = i * size; j < (i + 1) * size && j < data.length; j++) {
        max = Math.max(max, Math.abs(data[j]));
      }
      peaks.push(max);
    }
    return normalise(peaks);
  } catch {
    return new Array<number>(count).fill(0.15);
  } finally {
    void ctx.close();
  }
}
