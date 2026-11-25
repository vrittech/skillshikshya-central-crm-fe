import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZES = [25, 50, 100];

/** Footer for a server-paged list: "Showing 1–25 of 140", rows per page, Previous / Next. */
export function ListPager({
  page,
  pageSize,
  count,
  noun,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  count: number;
  /** Plural, for the empty text, e.g. "enrollments". */
  noun: string;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm">
          {count === 0
            ? `No ${noun}`
            : `Showing ${start + 1}–${Math.min(start + pageSize, count)} of ${count}`}
        </span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-[4.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => onPage(current - 1)}>
          <ChevronLeft /> Previous
        </Button>
        <span className="text-muted-foreground px-3 text-sm">
          Page {current} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={current >= totalPages}
          onClick={() => onPage(current + 1)}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
