import { ImpactResult } from "@/lib/sprintPlanning";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  impact: ImpactResult;
  sprintName?: string;
  compact?: boolean;
}

export default function SprintImpactPanel({ impact, sprintName, compact }: Props) {
  const cap = impact.capacity || 1;
  const currentPct = Math.min(100, ((impact.totalAfter - impact.selectedPoints) / cap) * 100);
  const addedPct = Math.min(100 - currentPct, (impact.selectedPoints / cap) * 100);
  const overflow = impact.exceedsBy > 0;

  return (
    <div className={cn("rounded-md border bg-card text-card-foreground", compact ? "p-2" : "p-3", "space-y-2")}>
      <div className="flex items-center justify-between text-xs">
        <div className="font-medium">
          {impact.selectedCount} item(s) · {impact.selectedPoints} pts
        </div>
        {sprintName && impact.capacity > 0 && (
          <div className={cn("flex items-center gap-1", overflow ? "text-destructive" : "text-muted-foreground")}>
            {overflow ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
            {sprintName}: {impact.totalAfter}/{impact.capacity}
            {overflow && ` (+${impact.exceedsBy})`}
          </div>
        )}
      </div>

      {impact.capacity > 0 && (
        <div className="relative h-2 bg-muted rounded overflow-hidden flex">
          <div className="bg-emerald-500" style={{ width: `${currentPct}%` }} />
          <div className="bg-blue-500" style={{ width: `${addedPct}%` }} />
          {overflow && <div className="bg-destructive" style={{ width: `${Math.min(100, (impact.exceedsBy / cap) * 100)}%` }} />}
        </div>
      )}

      {/* Por prioridade */}
      {Object.keys(impact.byPriority).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(impact.byPriority).map(([p, n]) => (
            <Badge key={p} variant="outline" className="text-[10px]">
              {n} {p}
            </Badge>
          ))}
        </div>
      )}

      {/* Por técnico */}
      {impact.byAssignee.length > 0 && (
        <div className="space-y-1">
          {impact.byAssignee.map((a) => (
            <div key={a.userId || "none"} className="flex items-center justify-between text-[11px]">
              <span className="truncate">{a.name}</span>
              <span
                className={cn(
                  "font-mono",
                  a.status === "over" && "text-destructive",
                  a.status === "warn" && "text-amber-600 dark:text-amber-400",
                  a.status === "ok" && "text-muted-foreground"
                )}
              >
                +{a.added} pts → {a.current + a.added}
                {a.capacity != null && a.capacity > 0 && `/${a.capacity}`}
                {a.status === "over" && " ⚠"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
