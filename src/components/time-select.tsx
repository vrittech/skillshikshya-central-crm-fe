import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIME_OPTIONS, timeLabel, toMinutes } from "@/lib/time-slots";

/** Pick a time of day from a list (every 15 minutes). `after` keeps only later times. */
export function TimeSelect({
  id,
  value,
  onChange,
  after,
  placeholder = "Select time",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  after?: string;
  placeholder?: string;
}) {
  const options = TIME_OPTIONS.filter((t) => !after || toMinutes(t) > toMinutes(after));
  // A slot saved before the list existed may sit between two steps; keep it pickable.
  if (value && !options.includes(value)) options.unshift(value);

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((t) => (
          <SelectItem key={t} value={t}>
            {timeLabel(t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
