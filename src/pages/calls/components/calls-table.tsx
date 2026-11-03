import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { Call } from "@/types/calls";

interface Props {
  calls: Call[];
  isLoading: boolean;
  ordering: string;
  onSort: (field: string) => void;
  onSelect: (call: Call) => void;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function SortButton({
  label,
  field,
  ordering,
  onSort,
}: {
  label: string;
  field: string;
  ordering: string;
  onSort: (field: string) => void;
}) {
  const active = ordering.replace("-", "") === field;
  const descending = ordering.startsWith("-");

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 px-2 font-medium"
      onClick={() => onSort(field)}
    >
      {label}
      {!active ? (
        <ArrowUpDown className="ml-1 size-3" />
      ) : descending ? (
        <ArrowDown className="ml-1 size-3" />
      ) : (
        <ArrowUp className="ml-1 size-3" />
      )}
    </Button>
  );
}

export function CallsTable({
  calls,
  isLoading,
  ordering,
  onSort,
  onSelect,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortButton
                label="Date"
                field="call_timestamp"
                ordering={ordering}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Caller</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>
              <SortButton
                label="Duration"
                field="duration_seconds"
                ordering={ordering}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Counselor</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell colSpan={8}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ))}

          {!isLoading && calls.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-16 text-center">
                <p className="font-headline text-base font-semibold">
                  No calls found
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Try changing your search or filters.
                </p>
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            calls.map((call) => (
              <TableRow
                key={call.id}
                tabIndex={0}
                role="button"
                className="cursor-pointer"
                onClick={() => onSelect(call)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(call);
                  }
                }}
              >
                <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                  {formatDateTime(call.call_timestamp)}
                </TableCell>

                <TableCell>
                  <p className="font-medium">{call.lead_name || "—"}</p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {call.lead_reference_number || "—"}
                  </p>
                </TableCell>

                <TableCell>{call.caller || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {call.phone_number || "—"}
                </TableCell>

                <TableCell>
                  <Badge
                    variant={call.direction === "inbound" ? "secondary" : "brand"}
                    className="capitalize"
                  >
                    {call.direction}
                  </Badge>
                </TableCell>

                <TableCell className="font-mono text-sm tabular-nums">
                  {formatDuration(call.duration_seconds)}
                </TableCell>

                <TableCell>
                  <span className="text-sm">{call.outcome || "—"}</span>
                </TableCell>

                <TableCell className="text-sm">
                  {call.created_by_name || "—"}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}