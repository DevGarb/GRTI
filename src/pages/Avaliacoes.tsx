import { Star, Search, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Avaliacoes() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "new">("list");
  const { user, profile, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = hasRole("admin");

  // Form state
  const [selectedTicket, setSelectedTicket] = useState("");
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");

  const orgId = profile?.organization_id;

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["evaluations", orgId],
    queryFn: async () => {
      let query = supabase
        .from("evaluations")
        .select("*, tickets(title, organization_id)")
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Filter by org through tickets
      const filtered = orgId
        ? data.filter((e: any) => e.tickets?.organization_id === orgId)
        : data;

      const userIds = [...new Set(filtered.map((e: any) => e.evaluator_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : { data: [] };

      const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

      return filtered.map((e: any) => ({
        ...e,
        evaluatorName: nameMap.get(e.evaluator_id) || "Desconhecido",
        ticketTitle: e.tickets?.title || "—",
      }));
    },
  });

  // Tickets for the form (resolved, same org)
  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-for-eval", orgId],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select("id, title")
        .eq("status", "Resolvido")
        .order("created_at", { ascending: false });

      if (orgId) {
        query = query.eq("organization_id", orgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: activeTab === "new",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicket || score === 0) throw new Error("Preencha todos os campos obrigatórios.");
      const { error } = await supabase.from("evaluations").insert({
        ticket_id: selectedTicket,
        evaluator_id: user!.id,
        score,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      setSelectedTicket("");
      setScore(0);
      setComment("");
      setActiveTab("list");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Non-admins only see their own evaluations
  const visibleEvaluations = isAdmin
    ? evaluations
    : evaluations.filter((e: any) => e.evaluator_id === user?.id);

  const filtered = visibleEvaluations.filter(
    (e: any) =>
      e.evaluatorName.toLowerCase().includes(search.toLowerCase()) ||
      e.ticketTitle.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore =
    visibleEvaluations.length > 0
      ? (visibleEvaluations.reduce((sum: number, e: any) => sum + e.score, 0) / visibleEvaluations.length).toFixed(1)
      : "—";

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Star className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Avaliações</h1>
            <p className="text-sm text-muted-foreground">Avaliações de atendimento dos chamados</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "list"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Avaliações
        </button>
        <button
          onClick={() => setActiveTab("new")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === "new"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          Nova Avaliação
        </button>
      </div>

      {activeTab === "list" ? (
        <>
          {/* Summary */}
          <div className={`grid gap-3 ${isAdmin ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
            <div className="card-elevated p-4 text-center">
              <span className="text-2xl font-bold text-foreground">{visibleEvaluations.length}</span>
              <p className="text-[11px] text-muted-foreground mt-1">Total de Avaliações</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <span className="text-2xl font-bold text-foreground">{avgScore}</span>
              <p className="text-[11px] text-muted-foreground mt-1">Nota Média</p>
            </div>
            {isAdmin && (
              <div className="card-elevated p-4 text-center">
                <span className="text-2xl font-bold text-foreground">
                  {visibleEvaluations.filter((e: any) => e.score >= 9).length}
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">Promotores (9-10)</p>
              </div>
            )}
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por avaliador ou chamado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          {isLoading ? (
            <div className="card-elevated p-12 flex items-center justify-center">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card-elevated p-12 text-center text-sm text-muted-foreground">
              Nenhuma avaliação encontrada.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((ev: any) => (
                <div key={ev.id} className="card-elevated p-4 flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{ev.evaluatorName}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }, (_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < ev.score ? "text-amber-500 fill-amber-500" : "text-muted"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-foreground">{ev.score}/10</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Chamado: {ev.ticketTitle}
                    </p>
                    {ev.comment && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{ev.comment}"</p>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(ev.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* New Evaluation Form */
        <div className="card-elevated p-6 space-y-5 max-w-lg">
          <h2 className="text-lg font-semibold text-foreground">Registrar Avaliação</h2>

          <div>
            <label className="text-sm font-medium text-foreground">Chamado *</label>
            <select
              value={selectedTicket}
              onChange={(e) => setSelectedTicket(e.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            >
              <option value="">Selecione um chamado resolvido</option>
              {tickets.map((t: any) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Nota *</label>
            <div className="flex gap-1 mt-2">
              {Array.from({ length: 10 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setScore(i + 1)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      i < score ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
              {score > 0 && (
                <span className="ml-2 text-sm font-bold text-foreground self-center">{score}/10</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Comentário (opcional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descreva sua experiência..."
              maxLength={500}
              rows={3}
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
            />
          </div>

          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !selectedTicket || score === 0}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createMutation.isPending ? "Salvando..." : "Registrar Avaliação"}
          </button>
        </div>
      )}
    </div>
  );
}
