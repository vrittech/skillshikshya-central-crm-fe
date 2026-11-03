import { ArrowDownLeft, ArrowUpRight, Clock, Phone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CallsSummaryResponse } from "@/types/calls";

interface Props {
  data?: CallsSummaryResponse;
  isLoading: boolean;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

export function CallsSummaryCards({ data, isLoading }: Props) {
  const cards = [
    {
      label: "Total calls",
      value: data?.total_calls ?? 0,
      icon: Phone,
      description: "Calls matching current filters",
    },
    {
      label: "Inbound calls",
      value: data?.inbound_calls ?? 0,
      icon: ArrowDownLeft,
      description: "Received calls",
    },
    {
      label: "Outbound calls",
      value: data?.outbound_calls ?? 0,
      icon: ArrowUpRight,
      description: "Placed calls",
    },
    {
      label: "Average duration",
      value: formatDuration(data?.average_duration_seconds ?? 0),
      icon: Clock,
      description: "Average time per call",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="gap-2 py-5">
          <CardHeader className="flex-row items-center justify-between">
            <CardDescription className="font-mono text-[11px] font-medium tracking-wider uppercase">
              {card.label}
            </CardDescription>
            <card.icon className="text-brand size-4" />
          </CardHeader>

          <CardContent className="space-y-1">
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="font-headline text-2xl font-semibold tabular-nums">
                {card.value}
              </p>
            )}

            <p className="text-muted-foreground text-xs">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}