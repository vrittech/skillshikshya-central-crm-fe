import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Stat = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) => {
  return (
    <Card className="min-w-0 gap-3 rounded-xl py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-muted-foreground text-xs font-medium">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="font-headline text-2xl font-semibold tabular-nums">
          {value}
        </p>
        {detail && (
          <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
};
