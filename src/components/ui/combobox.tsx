import { CheckIcon, ChevronsUpDownIcon, Loader2 } from "lucide-react";
import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /**
   * When provided, client-side filtering is turned off and this is called with
   * the debounced search text — wire it to a server query (`?search=`).
   */
  onSearchChange?: (search: string) => void;
  loading?: boolean;
  disabled?: boolean;
  /** Shown in the trigger when the current value isn't in `options` (e.g. on edit). */
  selectedLabel?: string;
  /** Pinned at the bottom of the list — e.g. a "+ Create…" action. */
  footer?: React.ReactNode;
  /** Called after an option is picked (footer can use it to close the popover). */
  className?: string;
  debounce?: number;
}

export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  onSearchChange,
  loading = false,
  disabled = false,
  selectedLabel,
  footer,
  className,
  debounce = 300,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debounced = useDebouncedValue(search, debounce);
  const serverSearch = !!onSearchChange;

  React.useEffect(() => {
    if (serverSearch) onSearchChange?.(debounced);
  }, [debounced, serverSearch, onSearchChange]);

  // Reset the search box each time the popover closes so it reopens clean.
  React.useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const triggerLabel = selected?.label ?? (value ? selectedLabel : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("line-clamp-1 text-left", !triggerLabel && "text-muted-foreground")}>
            {triggerLabel ?? placeholder}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0"
        align="start"
        portal={false}
      >
        <Command shouldFilter={!serverSearch}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            {loading ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                <Loader2 className="size-4 animate-spin" /> Searching…
              </div>
            ) : (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            {!loading &&
              options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn("size-4", o.value === value ? "opacity-100" : "opacity-0")}
                  />
                  <span className="line-clamp-1">{o.label}</span>
                </CommandItem>
              ))}
          </CommandList>
          {footer && <div className="border-t p-1">{footer}</div>}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
