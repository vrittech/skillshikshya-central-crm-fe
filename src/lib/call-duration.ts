/**
 * Mirrors parse_duration_to_seconds in be/apps/callminutes/utils.py so the
 * Log Call preview shows exactly what the backend will store.
 * "4:19", "4.19", "4m19s" and "259" are all 259 s; "4.5" is 4 min 05 s;
 * overflow carries ("7:89" = 8 min 29 s). Returns null when invalid.
 */
export function parseDurationInput(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return 0;
  const int = (p: string) => (/^\d+$/.test(p) ? Number(p) : NaN);
  let secs = NaN;
  if (s.includes(":")) {
    const p = s.split(":").map(int);
    if (p.length === 2) secs = p[0] * 60 + p[1];
    else if (p.length === 3) secs = p[0] * 3600 + p[1] * 60 + p[2];
  } else if (s.includes(".")) {
    const [m, sec, ...rest] = s.split(".");
    if (!rest.length) secs = int(m) * 60 + int(sec.slice(0, 2).padStart(2, "0"));
  } else {
    const ms = /^(\d*)m(\d*)s$/.exec(s);
    secs = ms ? Number(ms[1] || 0) * 60 + Number(ms[2] || 0) : int(s);
  }
  return Number.isFinite(secs) ? secs : null;
}

/** 259 -> "04:19" */
export function formatMMSS(seconds: number | null | undefined): string {
  const t = Math.max(0, seconds ?? 0);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** 259 -> "4 min 19 sec" */
export function describeDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
}

/** 5400 -> "1h 30m" */
export function formatTalkTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m ${seconds % 60}s`;
}
