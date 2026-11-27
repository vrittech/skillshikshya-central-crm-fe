import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { SettingsSource } from "@/types/system-settings";

/** Shared bits of the Cloud storage and Email settings panels. */

export function SourceBadge({ source }: { source: SettingsSource }) {
  if (source === "saved") return <Badge variant="brand">Saved</Badge>;
  if (source === "server") return <Badge variant="secondary">Default</Badge>;
  return <Badge variant="warning">Not set up</Badge>;
}

export function LastSaved({ at, by }: { at: string | null; by: string }) {
  if (!at) return null;
  return (
    <p className="text-muted-foreground text-xs">
      Last saved{by ? ` by ${by}` : ""} · {formatDateTime(at)}
    </p>
  );
}

export function FieldError({ text }: { text?: string | null }) {
  return text ? <p className="text-destructive text-xs">{text}</p> : null;
}

export function ResultLine({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
