import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataSource } from "@/context/data-source";
import { useRole } from "@/context/role";
import { leadTypeLabel, sourceLabel } from "@/data/lead-lookups";
import { usePurgeLead, useRecycleBin, useRestoreLead } from "@/hooks/use-leads";
import { formatDate, formatPhone, initialsOf } from "@/lib/leads-format";

export default function RecycleBinPage() {
  const { can } = useRole();
  const { isMock } = useDataSource();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [purgeId, setPurgeId] = useState<number | null>(null);
  const [purgeName, setPurgeName] = useState("");

  const { items, count, isLoading } = useRecycleBin(page, pageSize);
  const restore = useRestoreLead();
  const purge = usePurgeLead();

  const canRestore = can("leads.archive") || can("leads.delete");
  const canPurge = can("leads.delete");

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  return (
    <div className="space-y-6">
      <Link to="/leads" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-4" /> Back to leads
      </Link>

      <div>
        <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">CRM Workspace</p>
        <h1 className="font-headline mt-1 text-3xl font-semibold tracking-tight">Recycle Bin</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Soft-deleted leads. Restore them to the active list, or permanently delete them.
          {isMock && " Switch to the live data source to see deleted leads."}
        </p>
      </div>

      <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Course / Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <p className="font-headline text-base font-semibold">Recycle bin is empty</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Deleted leads will appear here and can be restored.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
                {items.map((lead) => (
                  <TableRow key={lead.id} className="opacity-90">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                          {initialsOf(lead.fullName)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold">{lead.fullName}</p>
                          <p className="text-muted-foreground font-mono text-xs">{lead.referenceNumber}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs">{formatPhone(lead.primaryPhone)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-1 max-w-[15rem] text-sm">{lead.primaryCourse ?? "—"}</p>
                      <p className="text-muted-foreground text-xs">
                        {lead.leadTypeName ?? leadTypeLabel(lead.leadType)}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{lead.sourceName ?? sourceLabel(lead.source)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(lead.deletedAt ?? undefined)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {canRestore && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={restore.isPending && restore.variables === lead.apiId}
                            onClick={() => lead.apiId != null && restore.mutate(lead.apiId)}
                          >
                            <RotateCcw /> Restore
                          </Button>
                        )}
                        {canPurge && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setPurgeId(lead.apiId ?? null);
                              setPurgeName(lead.fullName);
                            }}
                          >
                            <Trash2 /> Delete forever
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <span className="text-muted-foreground text-sm">
            {count === 0
              ? "No deleted leads"
              : `Showing ${start + 1}–${Math.min(start + pageSize, count)} of ${count}`}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft /> Previous
            </Button>
            <span className="text-muted-foreground px-3 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={purgeId != null} onOpenChange={(o) => !o && setPurgeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete “{purgeName}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The lead and its history will be removed from the database for good.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purge.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={purge.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (purgeId != null) purge.mutate(purgeId, { onSuccess: () => setPurgeId(null) });
              }}
            >
              {purge.isPending ? "Deleting…" : "Delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
