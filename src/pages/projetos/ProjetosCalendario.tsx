import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBacklog, useRescheduleTask } from "@/hooks/useBacklog";
import { useProjects } from "@/hooks/useProjects";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function colorFor(status: string, planned: string | null) {
  if (status === "Concluído") return "bg-emerald-500/20 border-emerald-500/50 text-emerald-800 dark:text-emerald-200";
  const isLate = planned && new Date(planned) < new Date() && status !== "Concluído";
  if (isLate) return "bg-red-500/20 border-red-500/50 text-red-800 dark:text-red-200";
  if (status === "Em Desenvolvimento" || status === "Em Homologação")
    return "bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-200";
  return "bg-blue-500/20 border-blue-500/50 text-blue-800 dark:text-blue-200";
}

export default function ProjetosCalendario() {
  const [cursor, setCursor] = useState(new Date());
  const [reschedule, setReschedule] = useState<{ taskId: string; oldDate: string | null; newDate: string } | null>(null);
  const [reason, setReason] = useState("");
  const { data: items = [] } = useBacklog();
  const { data: projects = [] } = useProjects();
  const reschedMut = useRescheduleTask();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    const push = (k: string, v: any) => {
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(v);
    };
    items.forEach((i) => {
      if (!i.planned_date) return;
      push(i.planned_date, { ...i, _kind: "task" });
    });
    projects.forEach((p: any) => {
      if (!p.end_date) return;
      const status = p.completed_at ? "Concluído" : (p.status || "Planejada");
      push(p.end_date, {
        id: `proj-${p.id}`,
        title: `📁 ${p.name}`,
        project_name: p.name,
        status,
        planned_date: p.end_date,
        _kind: "project",
      });
    });
    return map;
  }, [items, projects]);

  function onDragStart(e: React.DragEvent, item: any) {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: item.id, planned: item.planned_date }));
  }

  function onDropDay(e: React.DragEvent, day: Date) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const payload = JSON.parse(raw);
    const newDate = format(day, "yyyy-MM-dd");
    if (payload.planned === newDate) return;
    setReschedule({ taskId: payload.id, oldDate: payload.planned, newDate });
    setReason("");
  }

  function confirmReschedule() {
    if (!reschedule) return;
    if (!reason.trim()) {
      toast.error("Justificativa obrigatória");
      return;
    }
    reschedMut.mutate(
      { ...reschedule, reason: reason.trim() },
      { onSuccess: () => setReschedule(null) }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Calendário de Entregas</h1>
          <p className="text-sm text-muted-foreground">
            Arraste uma entrega para outro dia para reagendar (justificativa obrigatória).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => setCursor(addMonths(cursor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium capitalize w-40 text-center">
            {format(cursor, "MMMM yyyy", { locale: ptBR })}
          </div>
          <Button size="icon" variant="outline" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" />Entregue</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500" />Planejada</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500" />Em andamento</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" />Atrasada</span>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="bg-muted/50 px-2 py-1.5 text-[11px] font-medium text-center">{d}</div>
        ))}
        {days.map((day) => {
          const k = format(day, "yyyy-MM-dd");
          const dayItems = byDay.get(k) || [];
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={k}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropDay(e, day)}
              className={cn(
                "bg-card min-h-[110px] p-1.5 text-xs",
                !inMonth && "opacity-40",
                isToday && "ring-2 ring-primary ring-inset"
              )}
            >
              <div className="text-[10px] text-muted-foreground mb-1">{format(day, "d")}</div>
              <div className="space-y-1">
                {dayItems.slice(0, 4).map((it: any) => (
                  <div
                    key={it.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, it)}
                    title={`${it.title} — ${it.project_name || ""}`}
                    className={cn(
                      "px-1.5 py-0.5 rounded border text-[10px] truncate cursor-grab active:cursor-grabbing",
                      colorFor(it.status, it.planned_date)
                    )}
                  >
                    {it.title}
                  </div>
                ))}
                {dayItems.length > 4 && (
                  <div className="text-[10px] text-muted-foreground">+{dayItems.length - 4} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!reschedule} onOpenChange={(v) => !v && setReschedule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar entrega</DialogTitle>
            <DialogDescription>
              {reschedule && (
                <>
                  De {reschedule.oldDate ? format(parseISO(reschedule.oldDate), "dd/MM/yyyy") : "—"} para{" "}
                  {format(parseISO(reschedule.newDate), "dd/MM/yyyy")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Justificativa *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReschedule(null)}>Cancelar</Button>
            <Button onClick={confirmReschedule} disabled={reschedMut.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
