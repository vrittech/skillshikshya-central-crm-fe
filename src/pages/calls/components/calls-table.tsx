import { ArrowDown, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/leads-format";
import type { CallRow } from "@/types/calls";

interface CallsTableProps {
  rows: CallRow[];
  isLoading: boolean;
  ordering: string;
  onSort: (field: "call_timestamp" | "duration_seconds") => void;
  onSelectCall: (call: CallRow) => void;
}

function SortHeader({
  label,
  field,
  ordering,
  onSort,
}: {
  label: string;
  field: "call_timestamp" | "duration_seconds";
  ordering: string;
  onSort: (field: "call_timestamp" | "duration_seconds") => void;
}) {
  const active = ordering.replace(/^-/, "") === field;
  const descending = ordering.startsWith("-");
  const Icon = descending ? ArrowDown : ArrowUp;

  return (
    <TableHead aria-sort={active ? (descending ? "descending" : "ascending") : "none"}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 px-3"
        onClick={() => onSort(field)}
      >
        {label}
        {active && <Icon aria-hidden="true" className="size-3.5" />}
      </Button>
    </TableHead>
  );
}

export function CallsTable({ rows, isLoading, ordering, onSort, onSelectCall }: CallsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1050px]">
        <TableHeader>
          <TableRow>
            <SortHeader label="When" field="call_timestamp" ordering={ordering} onSort={onSort} />
            <TableHead>Direction</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Logged by</TableHead>
            <SortHeader label="Duration" field="duration_seconds" ordering={ordering} onSort={onSort} />
            <TableHead>Outcome</TableHead>
            <TableHead>Recording</TableHead>
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
          {!isLoading && rows.map((call) => (
            <TableRow
              key={call.id}
              tabIndex={0}
              role="button"
              aria-label={`View call by ${call.created_by_name || "unknown caller"} with ${call.lead_name}`}
              className="cursor-pointer focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
              onClick={() => onSelectCall(call)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectCall(call);
                }
              }}
            >
              <TableCell className="whitespace-nowrap">{formatDateTime(call.call_timestamp)}</TableCell>
              <TableCell className="capitalize">{call.direction}</TableCell>
              <TableCell>
                <Link
                  to={`/leads/${call.lead}`}
                  className="font-medium text-brand hover:underline"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {call.lead_name}
                </Link>
                {call.lead_reference_number && (
                  <div className="text-muted-foreground font-mono text-xs">
                    {call.lead_reference_number}
                  </div>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap">{call.phone_number || "—"}</TableCell>
              <TableCell>{call.created_by_name || "—"}</TableCell>
              <TableCell className="tabular-nums">{call.duration_formatted || "—"}</TableCell>
              <TableCell>{call.outcome || "—"}</TableCell>
              <TableCell>
                {call.recording_url ? (
                  <a
                    href={call.recording_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand hover:underline"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    Listen
                  </a>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
