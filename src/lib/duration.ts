import { formatDuration } from "@/lib/leads-format";

/**
 * Mirrors parse_duration_to_seconds in the backend's apps/callminutes/utils.py so
 * the Log Call preview matches what gets saved. Returns null for invalid input.
 *
 *   "4:19", "4.19", "4m19s", "259" -> 259      "1:02:30" -> 3750
 *   "4.5" -> 245 (4 min 05 sec)                "7:89", "7.89" -> 509 (overflow carries)
 */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return 0;

  let m = /^(\d+):(\d+)$/.exec(s);
  if (m) return Number(m[1]) * 60 + Number(m[2]);

  m = /^(\d+):(\d+):(\d+)$/.exec(s);
  if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);

  // Dot means M.SS, not decimal minutes: the seconds part is the first two digits.
  m = /^(\d+)\.(\d*)$/.exec(s);
  if (m) return Number(m[1]) * 60 + Number(m[2].slice(0, 2).padStart(2, "0"));

  m = /^(\d*)\s*m\s*(\d*)\s*s$/.exec(s);
  if (m) return Number(m[1] || 0) * 60 + Number(m[2] || 0);

  if (/^\d+$/.test(s)) return Number(s);
  return null;
}

/** "4 min 05 sec", or "0 sec" where formatDuration would show a dash. */
export function durationLabel(seconds: number): string {
  return seconds > 0 ? formatDuration(seconds) : "0 sec";
}
