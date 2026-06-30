import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  ANOMALY_LABELS, SEVERITY_ORDER, TmaAnomaly,
  useReviewAnomaly, useRunAnomalyDetection, useTmaAnomalies,
} from "@/hooks/useTmaAnomalies";
import { useTicketModal } from "@/contexts/TicketModalContext";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { formatDateBR } from "@/lib/dateFormat";

const severityStyles: Record<string, string> = {
  critica: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200",
  alta: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-200",
  media: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-200",
  baixa: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200",
};

export default function MetasRevisaoTMA() {
  const [includeResolved, setIncludeResolved] = useState(false);
  const { data: anomalies = [], isLoading } = useTmaAnomalies({ includeResolved });
  const runScan = useRunAnomalyDetection();
  const review = useReviewAnomaly();
  const { openTicket } = useTicketModal();
  const [dismissTarget, setDismissTarget] = useState<TmaAnomaly | null>(null);
  const [dismissNote, setDismissNote] = useState("");

  const grouped = useMemo(() => {
    const byTech = new Map<string, TmaAnomaly[]>();
    for (const a of anomalies) {
      const k = a.technician?.full_name || "Sem técnico atribuído";
      if (!byTech.has(k)) byTech.set(k, []);
      byTech.get(k)!.push(a);
    }
    for (const list of byTech.values()) {
      list.sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity]);
    }
    return [...byTech.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [anomalies]);

  const stats = useMemo(() => {
    const s = { critica: 0, alta: 0, media: 0, baixa: 0, total: anomalies.length };
    for (const a of anomalies) s[a.severity]++;
    return s;
  }, [anomalies]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-orange-500" />
              Revisão de TMA — Anomalias detectadas
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Chamados com sinais de cálculo de TMA inflado ou histórico incompleto.
              Nenhum cálculo é alterado automaticamente — toda correção é manual.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="resolved" checked={includeResolved} onCheckedChange={setIncludeResolved} />
              <Label htmlFor="resolved" className="text-xs">Incluir revisadas</Label>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runScan.mutate(90)}
              disabled={runScan.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${runScan.isPending ? "animate-spin" : ""}`} />
              Rodar varredura
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Crítica" value={stats.critica} tone="critica" />
            <StatCard label="Alta" value={stats.alta} tone="alta" />
            <StatCard label="Média" value={stats.media} tone="media" />
            <StatCard label="Baixa" value={stats.baixa} tone="baixa" />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
            Nenhuma anomalia pendente. 🎉
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={grouped.map(([k]) => k)} className="space-y-2">
          {grouped.map(([tech, list]) => (
            <AccordionItem key={tech} value={tech} className="border rounded-lg bg-card px-3">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tech}</span>
                  <Badge variant="secondary">{list.length}</Badge>
                  {list.some(a => a.severity === "critica") && (
                    <Badge className={severityStyles.critica}>crítica</Badge>
                  )}
                  {list.some(a => a.severity === "alta") && (
                    <Badge className={severityStyles.alta}>alta</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pb-2">
                  {list.map((a) => (
                    <AnomalyRow
                      key={a.id}
                      anomaly={a}
                      onOpen={() => openTicket(a.ticket_id)}
                      onReview={() => review.mutate({ id: a.id })}
                      onDismiss={() => { setDismissTarget(a); setDismissNote(""); }}
                      reviewed={!!a.reviewed_at}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Dialog open={!!dismissTarget} onOpenChange={(o) => !o && setDismissTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar anomalia</DialogTitle>
            <DialogDescription>
              Explique por que esta anomalia não é um problema real. A nota fica registrada.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={dismissNote}
            onChange={(e) => setDismissNote(e.target.value)}
            placeholder="Ex.: chamado migrado de outro sistema, histórico não existe."
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDismissTarget(null)}>Cancelar</Button>
            <Button
              disabled={!dismissNote.trim() || review.isPending}
              onClick={() => {
                if (!dismissTarget) return;
                review.mutate(
                  { id: dismissTarget.id, dismissed: true, notes: dismissNote.trim() },
                  { onSuccess: () => setDismissTarget(null) }
                );
              }}
            >
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className={`rounded-md border p-2 text-center ${tone ? severityStyles[tone] : "bg-muted/30"}`}>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function AnomalyRow({
  anomaly, onOpen, onReview, onDismiss, reviewed,
}: {
  anomaly: TmaAnomaly;
  onOpen: () => void;
  onReview: () => void;
  onDismiss: () => void;
  reviewed: boolean;
}) {
  const d = anomaly.details || {};
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2 rounded-md border bg-background p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={severityStyles[anomaly.severity]}>{anomaly.severity}</Badge>
          <span className="text-sm font-medium">{ANOMALY_LABELS[anomaly.anomaly_type] || anomaly.anomaly_type}</span>
          {reviewed && <Badge variant="outline" className="text-green-600">revisado</Badge>}
          {anomaly.dismissed && <Badge variant="outline" className="text-muted-foreground">descartado</Badge>}
        </div>
        <div className="text-sm text-foreground truncate">{anomaly.ticket?.title || anomaly.ticket_id}</div>
        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
          <span>Detectado: {formatDateBR(anomaly.detected_at)}</span>
          {d.raw_hours != null && <span>Bruto: {d.raw_hours}h</span>}
          {d.closed_at && <span>Fech.: {formatDateBR(d.closed_at)}</span>}
          {d.picked_at && <span>Atribuído: {formatDateBR(d.picked_at)}</span>}
          {anomaly.notes && <span className="italic">Nota: {anomaly.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" onClick={onOpen}>
          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
        </Button>
        {!reviewed && !anomaly.dismissed && (
          <>
            <Button size="sm" variant="outline" onClick={onReview}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Revisado
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              <XCircle className="h-3.5 w-3.5 mr-1" /> Descartar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
