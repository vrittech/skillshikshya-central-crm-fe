export function parseCallDuration(input: string): number | null {
  const value = input.trim().toLowerCase();
  let seconds: number;
  if (/^\d+$/.test(value)) {
    seconds = Number(value);
  } else if (/^\d+[:.]\d{1,2}$/.test(value)) {
    const [minutes, remainder] = value.split(/[:.]/).map(Number);
    seconds = minutes * 60 + remainder;
  } else if (/^\d+:\d+:\d+$/.test(value)) {
    const [hours, minutes, remainder] = value.split(":").map(Number);
    seconds = hours * 3600 + minutes * 60 + remainder;
  } else {
    const match = /^(\d+)m(\d+)s$/.exec(value);
    if (!match) return null;
    seconds = Number(match[1]) * 60 + Number(match[2]);
  }
  return Number.isSafeInteger(seconds) && seconds <= 2147483647 ? seconds : null;
}

export function formatCallDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

export function durationLabel(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)} min ${total % 60} sec`;
}
