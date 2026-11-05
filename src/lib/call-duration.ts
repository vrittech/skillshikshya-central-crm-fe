export function parseCallDuration(input: string): number | null {
  const value = input.trim().toLowerCase();
  if (!value) return 0;
  let seconds: number;
  if (/^\d+$/.test(value)) {
    seconds = Number(value);
  } else if (/^\d+:\d+(?::\d+)?$/.test(value)) {
    seconds = value
      .split(":")
      .reduce((total, part) => total * 60 + Number(part), 0);
  } else if (/^\d+\.\d{1,2}$/.test(value)) {
    const [minutes, remainder] = value.split(".");
    seconds = Number(minutes) * 60 + Number(remainder);
  } else {
    const match = /^(\d+)m\s*(\d+)s$/.exec(value);
    if (!match) return null;
    seconds = Number(match[1]) * 60 + Number(match[2]);
  }
  return Number.isSafeInteger(seconds) && seconds <= 2_147_483_647
    ? seconds
    : null;
}

export function durationLabel(seconds: number): string {
  return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
}

export function durationClock(seconds: number): string {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)
    .toString()
    .padStart(2, "0")}:${(rounded % 60).toString().padStart(2, "0")}`;
}
