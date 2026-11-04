import type { GlobalCall } from "@/types/leads-api";

type CallRowSelector = (call: GlobalCall) => void;

interface ClosestTarget {
  closest: (selector: string) => Element | null;
}

function isClosestTarget(target: EventTarget | null): target is EventTarget & ClosestTarget {
  return target !== null && "closest" in target && typeof target.closest === "function";
}

export function shouldOpenCallDetails(target: EventTarget | null): boolean {
  return !isClosestTarget(target) ||
    !target.closest("a, button, input, select, textarea, [role='button'], [data-call-row-interactive]");
}

export function selectCallFromRowClick(
  target: EventTarget | null,
  call: GlobalCall,
  onSelect: CallRowSelector,
): boolean {
  if (!shouldOpenCallDetails(target)) return false;
  onSelect(call);
  return true;
}

export function selectCallFromRowKey(
  key: string,
  target: EventTarget | null,
  call: GlobalCall,
  onSelect: CallRowSelector,
): boolean {
  if ((key !== "Enter" && key !== " ") || !shouldOpenCallDetails(target)) return false;
  onSelect(call);
  return true;
}
