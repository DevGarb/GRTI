import { useState } from "react";
import { Check, Plus, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  requestedPoints, approvedPoints, formatPoints,
  type OsServiceItem,
} from "@/lib/oficinaScoring";

export interface AuditCatalogService { id: string; name: string; points: number }

interface Props {
  items: OsServiceItem[];
  readOnly?: boolean;
  onApprove?: (item: OsServiceItem, approved: boolean) => void;
  onAdjust?: (item: OsServiceItem, points: number) => void;
  onFinalize?: () => void;
  finalizing?: boolean;
  showFinalize?: boolean;
  /** Catálogo de serviços da empresa da OS, para o auditor incluir manualmente. */
  catalog?: AuditCatalogService[];
  onAddService?: (input: { label: string; points: number }) => void | Promise<unknown>;
  className?: string;
}

/** Formulário para o auditor incluir um serviço que o mecânico esqueceu de marcar. */
function AddServiceForm({ catalog = [], onAdd }: {
  catalog?: AuditCatalogService[];
  onAdd: (input: { label: string; points: number }) => void | Promise<unknown>;
}) {
  const [selected, setSelected] = useState("");
  const [label, setLabel] = useState("");
  const [points, setPoints] = useState("");
  const custom = selected === "__custom";

  const submit = async () => {
    if (custom) {
      if (!label.trim()) return;
      await onAdd({ label: label.trim(), points: Number(points) || 0 });
    } else {
      const svc = catalog.find((c) => c.id === selected);
      if (!svc) return;
      await onAdd({ label: svc.name, points: Number(points === "" ? svc.points : points) || 0 });
    }
    setSelected(""); setLabel(""); setPoints("");
  };

  return (
    <div className="border-t pt-2 space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
        <Plus className="h-3 w-3" /> Incluir serviço na auditoria
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selected}
          onValueChange={(v) => {
            setSelected(v);
            const svc = catalog.find((c) => c.id === v);
            setPoints(svc ? String(svc.points) : "");
          }}
        >
          <SelectTrigger className="h-8 text-xs w-[260px]">
            <SelectValue placeholder="Escolher serviço do catálogo" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {catalog.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.name} · {formatPoints(c.points)} pts
              </SelectItem>
            ))}
            <SelectItem value="__custom" className="text-xs">Outro serviço (digitar)</SelectItem>
          </SelectContent>
        </Select>

        {custom && (
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nome do serviço"
            className="h-8 text-xs w-[220px]"
          />
        )}

        <Input
          type="number" step="0.05" min={0}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="pts"
          className="h-8 w-20 text-xs text-right"
          aria-label="Pontos do serviço"
        />

        <Button size="sm" className="h-8" onClick={submit} disabled={!selected || (custom && !label.trim())}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Incluir
        </Button>
      </div>
    </div>
  );
}

/** Painel de auditoria: admin confere os serviços executados e aprova/ajusta os pontos. */
export default function OsAuditPanel({
  items, readOnly, onApprove, onAdjust, onFinalize, finalizing, showFinalize, catalog, onAddService, className,
}: Props) {
  const done = items.filter((i) => i.done);
  const requested = requestedPoints(items);
  const approved = approvedPoints(items);
  const pendingCount = done.filter((i) => i.approved === null || i.approved === undefined).length;

  if (!items.length) {
    return (
      <div className={cn("border rounded-md p-3 bg-muted/30 space-y-3", className)}>
        <p className="text-xs text-muted-foreground">Nenhum serviço pontuado nesta OS.</p>
        {!readOnly && onAddService && <AddServiceForm catalog={catalog} onAdd={onAddService} />}
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

      {!readOnly && onAddService && <AddServiceForm catalog={catalog} onAdd={onAddService} />}



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
