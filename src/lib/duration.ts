const INT = /^\d+$/;


export function parseDurationToSeconds(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return 0;


  if (s.includes(":")) {
    const parts = s.split(":");
    if (parts.length === 2 || parts.length === 3) {
      if (!parts.every((p) => INT.test(p))) return null;
      const n = parts.map(Number);
      return n.length === 2 ? n[0] * 60 + n[1] : n[0] * 3600 + n[1] * 60 + n[2];
    }
  }

  // M.SS (4.19 = 259 s, 4.5 = 245 s). Seconds part: first 2 digits, left-padded.
  if (s.includes(".") && !s.includes(":")) {
    const parts = s.split(".");
    if (parts.length === 2) {
      const secStr = parts[1].slice(0, 2).padStart(2, "0");
      if (!INT.test(parts[0]) || !INT.test(secStr)) return null;
      return Number(parts[0]) * 60 + Number(secStr);
    }
  }

  
  if (s.includes("m") && s.includes("s")) {
    const mi = s.indexOf("m");
    const si = s.indexOf("s");
    if (mi < si) {
      const mp = s.slice(0, mi);
      const sp = s.slice(mi + 1, si);
      if ((mp === "" || INT.test(mp)) && (sp === "" || INT.test(sp))) {
        return (mp ? Number(mp) : 0) * 60 + (sp ? Number(sp) : 0);
      }
    }
  }


  if (INT.test(s)) return Number(s);

  return null;
}

export function describeDuration(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)} min ${totalSeconds % 60} sec`;
}
export function formatBalance(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }