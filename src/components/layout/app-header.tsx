import { KeyRound, LogOut, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BranchSwitcher } from "@/components/layout/branch-switcher";
import { ChangePasswordDialog } from "@/components/layout/change-password-dialog";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/auth";
import { useRole } from "@/context/role";
import { useTheme } from "@/lib/use-theme";

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const { can } = useRole();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [changePwOpen, setChangePwOpen] = useState(false);

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const roleLabel = user?.is_staff ? "Administrator" : user?.designation || "Member";

  return (
    <header className="bg-background/80 border-border flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 backdrop-blur-md md:px-8">
      <div className="flex flex-1 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu />
        </Button>
        {/* Global search — visual placeholder, not wired to any data */}
        <div className="group relative hidden w-full max-w-xl sm:block">
          <Search className="text-muted-foreground group-focus-within:text-brand absolute top-1/2 left-3 size-4 -translate-y-1/2 transition-colors" />
          <input
            type="text"
            placeholder="Search leads, students, courses..."
            className="bg-surface-container-low placeholder:text-muted-foreground/50 focus:ring-brand/20 w-full rounded-full border-none py-2 pr-4 pl-10 text-sm transition-all outline-none focus:ring-2"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <BranchSwitcher />

        {/* Quick Create */}
        {can("leads.create") && (
          <Button variant="brand" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/leads/new")}>
            <Plus /> Quick Create
          </Button>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggle}
          className="hover:bg-surface-container-low cursor-pointer rounded-full p-2 transition-all active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="text-muted-foreground size-5" />
          ) : (
            <Moon className="text-muted-foreground size-5" />
          )}
        </button>

        <div className="bg-border mx-1 hidden h-8 w-px sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-3 rounded-full py-1 pr-1 pl-2 transition-all outline-none hover:bg-surface-container-low focus-visible:ring-brand/20 focus-visible:ring-2"
            >
              <span className="hidden flex-col items-end sm:flex">
                <span className="text-sm font-semibold">{user?.name}</span>
                <span className="text-muted-foreground font-mono text-[10px] font-medium tracking-wider">
                  {roleLabel}
                </span>
              </span>
              <span className="border-brand-container text-brand-container dark:text-brand-fixed bg-brand-fixed-dim/30 flex size-9 items-center justify-center rounded-full border-2 text-xs font-bold">
                {initials}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p>{user?.name}</p>
              <p className="text-muted-foreground text-xs font-normal">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setChangePwOpen(true)}>
              <KeyRound /> Change password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                void logout().then(() => navigate("/login"));
              }}
            >
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangePasswordDialog open={changePwOpen} onOpenChange={setChangePwOpen} />
    </header>
  );
}
