export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);

  if (s.includes(":")) {
    const parts = s.split(":");
    if (parts.length < 2 || parts.length > 3) return null;
    if (!parts.every((p) => /^\d+$/.test(p))) return null;
    const n = parts.map(Number);
    if (n.length === 2) return n[0] * 60 + n[1];
    return n[0] * 3600 + n[1] * 60 + n[2];
  }

  if (/^\d+\.\d+$/.test(s)) {
    const [m, frac] = s.split(".");
    const secs = Number(frac.slice(0, 2).padStart(2, "0"));
    return Number(m) * 60 + secs;
  }

  const mt = s.match(/^(?:(\d+)m)?(?:(\d+)s)?$/);
  if (mt) return Number(mt[1] ?? 0) * 60 + Number(mt[2] ?? 0);
  return null;
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m} min ${s} sec`;
}

export function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
