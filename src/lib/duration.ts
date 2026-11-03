/**
 * Duration parsing and formatting utilities mirroring the backend logic
 * in apps/callminutes/utils.py.
 */

// ---------------------------------------------------------------------------
// Flexible Duration Parser (US-5)
// ---------------------------------------------------------------------------

export function parseDurationToSeconds(
  input: string | null | undefined,
): { seconds: number; error: null } | { seconds: null; error: string } {
  if (input == null || input.trim() === "") {
    return { seconds: 0, error: null };
  }
  const s = input.trim().toLowerCase();
  if (!s) return { seconds: 0, error: null };

  // H:M:S or M:S format (overflow carries: "7:89" = 8min 29sec)
  if (s.includes(":")) {
    const parts = s.split(":");
    if (parts.length === 2) {
      const minutes = Number(parts[0]);
      const seconds = Number(parts[1]);
      if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || seconds < 0) {
        return { seconds: null, error: `Invalid MM:SS format: "${input}"` };
      }
      return { seconds: minutes * 60 + seconds, error: null };
    }
    if (parts.length === 3) {
      const hours = Number(parts[0]);
      const minutes = Number(parts[1]);
      const seconds = Number(parts[2]);
      if (
        !Number.isInteger(hours) ||
        !Number.isInteger(minutes) ||
        !Number.isInteger(seconds) ||
        hours < 0 ||
        minutes < 0 ||
        seconds < 0
      ) {
        return { seconds: null, error: `Invalid H:M:S format: "${input}"` };
      }
      return { seconds: hours * 3600 + minutes * 60 + seconds, error: null };
    }
    return { seconds: null, error: `Invalid duration format: "${input}"` };
  }

  // M.SS format (e.g., "4.19" = 4 min 19 sec, "4.5" = 4 min 05 sec).
  // Overflow carries: "7.89" = 8 min 29 sec.
  if (s.includes(".") && !s.includes(":")) {
    const parts = s.split(".");
    if (parts.length === 2) {
      const minutes = Number(parts[0]);
      const rawSec = parts[1].slice(0, 2).padStart(2, "0");
      const seconds = Number(rawSec);
      if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || seconds < 0) {
        return { seconds: null, error: `Invalid M.SS format: "${input}"` };
      }
      return { seconds: minutes * 60 + seconds, error: null };
    }
    return { seconds: null, error: `Invalid duration format: "${input}"` };
  }

  // MmSs format (e.g., "4m19s"); overflow carries ("4m89s" = 5min 29sec)
  if (s.includes("m") && s.includes("s")) {
    const mIdx = s.indexOf("m");
    const sIdx = s.indexOf("s");
    if (mIdx < sIdx) {
      const minStr = s.slice(0, mIdx);
      const secStr = s.slice(mIdx + 1, sIdx);
      const minutes = minStr ? Number(minStr) : 0;
      const seconds = secStr ? Number(secStr) : 0;
      if (Number.isInteger(minutes) && Number.isInteger(seconds) && minutes >= 0 && seconds >= 0) {
        return { seconds: minutes * 60 + seconds, error: null };
      }
    }
  }

  // Raw seconds integer
  if (/^\d+$/.test(s)) {
    const sec = Number(s);
    if (sec >= 0) {
      return { seconds: sec, error: null };
    }
  }

  return {
    seconds: null,
    error: `Invalid duration format: "${input}". Accepted formats: "4:19", "4.19", "04:19", "4m19s", "259", "4:19:30"`,
  };
}

// ---------------------------------------------------------------------------
// Duration Formatters (Live Preview & Displays)
// ---------------------------------------------------------------------------

export function formatDurationPreview(totalSeconds: number): string {
  if (totalSeconds < 0) return "= 0 sec";
  const hours = Math.floor(totalSeconds / 3600);
  const remainder = totalSeconds % 3600;
  const minutes = Math.floor(remainder / 60);
  const seconds = remainder % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hr`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes} min`);
  parts.push(`${seconds} sec`);
  return `= ${parts.join(" ")}`;
}

export function formatDurationMMSS(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || totalSeconds < 0) return "00:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDurationHHMMSS(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || totalSeconds < 0) return "00:00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const remainder = totalSeconds % 3600;
  const minutes = Math.floor(remainder / 60);
  const seconds = remainder % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
