import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAddCallMinutes, useCallMinutesTransactions, formatMinutesLabel } from "@/hooks/use-call-minutes";
import { useUsers } from "@/hooks/use-users";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { CallMinutesTransactionType } from "@/types/call-minutes";
import type { User } from "@/types";

// ---------------------------------------------------------------------------
// Constants & Date Helpers
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const TYPE_LABELS: Record<CallMinutesTransactionType, string> = {
  topup: "Top-up",
  deduction: "Deduction",
  adjustment: "Adjustment",
};

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Admin Call Minutes Dialog Component
// ---------------------------------------------------------------------------

/**
 * Admin dialog: view a user's call-minutes balance + ledger and top it up.
 * Backend: /api/users/{id}/call-minutes/* (admin only).
 *
 * With `allowUserPick` and no preset `user`, a user search combobox is shown
 * first so admins can top up anyone (e.g. from the global call-minutes page).
 */
export function CallMinutesDialog({
  user,
  open,
  onOpenChange,
  allowUserPick = false,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Show a user picker when no preset `user` is passed (admin global flow). */
  allowUserPick?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<CallMinutesTransactionType | "all">("all");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [pickedUserId, setPickedUserId] = useState("");

  const needsPick = allowUserPick && user == null;
  const debouncedUserSearch = useDebouncedValue(userSearch, 300);
  const usersQ = useUsers(1, 20, needsPick ? debouncedUserSearch : "");

  // Effective target: the preset user, or the one chosen via the picker.
  const target = useMemo(() => {
    if (user) return user;
    if (!needsPick) return null;
    return usersQ.data?.results.find((u) => String(u.id) === pickedUserId) ?? null;
  }, [user, needsPick, usersQ.data, pickedUserId]);

  const ledger = useCallMinutesTransactions(
    open && target ? target.id : null,
    page,
    typeFilter === "all" ? undefined : typeFilter,
  );
  const addMinutes = useAddCallMinutes();
  const qc = useQueryClient();

  function resetForm() {
    setAmount("");
    setNote("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    const parsed = Number.parseInt(amount, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    addMinutes.mutate(
      { userId: target.id, payload: { amount: parsed, note: note.trim() || undefined } },
      {
        onSuccess: (data) => {
          const label = data.detail || `Added ${formatMinutesLabel(data.transaction.amount_minutes)}`;
          toast.success(label, {
            description: `Balance: ${formatMinutesLabel(data.transaction.balance_after_minutes)}`,
          });
          void qc.invalidateQueries({ queryKey: ["users"] });
          void qc.invalidateQueries({ queryKey: ["call-minutes"] });
          resetForm();
        },
      },
    );
  }

  const rows = ledger.data?.results ?? [];
  const totalPages = ledger.data ? Math.max(1, Math.ceil(ledger.data.count / PAGE_SIZE)) : 1;

  // Balance shown from the user serializer; stays fresh because top-ups
  // invalidate the ["users"] query (the parent re-renders with new data).
  const balance = target?.call_minutes_balance;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPage(1);
          setTypeFilter("all");
          resetForm();
          setUserSearch("");
          setPickedUserId("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl min-w-0 p-4 sm:p-6 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg min-w-0">
            <Coins className="text-brand size-5 shrink-0" />
            <span className="break-words min-w-0">Call minutes{target ? ` — ${target.name}` : ""}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm break-words">
            {target
              ? `Top up minutes for ${target.email}. Minutes are deducted automatically as counselors log calls.`
              : "Pick a user to view their balance and top it up."}
          </DialogDescription>
        </DialogHeader>

        {needsPick && (
          <div className="grid gap-2 min-w-0 w-full max-w-full">
            <Label required>User</Label>
            <Combobox
              value={pickedUserId}
              onChange={setPickedUserId}
              onSearchChange={setUserSearch}
              options={(usersQ.data?.results ?? []).map((u) => ({
                value: String(u.id),
                label: [u.name, u.email].filter(Boolean).join(" · "),
              }))}
              loading={usersQ.isFetching && !!userSearch}
              placeholder="Search users by name or email…"
              searchPlaceholder="Type to search…"
              emptyText="No users match."
              multiline
              selectedLabel={target ? [target.name, target.email].filter(Boolean).join(" · ") : undefined}
              className="w-full min-w-0 max-w-full"
            />
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border px-4 py-3 min-w-0">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] font-bold tracking-wider uppercase">
              Current balance
            </p>
            {ledger.isFetching && balance == null ? (
              <Skeleton className="mt-1 h-7 w-14" />
            ) : (
              <p className="font-headline text-2xl font-semibold">{balance ?? "—"} min</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-end gap-3 min-w-0">
          <div className="w-full sm:w-32 space-y-1.5 shrink-0">
            <Label htmlFor="cm-amount">Amount</Label>
            <Input
              id="cm-amount"
              type="number"
              min={1}
              step={1}
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="w-full sm:flex-1 space-y-1.5 min-w-0">
            <Label htmlFor="cm-note">Note (optional)</Label>
            <Input
              id="cm-note"
              placeholder="August quota"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="brand"
            disabled={!target || addMinutes.isPending}
            className="w-full sm:w-auto shrink-0"
          >
            {addMinutes.isPending ? "Adding…" : "Add minutes"}
          </Button>
        </form>

        <div className="space-y-2 min-w-0 max-w-full">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <p className="text-muted-foreground font-mono text-[11px] font-bold tracking-wider uppercase">
              Transaction history
            </p>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v as CallMinutesTransactionType | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-full sm:w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="topup">Top-ups</SelectItem>
                <SelectItem value="deduction">Deductions</SelectItem>
                <SelectItem value="adjustment">Adjustments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-background overflow-hidden rounded-xl border min-w-0 max-w-full">
            <div className="overflow-x-auto min-w-0 max-w-full">
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-6 text-[11px] font-semibold uppercase tracking-wider">Type</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Amount</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Balance after</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Note</TableHead>
                    <TableHead className="pr-4 sm:pr-6 text-[11px] font-semibold uppercase tracking-wider">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.isLoading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="pl-4 sm:pl-6">
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {!ledger.isLoading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground py-6 pl-4 pr-4 sm:pl-6 sm:pr-6 text-center text-sm">
                        No transactions yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="pl-4 sm:pl-6">
                        <Badge
                          variant={t.amount >= 0 ? "brand" : "secondary"}
                          className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider"
                        >
                          {TYPE_LABELS[t.type]}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "whitespace-nowrap font-medium text-xs sm:text-sm tabular-nums",
                          t.amount >= 0
                            ? "font-semibold text-emerald-600 dark:text-emerald-400"
                            : "font-semibold text-destructive"
                        )}
                      >
                        {t.amount >= 0 ? `+${t.amount}` : t.amount}
                      </TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm tabular-nums whitespace-nowrap">
                        {t.balance_after}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-32 sm:max-w-40 truncate text-xs sm:text-sm">
                        {t.note || t.created_by_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground pr-4 sm:pr-6 whitespace-nowrap text-xs sm:text-sm">
                        {formatDateTime(t.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <span className="text-muted-foreground text-xs">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 sm:pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
