export function parseDurationToSeconds(durationInput: string | number | null | undefined): number {
  if (durationInput === null || durationInput === undefined || durationInput === '') {
    return 0;
  }

  const s = String(durationInput).trim().toLowerCase();
  if (!s) return 0;

  // 1. H:M:S or M:S format (e.g. "4:19:30" or "4:19", handles overflow carries like "7:89")
  if (s.includes(':')) {
    const parts = s.split(':');
    if (parts.length === 2) {
      try {
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        if (isNaN(minutes) || isNaN(seconds)) return 0;
        return (minutes * 60) + seconds;
      } catch {
        return 0;
      }
    } else if (parts.length === 3) {
      try {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(parts[2], 10);
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return 0;
        return (hours * 3600) + (minutes * 60) + seconds;
      } catch {
        return 0;
      }
    }
  }

  // 2. M.SS format (e.g., "4.19" = 4 min 19 sec, "4.5" = 4 min 05 sec)
  if (s.includes('.') && !s.includes(':')) {
    const parts = s.split('.');
    if (parts.length === 2) {
      try {
        const minutes = parseInt(parts[0], 10);
        // Zero-pad or truncate seconds part to 2 digits (e.g., "5" becomes "50" -> 50 sec, matching backend behavior)
        const secondsStr = parts[1].slice(0, 2).padEnd(2, '0');
        const seconds = parseInt(secondsStr, 10);
        if (isNaN(minutes) || isNaN(seconds)) return 0;
        return (minutes * 60) + seconds;
      } catch {
        return 0;
      }
    }
  }

  // 3. MmSs format (e.g., "4m19s")
  if (s.includes('m') && s.includes('s')) {
    try {
      const mIndex = s.indexOf('m');
      const sIndex = s.indexOf('s');
      if (mIndex < sIndex) {
        const minutesPart = s.slice(0, mIndex);
        const secondsPart = s.slice(mIndex + 1, sIndex);
        const minutes = minutesPart ? parseInt(minutesPart, 10) : 0;
        const seconds = secondsPart ? parseInt(secondsPart, 10) : 0;
        return (minutes * 60) + seconds;
      }
    } catch {
      // Fall through
    }
  }

  // 4. Raw seconds (integer)
  const parsedInt = parseInt(s, 10);
  if (!isNaN(parsedInt)) {
    return parsedInt < 0 ? 0 : parsedInt;
  }

  return 0;
}

export function formatDurationPreview(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}