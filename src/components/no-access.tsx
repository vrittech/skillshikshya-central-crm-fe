import { Lock } from "lucide-react";
import { useRole, type Capability } from "@/context/role";

export function NoAccess() {
  return (
    <div className="flex h-full min-h-[60dvh] flex-col items-center justify-center gap-3 text-center">
      <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl">
        <Lock className="size-7" />
      </div>
      <h1 className="font-headline text-xl font-semibold">No access.</h1>
    </div>
  );
}

/** Shows the page only to users with every capability given. */
export function RequireCaps({
  caps,
  children,
}: {
  caps: Capability | Capability[];
  children: React.ReactNode;
}) {
  const { canAll } = useRole();
  return canAll(caps) ? <>{children}</> : <NoAccess />;
}
