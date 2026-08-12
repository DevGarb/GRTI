import { useEffect, useState } from "react";
import { Sparkles, X, Loader2, AlertTriangle, CheckCircle2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServiceCategoryLeaves } from "@/hooks/useServiceCategories";
import { useTicketModal } from "@/contexts/TicketModalContext";

interface Proposal {
  ticket_id: string;
  title: string;
  category_id: string;
  category_path: string;
  score: number;
  technician_name: string | null;
}

interface PreviewResponse {
  proposals: Proposal[];
  totalTickets: number;
  totalPoints: number;
  byTechnician: { name: string; count: number; points: number }[];
}

export default function AiCloseApprovedModal({
  organizationId,
  onClose,
}: {
  organizationId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { openTicket } = useTicketModal();
  const { data: categoryLeaves = [] } = useServiceCategoryLeaves(organizationId);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [assignments, setAssignments] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.functions.invoke("close-approved-tickets-ai", {
        body: { organization_id: organizationId, action: "preview" },
      });
      if (cancelled) return;
      if (error || data?.error) {
        setError(data?.error || error?.message || "Erro ao analisar chamados com IA.");
        setLoading(false);
        return;
      }
      const res = data as PreviewResponse;
      setProposals(res.proposals || []);
      setAssignments(new Map((res.proposals || []).map((p) => [p.ticket_id, p.category_id])));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [organizationId]);

  const overrideCategory = (ticketId: string, categoryId: string) => {
    setAssignments((prev) => new Map(prev).set(ticketId, categoryId));
  };

  const categoryById = new Map(categoryLeaves.map((c) => [c.id, c]));
  const rows = proposals.map((p) => {
    const chosenId = assignments.get(p.ticket_id) || p.category_id;
    const chosen = categoryById.get(chosenId);
    return { ...p, chosenId, chosenPath: chosen?.path || p.category_path, chosenScore: chosen?.score ?? p.score };
  });
  const totalPoints = rows.reduce((s, r) => s + r.chosenScore, 0);
  const byTechnician = Array.from(
    rows.reduce((acc, r) => {
      const name = r.technician_name || "Sem técnico";
      const cur = acc.get(name) || { count: 0, points: 0 };
      cur.count += 1;
      cur.points += r.chosenScore;
      acc.set(name, cur);
      return acc;
    }, new Map<string, { count: number; points: number }>())
  ).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.points - a.points);

  const handleConfirm = async () => {
    setApplying(true);
    const { data, error } = await supabase.functions.invoke("close-approved-tickets-ai", {
      body: {
        organization_id: organizationId,
        action: "apply",
        assignments: rows.map((r) => ({ ticket_id: r.ticket_id, category_id: r.chosenId })),
      },
    });
    setApplying(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao fechar chamados.");
      return;
    }
    toast.success(`${data.closedCount} chamados fechados e pontuados pela IA!`);
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="relative shrink-0 overflow-hidden border-b border-border p-5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.07] via-cyan-400/[0.04] to-violet-500/[0.07]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-gradient-to-br from-sky-500/15 to-cyan-400/10 text-cyan-600 dark:text-cyan-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">Fechar Aprovados com IA</h2>
                <p className="text-sm text-muted-foreground">Classifica por categoria e pontua chamados aguardando fechamento.</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              <p className="text-sm text-muted-foreground">Analisando chamados aprovados com IA...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-sm text-muted-foreground">Nenhum chamado aprovado aguardando fechamento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                  {rows.length} chamados
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Trophy className="h-3 w-3" /> {totalPoints} pts no total
                </span>
                {byTechnician.map((t) => (
                  <span key={t.name} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    {t.name}: {t.count} chamados · {t.points} pts
                  </span>
                ))}
              </div>

              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-left font-mono-tech text-[11px] uppercase tracking-wider text-muted-foreground">Chamado</th>
                      <th className="px-3 py-2 text-left font-mono-tech text-[11px] uppercase tracking-wider text-muted-foreground">Categoria sugerida</th>
                      <th className="w-16 px-3 py-2 text-right font-mono-tech text-[11px] uppercase tracking-wider text-muted-foreground">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.ticket_id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.technician_name || "Sem técnico"}</p>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={r.chosenId}
                            onChange={(e) => overrideCategory(r.ticket_id, e.target.value)}
                            className="w-full rounded-lg border border-input bg-background/60 px-2 py-1.5 text-xs text-foreground"
                          >
                            {categoryLeaves.map((c) => (
                              <option key={c.id} value={c.id}>{c.path} ({c.score} pts)</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right font-mono-tech font-semibold text-foreground">{r.chosenScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {!loading && !error && rows.length > 0 && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-4">
            <button
              onClick={onClose}
              disabled={applying}
              className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={applying}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[hsl(207,95%,42%)] to-[hsl(190,90%,42%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_hsl(199_95%_50%/0.6)] disabled:opacity-50"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {applying ? "Fechando..." : `Fechar e pontuar ${rows.length} chamados`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
