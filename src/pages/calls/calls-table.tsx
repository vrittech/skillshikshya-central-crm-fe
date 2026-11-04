import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { KeyboardEvent, MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCallDurationMmSs,
  formatCallTimestampNpt,
  type CallSortDirection,
  type CallSortField,
} from "@/lib/calls-page";
import {
  selectCallFromRowClick,
  selectCallFromRowKey,
} from "@/lib/call-row";
import type { GlobalCall } from "@/types/leads-api";

interface CallsTableProps {
  rows: GlobalCall[];
  isLoading: boolean;
  hasError: boolean;
  hasNoCalls: boolean;
  isCheckingEmptyHistory: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  sortField: CallSortField;
  sortDirection: CallSortDirection;
  onSort: (field: CallSortField) => void;
  onSelectCall: (call: GlobalCall) => void;
  onPrevious: () => void;
  onNext: () => void;
}

function SortIndicator({
  field,
  sortField,
  direction,
}: {
  field: CallSortField;
  sortField: CallSortField;
  direction: CallSortDirection;
}) {
  if (sortField !== field) return <ArrowDownUp className="size-3 opacity-50" />;
  return direction === "asc" ? (
    <ArrowUp className="size-3" />
  ) : (
    <ArrowDown className="size-3" />
  );
}

export function CallsTable({
  rows,
  isLoading,
  hasError,
  hasNoCalls,
  isCheckingEmptyHistory,
  currentPage,
  totalPages,
  totalCount,
  sortField,
  sortDirection,
  onSort,
  onSelectCall,
  onPrevious,
  onNext,
}: CallsTableProps) {
  const start = totalCount ? (currentPage - 1) * 20 + 1 : 0;
  const end = Math.min(currentPage * 20, totalCount);

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                type="button"
                className="inline-flex items-center gap-1"
                onClick={() => onSort("call_timestamp")}
              >
                When
                <SortIndicator
                  field="call_timestamp"
                  sortField={sortField}
                  direction={sortDirection}
                />
              </button>
            </TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Logged by</TableHead>
            <TableHead>
              <button
                type="button"
                className="inline-flex items-center gap-1"
                onClick={() => onSort("duration_seconds")}
              >
                Duration
                <SortIndicator
                  field="duration_seconds"
                  sortField={sortField}
                  direction={sortDirection}
                />
              </button>
            </TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Recording</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }, (_, index) => (
              <TableRow key={`loading-${index}`}>
                <TableCell colSpan={8}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : hasError ? (
            <TableRow>
              <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                Call data is unavailable. Use Retry to try again.
              </TableCell>
            </TableRow>
          ) : rows.length ? (
            rows.map((call) => (
              <TableRow
                key={call.id}
                tabIndex={0}
                aria-label={`View call details for ${call.lead_name || "call"}`}
                className="cursor-pointer focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
                onClick={(event: MouseEvent<HTMLTableRowElement>) => {
                  selectCallFromRowClick(event.target, call, onSelectCall);
                }}
                onKeyDown={(event: KeyboardEvent<HTMLTableRowElement>) => {
                  if (selectCallFromRowKey(event.key, event.target, call, onSelectCall)) {
                    event.preventDefault();
                  }
                }}
              >
                <TableCell>{formatCallTimestampNpt(call.call_timestamp)}</TableCell>
                <TableCell>
                  <span className="capitalize">{call.direction}</span>
                </TableCell>
                <TableCell>
                  <Link
                    to={`/leads/${call.lead}`}
                    className="text-brand font-medium hover:underline"
                  >
                    <span className="block">{call.lead_name || "Unknown lead"}</span>
                    {call.lead_reference_number && (
                      <span className="text-muted-foreground text-xs">
                        {call.lead_reference_number}
                      </span>
                    )}
                  </Link>
                </TableCell>
                <TableCell>{call.phone_number || "—"}</TableCell>
                <TableCell>{call.created_by_name || "Unknown user"}</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {formatCallDurationMmSs(call.duration_seconds)}
                </TableCell>
                <TableCell>{call.outcome || "—"}</TableCell>
                <TableCell>
                  {call.recording_url ? (
                    <a
                      href={call.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      Listen
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-32 text-center">
                <p className="font-medium">
                  {isCheckingEmptyHistory
                    ? "Checking call history..."
                    : hasNoCalls
                      ? "No calls have been logged yet."
                      : "No calls match these filters."}
                </p>
                {!isCheckingEmptyHistory && !hasNoCalls && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Adjust or clear the current filters to see more calls.
                  </p>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <p className="text-muted-foreground text-xs">
          {isLoading ? "Loading calls..." : `Showing ${start}–${end} of ${totalCount}`}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={currentPage <= 1 || isLoading}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={currentPage >= totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
