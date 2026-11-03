export type ParsedDuration = { seconds: number | null; error: string | null };

const HINT = "Use MM:SS, e.g. 4:19";

/** Turns what the user typed into whole seconds, matching the backend's duration_input formats. */
export function parseDuration(input: string): ParsedDuration {
  const v = input.trim().toLowerCase();
  if (!v) return { seconds: null, error: null };

  let m: RegExpMatchArray | null;

  // 259 -> plain number = seconds
  if ((m = v.match(/^(\d+)$/))) return ok(Number(m[1]));

  // 4:19 or 04:19 -> MM:SS (overflow like 7:89 is allowed: 7*60+89 = 509 s)
  if ((m = v.match(/^(\d+):(\d+)$/))) return ok(Number(m[1]) * 60 + Number(m[2]));

  // 1:04:19 -> H:MM:SS (the backend accepts this too)
  if ((m = v.match(/^(\d+):(\d+):(\d+)$/)))
    return ok(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));

  // 4.19 -> MM.SS, the digits after the dot are the seconds (4.5 -> 4:05)
  if ((m = v.match(/^(\d+)\.(\d+)$/))) return ok(Number(m[1]) * 60 + Number(m[2]));

  // 4m19s, 4m, 19s
  if ((m = v.match(/^(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/)) && (m[1] || m[2]))
    return ok(Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0));

  return { seconds: null, error: HINT };
}

function ok(seconds: number): ParsedDuration {
  if (!Number.isSafeInteger(seconds) || seconds > 86_399) {
    return { seconds: null, error: "Duration must be under 24 hours" };
  }
  return { seconds, error: null };
}

/** 259 -> "4 min 19 sec" */
export function formatDurationPreview(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} hr`);
  if (mins || h) parts.push(`${mins} min`);
  parts.push(`${secs} sec`);
  return parts.join(" ");
}
