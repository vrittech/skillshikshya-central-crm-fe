export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();

  const hms = s.match(/^(\d+):(\d+):(\d+)$/);
  if (hms) return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);

  const ms = s.match(/^(\d+):(\d+)$/);
  if (ms) return Number(ms[1]) * 60 + Number(ms[2]);

  const dot = s.match(/^(\d+)\.(\d*)$/);
  if (dot) return Number(dot[1]) * 60 + Number(dot[2].slice(0, 2).padStart(2, "0"));

  const mmss = s.match(/^(\d*)\s*m\s*(\d*)\s*s$/);
  if (mmss) return Number(mmss[1] || 0) * 60 + Number(mmss[2] || 0);

  if (/^\d+$/.test(s)) return Number(s);

  return null; // invalid
}

export function formatDurationPreview(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `= ${m} min ${String(s).padStart(2, "0")} sec`;
}

export function formatSecondsLabel(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m} min ${String(s).padStart(2, "0")} sec`;
}