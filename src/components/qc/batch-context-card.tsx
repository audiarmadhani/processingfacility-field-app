import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { QcBatchContext } from "@/lib/qc-batch-context";

type BatchContextCardProps = {
  context: QcBatchContext | null;
  loading?: boolean;
};

function ContextRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="text-sm text-stone-900">{value || "—"}</p>
    </div>
  );
}

export function BatchContextCard({ context, loading }: BatchContextCardProps) {
  if (loading) {
    return <Skeleton className="h-28 w-full" />;
  }

  if (!context) {
    return null;
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <ContextRow label="Farmer" value={context.farmerName} />
        <ContextRow label="Purpose" value={context.purpose} />
        <ContextRow label="Description" value={context.description} />
      </CardContent>
    </Card>
  );
}
