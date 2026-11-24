import { Construction } from "lucide-react";

export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-[60dvh] flex-col items-center justify-center gap-3 text-center">
      <div className="bg-brand-fixed-dim/30 text-brand-container flex size-14 items-center justify-center rounded-2xl">
        <Construction className="size-7" />
      </div>
      <h1 className="font-headline text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Coming soon.
      </p>
    </div>
  );
}
