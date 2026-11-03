export type DurationParseResult =
  | { ok: true; seconds: number }
  | { ok: false; error: string };

const INVALID_DURATION = "Invalid duration format.";

function parseIntegerPart(value: string, allowEmpty = false): number | null {
  const part = value.trim();
  if (allowEmpty && part === "") return 0;
  if (!/^\d+$/.test(part)) return null;
  return Number(part);
}

export function parseDuration(input: string): DurationParseResult {
  const value = input.trim().toLowerCase();
  if (value === "") return { ok: true, seconds: 0 };

  if (value.includes(":")) {
    const parts = value.split(":");
    if (parts.length !== 2 && parts.length !== 3) {
      return { ok: false, error: INVALID_DURATION };
    }

    const parsedParts = parts.map((part) => parseIntegerPart(part));
    if (parsedParts.some((part) => part === null)) {
      return { ok: false, error: INVALID_DURATION };
    }

    const values = parsedParts.filter((part): part is number => part !== null);
    const seconds =
      values.length === 2
        ? values[0] * 60 + values[1]
        : values[0] * 3600 + values[1] * 60 + values[2];
    return { ok: true, seconds };
  }

  if (value.includes(".")) {
    const parts = value.split(".");
    if (parts.length !== 2) return { ok: false, error: INVALID_DURATION };

    const minutes = parseIntegerPart(parts[0]);
    const secondsPart = parts[1].trim().slice(0, 2).padStart(2, "0");
    const seconds = parseIntegerPart(secondsPart);
    if (minutes === null || seconds === null) {
      return { ok: false, error: INVALID_DURATION };
    }
    return { ok: true, seconds: minutes * 60 + seconds };
  }

  const minutesIndex = value.indexOf("m");
  const secondsIndex = value.indexOf("s");
  if (minutesIndex >= 0 && secondsIndex > minutesIndex) {
    const minutes = parseIntegerPart(value.slice(0, minutesIndex), true);
    const seconds = parseIntegerPart(value.slice(minutesIndex + 1, secondsIndex), true);
    if (minutes === null || seconds === null) {
      return { ok: false, error: INVALID_DURATION };
    }
    return { ok: true, seconds: minutes * 60 + seconds };
  }

  const seconds = parseIntegerPart(value);
  return seconds === null
    ? { ok: false, error: INVALID_DURATION }
    : { ok: true, seconds };
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} hr ${minutes} min ${remainingSeconds.toString().padStart(2, "0")} sec`;
  }
  return `${Math.floor(totalSeconds / 60)} min ${remainingSeconds.toString().padStart(2, "0")} sec`;
}

export function formatDurationPreview(seconds: number): string {
  return `= ${formatDuration(seconds)}`;
}

export function formatRemainingBalance(seconds: number): string {
  return formatDuration(seconds);
}
