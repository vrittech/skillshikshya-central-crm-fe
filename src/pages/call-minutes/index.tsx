import { Coins } from "lucide-react";
import { useState } from "react";
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

const TYPE_LABELS: Record<CallMinutesTransaction["type"], string> = {
  topup: "Top-up",
  deduction: "Deduction",
  adjustment: "Adjustment",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

/** Signed-in user's call-minutes balance + last 10 ledger rows. */
export default function CallMinutesPage() {
  const { data, isLoading } = useMyCallMinutes();
  const { can } = useRole();
  const [topUpOpen, setTopUpOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
            My resources
          </p>
          <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Call Minutes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every logged call deducts minutes from your balance. Admins top balances up.
          </p>
        </div>
        {can("minutes.top_up") && (
          <Button variant="brand" onClick={() => setTopUpOpen(true)}>
            <Coins /> Top up minutes
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="gap-2 py-5">
          <CardHeader>
            <CardDescription className="font-mono text-[11px] font-medium tracking-wider uppercase">
              Current balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <p className="font-headline text-4xl font-semibold">{data?.balance_minutes ?? 0}</p>
                <p className="text-muted-foreground mt-1 text-xs">minutes available</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent transactions</CardTitle>
            <CardDescription>Your last {data?.recent_transactions.length ?? 10} ledger entries</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance after</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="pr-6">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="pl-6">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!isLoading && (data?.recent_transactions.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 pl-6 text-center">
                      No transactions yet — log a call to see activity here.
                    </TableCell>
                  </TableRow>
                )}
                {data?.recent_transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="pl-6">
                      <Badge
                        variant={t.amount >= 0 ? "brand" : "secondary"}
                        className="text-[11px] font-bold uppercase"
                      >
                        {TYPE_LABELS[t.type]}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={
                        t.amount_minutes >= 0
                          ? "font-semibold text-emerald-600 dark:text-emerald-400"
                          : "font-semibold text-destructive"
                      }
                    >
                      {/* {t.amount_minutes >= 0 ? `+${t.amount_minutes}` : t.amount_minutes} */}
                      {formatSignedMinutes(t.amount_minutes)}
                    </TableCell>
                    {/* <TableCell>{t.balance_after_minutes}</TableCell> */}
                    <TableCell>{formatHoursMinutesSeconds(t.balance_after_minutes)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-48 truncate">
                      {t.note || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground pr-6 whitespace-nowrap">
                      {formatDateTime(t.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </Table>
        </CardContent>
        </Card>
      </div>

      <CallMinutesDialog user={null} allowUserPick open={topUpOpen} onOpenChange={setTopUpOpen} />
    </div>
  );
}
