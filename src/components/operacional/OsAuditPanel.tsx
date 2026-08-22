import { Check, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  requestedPoints, approvedPoints, formatPoints,
  type OsServiceItem,
} from "@/lib/oficinaScoring";

interface Props {
  items: OsServiceItem[];
  readOnly?: boolean;
  onApprove?: (item: OsServiceItem, approved: boolean) => void;
  onAdjust?: (item: OsServiceItem, points: number) => void;
  onFinalize?: () => void;
  finalizing?: boolean;
  showFinalize?: boolean;
  className?: string;
}

/** Painel de auditoria: admin confere os serviços executados e aprova/ajusta os pontos. */
export default function OsAuditPanel({
  items, readOnly, onApprove, onAdjust, onFinalize, finalizing, showFinalize, className,
}: Props) {
  const done = items.filter((i) => i.done);
  const requested = requestedPoints(items);
  const approved = approvedPoints(items);
  const pendingCount = done.filter((i) => i.approved === null || i.approved === undefined).length;

  if (!items.length) {
    return (
      <div className={cn("border rounded-md p-3 bg-muted/30 text-xs text-muted-foreground", className)}>
        Nenhum serviço pontuado nesta OS.
      </div>
    );
  }

  return (
    <div className={cn("border rounded-md p-3 bg-muted/30 space-y-3", className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium flex items-center gap-1">
          <ShieldCheck className="h-4 w-4" /> Auditoria de serviços
        </span>
        <span className="text-xs text-muted-foreground">
          {formatPoints(requested)} pts solicitados · <span className="font-semibold text-emerald-600">{formatPoints(approved)} aprovados</span>
          {pendingCount > 0 && ` · ${pendingCount} pendente(s)`}
        </span>
      </div>

      <div className="space-y-1.5">
        {done.length === 0 && (
          <p className="text-xs text-muted-foreground">O mecânico ainda não marcou nenhum serviço como executado.</p>
        )}
        {done.map((it) => {
          const state = it.approved === true ? "ok" : it.approved === false ? "no" : "pending";
          const effPoints = Number(it.points_approved ?? it.points ?? 0);
          return (
            <div
              key={it.id}
              className={cn(
                "flex items-center gap-2 rounded border bg-card px-2 py-1.5",
                state === "ok" && "border-emerald-500/40",
                state === "no" && "border-red-500/40 opacity-70",
              )}
            >
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm truncate", state === "no" && "line-through text-muted-foreground")}>
                  {it.label}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  solicitado {formatPoints(it.points)}
                  {it.item_type === "nao_cadastrado" && " · serviço não cadastrado"}
                  {state === "ok" && effPoints !== Number(it.points) && ` · ajustado para ${formatPoints(effPoints)}`}
                </p>
              </div>

              {!readOnly && (
                <Input
                  type="number" step="0.05" min={0}
                  defaultValue={effPoints}
                  key={`${it.id}-${effPoints}`}
                  disabled={state === "no"}
                  className="h-7 w-20 text-xs text-right"
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 0 && v !== effPoints) onAdjust?.(it, v);
                  }}
                  aria-label={`Pontos aprovados para ${it.label}`}
                />
              )}

              {state === "ok" ? (
                <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] shrink-0">
                  <Check className="h-3 w-3 mr-0.5" /> {formatPoints(effPoints)}
                </Badge>
              ) : state === "no" ? (
                <Badge variant="secondary" className="bg-red-500/15 text-red-700 dark:text-red-300 text-[10px] shrink-0">
                  <X className="h-3 w-3 mr-0.5" /> Reprovado
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] shrink-0">Pendente</Badge>
              )}

              {!readOnly && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon" variant={state === "ok" ? "default" : "outline"} className="h-7 w-7"
                    onClick={() => onApprove?.(it, true)}
                    aria-label={`Aprovar ${it.label}`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant={state === "no" ? "destructive" : "outline"} className="h-7 w-7"
                    onClick={() => onApprove?.(it, false)}
                    aria-label={`Reprovar ${it.label}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showFinalize && !readOnly && (
        <div className="flex justify-end pt-1 border-t">
          <Button size="sm" onClick={onFinalize} disabled={finalizing}>
            <ShieldCheck className="h-4 w-4 mr-1" />
            {finalizing ? "Salvando..." : "Aprovar pontuação"}
          </Button>
        </div>
      )}
    </div>
  );
}
