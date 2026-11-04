export type ParsedDuration =
  | { seconds: number; error: null }
  | { seconds: null; error: null }
  | { seconds: null; error: string };

const INVALID_DURATION =
  'Enter duration as MM:SS, M.SS, XmYs, seconds, or H:M:S (for example 4:19).';

export function parseCallDuration(value: string): ParsedDuration {
  const input = value.trim().toLowerCase();
  if (!input) return { seconds: null, error: null };

  const clockParts = input.split(":");
  if (clockParts.length === 2 || clockParts.length === 3) {
    if (!clockParts.every((part) => /^\d+$/.test(part))) {
      return { seconds: null, error: INVALID_DURATION };
    }
    const numbers = clockParts.map(Number);
    if (clockParts.length === 2) {
      return { seconds: numbers[0] * 60 + numbers[1], error: null };
    }
    return { seconds: numbers[0] * 3600 + numbers[1] * 60 + numbers[2], error: null };
  }
  if (clockParts.length > 3) return { seconds: null, error: INVALID_DURATION };

  if (input.includes(".")) {
    const match = /^(\d+)\.(\d+)$/.exec(input);
    if (!match) return { seconds: null, error: INVALID_DURATION };
    const secondsPart = match[2].slice(0, 2).padStart(2, "0");
    return { seconds: Number(match[1]) * 60 + Number(secondsPart), error: null };
  }

  if (input.includes("m") || input.includes("s")) {
    const match = /^(\d*)m(\d*)s$/.exec(input);
    if (!match || (!match[1] && !match[2])) {
      return { seconds: null, error: INVALID_DURATION };
    }
    return {
      seconds: Number(match[1] || 0) * 60 + Number(match[2] || 0),
      error: null,
    };
  }

  if (/^\d+$/.test(input)) return { seconds: Number(input), error: null };
  return { seconds: null, error: INVALID_DURATION };
}

export function formatCallDurationPreview(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `= ${minutes} min ${remainder} sec`;
}

export function formatRemainingCallTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes} min ${remainder} sec`;
}
