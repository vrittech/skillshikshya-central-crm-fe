import {
  BookOpen,
  Building2,
  CalendarClock,
  ChevronsLeft,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  PhoneCall,
  Settings,
  ShieldCheck,
  Timer,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";
import { useRole, type Capability } from "@/context/role";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  /** When set, the item is hidden unless the previewed role has this capability. */
  cap?: Capability;
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/leads", label: "Leads", icon: UserRound },
  { to: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { to: "/enrollments", label: "Enrollments", icon: GraduationCap, cap: "enrollment.manage" },
  { to: "/payments", label: "Payments", icon: CreditCard, cap: "payment.manage" },
  { to: "/invoices", label: "Invoices", icon: FileText, cap: "payment.manage" },
  { to: "/students", label: "Students", icon: GraduationCap },
  { to: "/reports", label: "Reports", icon: TrendingUp, cap: "reports.view" },
  { to: "/calls", label: "Calls", icon: PhoneCall },
  { to: "/call-minutes", label: "Call Minutes", icon: Timer },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/branches", label: "Branches", icon: Building2 },
  { to: "/users", label: "Users", icon: Users, cap: "users.manage" },
];

const adminItems: NavItem[] = [
  { to: "/roles", label: "Roles & Permissions", icon: ShieldCheck, cap: "users.manage" },
  { to: "/settings", label: "Settings", icon: Settings, cap: "settings.view" },
];

const COLLAPSE_KEY = "scc.sidebar.collapsed";

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { can } = useRole();
  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_KEY) === "1",
  );

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Nav visibility is driven by the previewed mock role (and real staff flag for
  // the admin section), demonstrating permission-aware navigation before RBAC ships.
  const visible = (item: NavItem) =>
    !item.cap || user?.is_staff || user?.is_superuser || can(item.cap);

  const items = [...navItems, ...(user?.is_staff || user?.is_superuser ? adminItems : [])]
    .filter(visible);

  // `md:hidden` when collapsed keeps the mobile slide-over full-width regardless.
  const hideWhenCollapsed = collapsed ? "md:hidden" : "";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" aria-hidden onClick={onClose} />
      )}
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground border-sidebar-border fixed inset-y-0 left-0 z-50 flex w-[280px] shrink-0 flex-col border-r transition-[transform,width] duration-200 md:static md:translate-x-0",
          collapsed ? "md:w-[76px]" : "md:w-[280px]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand header */}
        <div
          className={cn(
            "mb-6 flex items-center gap-3 px-6 pt-6",
            collapsed && "md:justify-center md:px-0",
          )}
        >
          <div className="text-primary font-headline flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold">
            SC
          </div>
          <div className={cn("leading-tight", hideWhenCollapsed)}>
            <p className="font-headline text-sm font-bold">SkillShikshya Central</p>
            <p className="text-sidebar-foreground/70 text-sm">SkillShikshya CRM</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm transition-colors",
                  collapsed && "md:justify-center md:gap-0 md:px-0",
                  isActive
                    ? "border-brand-fixed bg-white/15 text-white font-semibold"
                    : "text-sidebar-foreground/75 hover:bg-white/10 hover:text-white border-transparent font-normal",
                )
              }
            >
              <item.icon className="size-5 shrink-0" />
              <span className={hideWhenCollapsed}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer: collapse toggle (desktop) + org info */}
        <div className="border-sidebar-border/30 mt-auto space-y-3 border-t px-4 pt-4 pb-6">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "text-sidebar-foreground/75 hidden w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors hover:bg-white/10 hover:text-white md:flex",
              collapsed && "md:justify-center md:px-0",
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronsLeft className={cn("size-5 shrink-0 transition-transform", collapsed && "rotate-180")} />
            <span className={hideWhenCollapsed}>Collapse</span>
          </button>

          <div className={cn("space-y-1 px-2", hideWhenCollapsed)}>
            <p className="text-sidebar-foreground/55 font-mono text-xs font-medium tracking-wider">
              Skill Shikshya Pvt. Ltd.
            </p>
            <p className="text-sidebar-foreground/55 font-mono text-xs font-medium tracking-wider">
              Sankhamul, Kathmandu
            </p>
            <p className="text-sidebar-foreground/45 font-mono text-[10px] font-medium tracking-wider">
              CRM v0.1.0 · Static Preview
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
