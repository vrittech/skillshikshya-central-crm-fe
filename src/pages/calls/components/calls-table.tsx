import { Phone, PhoneIncoming, PhoneOutgoing } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Call } from "@/types/calls";

interface CallsTableProps {
  calls: Call[];
  isLoading: boolean;
  onSelect: (call: Call) => void;
}

function formatCallDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  }).format(new Date(value));
}

export default function CallsTable({ calls, isLoading, onSelect }: CallsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Loading calls...
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="rounded-lg border p-10 text-center">
        <Phone className="mx-auto mb-3 size-8 text-muted-foreground" />
        <h3 className="font-semibold">No calls found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Recorded calls will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Logged by</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Recording</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {calls.map((call) => (
            <TableRow
              key={call.id}
              tabIndex={0}
              role="button"
              onClick={() => onSelect(call)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(call);
                }
              }}
              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <TableCell className="min-w-36 whitespace-nowrap">
                {formatCallDate(call.call_timestamp)}
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2">
                  {call.direction === "inbound" ? (
                    <PhoneIncoming className="size-4 text-emerald-600" />
                  ) : (
                    <PhoneOutgoing className="size-4 text-blue-600" />
                  )}
                  <span className="capitalize">{call.direction}</span>
                </div>
              </TableCell>

              <TableCell>
                <div className="min-w-36">
                  <p className="font-medium">{call.lead_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {call.lead_reference_number || "—"}
                  </p>
                </div>
              </TableCell>

              <TableCell className="whitespace-nowrap">
                {call.phone_number || "—"}
              </TableCell>

              <TableCell>{call.created_by_name || "—"}</TableCell>

              <TableCell className="whitespace-nowrap font-mono">
                {call.duration_formatted || "00:00"}
              </TableCell>

              <TableCell>
                {call.outcome ? (
                  <Badge variant="outline">{call.outcome}</Badge>
                ) : (
                  "—"
                )}
              </TableCell>

              <TableCell>
                {call.recording_url ? (
                  <a
                    href={call.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                    onClick={(event) => event.stopPropagation()}
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
