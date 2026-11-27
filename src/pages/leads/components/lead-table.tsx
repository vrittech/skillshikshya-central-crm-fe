import { CalendarPlus, Eye, MoreHorizontal, PencilLine, PhoneCall, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatPhone, initialsOf, isOverdue, relativeToToday } from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { LeadListItem } from "@/types/leads";
import type { LeadAction } from "./lead-action-dialogs";
import { PriorityBadge, ScoreBar, StatusBadge } from "./lead-badges";

interface Props {
  leads: LeadListItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onAction: (action: LeadAction, id: string) => void;
  can: {
    edit: boolean;
    assign: boolean;
    logActivity: boolean;
  };
}

export function LeadTable({ leads, selected, onToggle, onToggleAll, onAction, can }: Props) {
  const navigate = useNavigate();
  const allSelected = leads.length > 0 && leads.every((l) => selected.has(l.id));

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
            </TableHead>
            <TableHead>Lead ID</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead>Next follow-up</TableHead>
            <TableHead>Last contact</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={13} className="py-16 text-center">
                <p className="font-headline text-base font-semibold">No leads found</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Try changing your filters or create a new lead.
                </p>
              </TableCell>
            </TableRow>
          )}
          {leads.map((lead) => {
            const overdue = !!lead.nextFollowUpAt && isOverdue(lead.nextFollowUpAt) && lead.status !== "enrolled";
            const isSelected = selected.has(lead.id);
            return (
              <TableRow
                key={lead.id}
                onClick={() => navigate(`/leads/${lead.id}`)}
                className={cn(
                  "group cursor-pointer border-l-2 border-l-transparent",
                  isSelected && "bg-brand-fixed-dim/10",
                  overdue && "border-l-destructive",
                  lead.priority === "hot" && !overdue && "border-l-orange-400",
                )}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggle(lead.id)}
                    aria-label={`Select ${lead.fullName}`}
                  />
                </TableCell>

                <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                  {lead.referenceNumber}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="bg-brand-fixed-dim/30 text-brand-container dark:text-brand-fixed flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                      {initialsOf(lead.fullName)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{lead.fullName}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">{formatPhone(lead.primaryPhone)}</p>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <p className="line-clamp-1 max-w-[15rem] text-sm">{lead.primaryCourse ?? "—"}</p>
                </TableCell>

                <TableCell>
                  <span className="text-sm">{lead.sourceName ?? "—"}</span>
                  {lead.campaign && (
                    <p className="text-muted-foreground line-clamp-1 max-w-[10rem] text-xs">
                      {lead.campaign}
                    </p>
                  )}
                </TableCell>

                <TableCell>
                  <StatusBadge name={lead.statusName} color={lead.statusColor} />
                </TableCell>

                <TableCell>
                  <PriorityBadge name={lead.priorityName} color={lead.priorityColor} />
                </TableCell>

                <TableCell>
                  <ScoreBar score={lead.score} />
                </TableCell>

                <TableCell>
                  {lead.assignedTo ? (
                    <span className="text-sm">{lead.assignedToName ?? "Not yet assigned"}</span>
                  ) : (
                    <Badge variant="warning" className="text-[10px]">
                      Not yet assigned
                    </Badge>
                  )}
                </TableCell>

                <TableCell>
                  {lead.nextFollowUpAt ? (
                    <span className={cn("text-sm", overdue && "text-destructive font-medium")}>
                      {relativeToToday(lead.nextFollowUpAt)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-muted-foreground text-sm">
                  {lead.lastContactedAt ? relativeToToday(lead.lastContactedAt) : "—"}
                </TableCell>

                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(lead.createdAt)}
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={() => navigate(`/leads/${lead.id}`)}>
                        <Eye /> View
                      </DropdownMenuItem>
                      {can.edit && (
                        <DropdownMenuItem onSelect={() => navigate(`/leads/${lead.id}/edit`)}>
                          <PencilLine /> Edit
                        </DropdownMenuItem>
                      )}
                      {can.logActivity && (
                        <>
                          <DropdownMenuItem onSelect={() => onAction("log_call", lead.id)}>
                            <PhoneCall /> Log Call
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onAction("follow_up", lead.id)}>
                            <CalendarPlus /> Add Follow-up
                          </DropdownMenuItem>
                        </>
                      )}
                      {can.assign && (
                        <DropdownMenuItem onSelect={() => onAction("assign", lead.id)}>
                          <UserPlus /> Assign
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
