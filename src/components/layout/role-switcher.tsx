import { Check, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_DEFS, useRole, type MockRole } from "@/context/role";
import { cn } from "@/lib/utils";

const ORDER: MockRole[] = ["admin", "manager", "counselor", "finance", "readonly"];

/**
 * Previews how navigation and actions change per role. Shown with mock data
 * only; with live data the buttons follow the user's real permissions.
 */
export function RoleSwitcher() {
  const { role, def, setRole } = useRole();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="border-brand/30 bg-brand-fixed-dim/15 text-brand-container hover:bg-brand-fixed-dim/25 flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
          title="Preview role (prototype only)"
        >
          <UserCog className="size-3.5" />
          <span className="hidden sm:inline">{def.label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs">
          Preview as role
          <p className="text-muted-foreground mt-0.5 font-normal">
            Prototype only — changes nav &amp; action visibility.
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ORDER.map((r) => {
          const d = ROLE_DEFS[r];
          const active = r === role;
          return (
            <DropdownMenuItem key={r} onSelect={() => setRole(r)} className="flex-col items-start gap-0.5">
              <span className="flex w-full items-center justify-between">
                <span className="font-medium">{d.label}</span>
                <Check className={cn("size-4", active ? "opacity-100" : "opacity-0")} />
              </span>
              <span className="text-muted-foreground text-xs">{d.description}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
