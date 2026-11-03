import { Calendar, Coins, Layers, Phone } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMyCallMinutes } from "@/hooks/use-call-minutes";
import { useRole } from "@/context/role";
import type { CallMinutesTransaction } from "@/types/call-minutes";
import { CallMinutesDialog } from "@/pages/users/call-minutes-dialog";

// ---------------------------------------------------------------------------
// Type Labels & Date/Duration Formatters
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<CallMinutesTransaction["type"], string> = {
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

function formatSignedMinutes(minutes: number): string {
  const totalSeconds = Math.round(Math.abs(minutes * 60));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const sign = minutes >= 0 ? '+' : '-';
  return `${sign} ${mins} min : ${secs.toString().padStart(2, '0')} sec`;
}

function formatHoursMinutesSeconds(minutes: number): string {
  const totalSeconds = Math.round(Math.abs(minutes * 60));
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

// ---------------------------------------------------------------------------
// CallMinutesPage Component
// ---------------------------------------------------------------------------

/** Signed-in user's call-minutes balance + last 10 ledger rows. */
export default function CallMinutesPage() {
  const { data, isLoading } = useMyCallMinutes();
  const { can } = useRole();
  const [topUpOpen, setTopUpOpen] = useState(false);

  return (
    <div className="w-full max-w-full min-w-0 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            My resources
          </p>
          <h1 className="font-headline mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">
            Call Minutes
          </h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Every logged call deducts minutes from your balance. Admins top balances up.
          </p>
        </div>
        {can("users.manage") && (
          <Button
            variant="brand"
            onClick={() => setTopUpOpen(true)}
            className="w-full sm:w-auto shrink-0 gap-2 font-medium"
          >
            <Coins className="size-4" /> Top up minutes
          </Button>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-4 sm:gap-6 min-w-0 max-w-full">
        {/* Balance Card - Compact Architecture */}
        <Card className="w-full sm:w-auto sm:min-w-[240px] lg:w-[270px] shrink-0 self-start p-4 sm:p-5">
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 sm:size-16 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-14" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              
                <div className="size-9 sm:size-10 rounded-full border-2 border-emerald-600 dark:border-emerald-400 flex items-center justify-center">
                  <Phone className="size-4 sm:size-5 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
                </div>
              
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Current balance
                </p>
                <p className="font-headline text-3xl sm:text-4xl font-bold tabular-nums text-foreground mt-0.5 leading-tight">
                  {data?.balance_minutes ?? 0}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5 leading-tight">
                  minutes available
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Recent Transactions Card */}
        <Card className="flex-1 w-full min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-3.5 p-4 sm:p-6 pb-3 sm:pb-4">
            <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Layers className="size-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg font-semibold">Recent transactions</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Your last {data?.recent_transactions.length ?? 4} ledger entries
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0 min-w-0 max-w-full">
            <div className="overflow-x-auto min-w-0 max-w-full">
              <Table className="min-w-[560px]">
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
                  {isLoading &&
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="pl-4 sm:pl-6">
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {!isLoading && (data?.recent_transactions.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground py-8 pl-4 pr-4 sm:pl-6 sm:pr-6 text-center text-sm">
                        No transactions yet — log a call to see activity here.
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.recent_transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="pl-4 sm:pl-6">
                        <Badge
                          variant={t.type === "topup" ? "brand" : "secondary"}
                          className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider"
                        >
                          {TYPE_LABELS[t.type]}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "whitespace-nowrap font-medium text-xs sm:text-sm tabular-nums",
                          t.amount_minutes >= 0
                            ? "font-semibold text-emerald-600 dark:text-emerald-400"
                            : "font-semibold text-destructive"
                        )}
                      >
                        {formatSignedMinutes(t.amount_minutes)}
                      </TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm font-semibold tabular-nums whitespace-nowrap">
                        {formatHoursMinutesSeconds(t.balance_after_minutes)}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-36 sm:max-w-48 truncate text-xs sm:text-sm">
                        {t.note || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground pr-4 sm:pr-6 whitespace-nowrap text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                          <span>{formatDateTime(t.created_at)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CallMinutesDialog user={null} allowUserPick open={topUpOpen} onOpenChange={setTopUpOpen} />
    </div>
  );
}
