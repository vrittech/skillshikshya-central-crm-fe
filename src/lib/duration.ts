/** Mirrors apps.callminutes.utils.parse_duration_to_seconds for live previews. */
export function parseDurationToSeconds(input: string): number | null {
  const value = input.trim().toLowerCase();
  if (!value) return 0;

  if (value.includes(":")) {
    const parts = value.split(":");
    if (parts.length === 2 && parts.every((part) => /^[-+]?\d+$/.test(part))) {
      return Number(parts[0]) * 60 + Number(parts[1]);
    }
    if (parts.length === 3 && parts.every((part) => /^[-+]?\d+$/.test(part))) {
      return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
    }
    return null;
  }

  if (value.includes(".")) {
    const parts = value.split(".");
    if (parts.length !== 2 || !/^[-+]?\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) return null;
    return Number(parts[0]) * 60 + Number(parts[1].slice(0, 2).padStart(2, "0"));
  }

  if (value.includes("m") && value.includes("s")) {
    const match = value.match(/^(-?\d*)m(\d*)s$/);
    if (!match) return null;
    return Number(match[1] || 0) * 60 + Number(match[2] || 0);
  }

  if (!/^-?\d+$/.test(value)) return null;
  const seconds = Number(value);
  return seconds < 0 ? null : seconds;
}

export function formatDurationPreview(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `= ${minutes} min ${remaining} sec`;
}
