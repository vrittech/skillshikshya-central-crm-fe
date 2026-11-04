export type DurationParse =
  | { ok: true; seconds: number }
  | { ok: false; error: string };

const INVALID: DurationParse = { ok: false, error: "Use MM:SS, e.g. 4:19" };

const ok = (seconds: number): DurationParse => ({ ok: true, seconds });

/** Digits only. Returns null for anything else, including "", "-4" and "4.5". */
function toInt(part: string): number | null {
  const p = part.trim();
  return /^\d+$/.test(p) ? Number(p) : null;
}

/**
 * Mirrors parse_duration_to_seconds in apps/callminutes/utils.py so the
 * preview always matches what the backend will save.
 * Overflow carries: "7:89" is 509 seconds.
 */
export function parseDuration(input: string): DurationParse {
  const s = input.trim().toLowerCase();
  if (!s) return ok(0);

  // H:M:S or M:S
  if (s.includes(":")) {
    const nums = s.split(":").map(toInt);
    if (nums.some((n) => n === null)) return INVALID;
    const n = nums as number[];
    if (n.length === 2) return ok(n[0] * 60 + n[1]);
    if (n.length === 3) return ok(n[0] * 3600 + n[1] * 60 + n[2]);
    return INVALID;
  }

  // M.SS ("4.5" is 4 min 05 sec, not 4.5 minutes)
  if (s.includes(".")) {
    const parts = s.split(".");
    if (parts.length !== 2) return INVALID;
    const minutes = toInt(parts[0]);
    const seconds = toInt(parts[1].slice(0, 2).padStart(2, "0"));
    if (minutes === null || seconds === null) return INVALID;
    return ok(minutes * 60 + seconds);
  }

  // 4m19s
  const ms = /^(\d*)m(\d*)s$/.exec(s);
  if (ms) return ok(Number(ms[1] || 0) * 60 + Number(ms[2] || 0));

  // Raw seconds
  if (/^\d+$/.test(s)) return ok(Number(s));

  return INVALID;
}

/** "= 4 min 19 sec" style text for the live preview. */
export function formatDurationPreview(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${m} min ${sec.toString().padStart(2, "0")} sec`;
}