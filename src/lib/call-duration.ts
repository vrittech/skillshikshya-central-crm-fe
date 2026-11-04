export interface CallDurationPayload {
  duration_seconds: number | null;
}

const INVALID_DURATION_MESSAGE = "Enter a valid duration, such as MM:SS or 259 seconds.";

function safeSeconds(totalSeconds: number): number | null {
  return Number.isSafeInteger(totalSeconds) && totalSeconds >= 0 ? totalSeconds : null;
}

/** Parse stopwatch-style values, where separators divide minutes and seconds. */
export function parseDurationInput(value: string): number | null {
  const input = value.trim();
  if (!input) return null;

  const hoursMinutesSeconds = input.match(/^(\d+):(\d+):(\d+)$/);
  if (hoursMinutesSeconds) {
    const [, hours, minutes, seconds] = hoursMinutesSeconds;
    return safeSeconds(Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds));
  }

  const minutesSeconds = input.match(/^(\d+)[.:](\d+)$/);
  if (minutesSeconds) {
    const [, minutes, seconds] = minutesSeconds;
    return safeSeconds(Number(minutes) * 60 + Number(seconds));
  }

  const suffixedMinutesSeconds = input.match(/^(\d+)m(\d+)s$/i);
  if (suffixedMinutesSeconds) {
    const [, minutes, seconds] = suffixedMinutesSeconds;
    return safeSeconds(Number(minutes) * 60 + Number(seconds));
  }

  if (/^\d+$/.test(input)) return safeSeconds(Number(input));
  return null;
}

/** Empty duration remains optional; malformed non-empty values cannot be submitted. */
export function callDurationPayload(value: string): CallDurationPayload | null {
  const input = value.trim();
  if (!input) return { duration_seconds: null };

  const seconds = parseDurationInput(input);
  return seconds === null ? null : { duration_seconds: seconds };
}

export function durationInputError(value: string): string | null {
  return value.trim() && callDurationPayload(value) === null
    ? INVALID_DURATION_MESSAGE
    : null;
}

export function insufficientCallMinutesFieldError(message: string): string | null {
  return /insufficient call minutes/i.test(message) ? message : null;
}
