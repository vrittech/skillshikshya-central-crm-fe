const NPT = "Asia/Kathmandu";

export const formatDuration = (seconds: number | null | undefined) => {
  const total = Math.max(0, seconds ?? 0);
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
};

export const formatDate = (value: string) => {
  return new Intl.DateTimeFormat("en-NP", {
    timeZone: NPT,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const dateOnly = (value: Date) => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: NPT }).format(value);
};

export const dateRange = (preset: string, from: string, to: string) => {
  const now = new Date();
  const end = dateOnly(now);
  if (preset === "today") return { from: end, to: end };
  if (preset === "7d")
    return { from: dateOnly(new Date(now.getTime() - 6 * 86400000)), to: end };
  if (preset === "month") {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: NPT,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(now);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    return { from: `${year}-${month}-01`, to: end };
  }
  return { from, to };
};

export const apiDate = (value: string, end = false) => {
  return value ? `${value}T${end ? "23:59:59" : "00:00:00"}+05:45` : undefined;
};
