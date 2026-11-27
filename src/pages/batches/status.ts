import type { CourseBatchStatus } from "@/types";

export const STATUS_BADGE: Record<CourseBatchStatus, "brand" | "outline" | "secondary"> = {
  upcoming: "outline",
  running: "brand",
  closed: "secondary",
};

export const STATUS_LABEL: Record<CourseBatchStatus, string> = {
  upcoming: "Upcoming",
  running: "Running",
  closed: "Closed",
};
