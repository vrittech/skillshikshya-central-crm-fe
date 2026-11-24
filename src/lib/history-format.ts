import { formatDate, formatNPR } from "@/lib/leads-format";
import type { ApiDuePart } from "@/types/leads-api";

function label(s: string) {
  return s.replace(/_/g, " ");
}

/** "status: active → cancelled · amount: 10000.00" — unchanged values are shown once. */
export function changeText(before: Record<string, unknown>, after: Record<string, unknown>) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  const show = (v: unknown) => {
    if (Array.isArray(v)) {
      if (!v.length) return "—";
      return (v as ApiDuePart[])
        .map((p) => `${formatDate(p.due_on)} ${formatNPR(Number(p.amount))}`)
        .join(", ");
    }
    if (v == null || v === "") return "—";
    // An email (Teams account) is shown as it is.
    return String(v).includes("@") ? String(v) : label(String(v));
  };
  const name = (k: string) => label(k).replace(/^./, (c) => c.toUpperCase());
  return keys
    .map((k) =>
      show(before?.[k]) === show(after?.[k])
        ? `${name(k)}: ${show(after?.[k])}`
        : `${name(k)}: ${show(before?.[k])} → ${show(after?.[k])}`,
    )
    .join(" · ");
}
