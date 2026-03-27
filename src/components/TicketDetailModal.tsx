import { useState, useMemo } from "react";
import { X, User, Tag, Paperclip, Star, ChevronDown, ChevronRight, LayoutList, Play, CheckCircle2, RotateCcw, ThumbsUp, ThumbsDown, RefreshCw, HandMetal, AlertTriangle, Clock } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import type { Ticket } from "@/hooks/useTickets";
import { useUpdateTicket, usePickTicket, useTechnicianProfiles, useProfiles } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { dispatchWebhookEvent } from "@/hooks/useWebhooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import TicketComments from "@/components/ticket-detail/TicketComments";
import TicketHistory from "@/components/ticket-detail/TicketHistory";

const allStatuses = ["Aberto", "Em Andamento", "Aguardando Aprovação", "Aprovado", "Fechado", "Disponível"];

interface Category {
  id: string;
  name: string;
  level: string;
  parent_id: string | null;
  is_active: boolean;
  score: number | null;
}

interface Props {
  ticket: Ticket;
  onClose: () => void;
}

function CategoryTreePicker({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string, score: number | null) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const macros = categories.filter((c) => c.level === "macro" && !c.parent_id && c.is_active);
  const getChildren = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId && c.is_active);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderNode = (cat: Category, depth: number): JSX.Element => {
    const children = getChildren(cat.id);
    const isExpanded = expanded.has(cat.id);
    const isItem = cat.level === "item";
    const isSelected = selectedId === cat.id;

    return (
      <div key={cat.id} style={{ marginLeft: depth * 16 }}>
        <button
          type="button"
          onClick={() => {
            if (isItem) {
              onSelect(cat.id, cat.score);
            } else {
              toggleExpand(cat.id);
            }
          }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors text-left ${
            isSelected
              ? "bg-primary/10 text-primary font-medium"
              : isItem
              ? "hover:bg-muted/80 text-foreground cursor-pointer"
              : "hover:bg-muted/50 text-muted-foreground"
          }`}
        >
          {!isItem && (
            isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          {isItem && <LayoutList className="h-3.5 w-3.5 shrink-0" />}
          <span>{cat.name}</span>
          {isItem && cat.score != null && (
            <span className="ml-auto text-xs font-medium text-amber-600 dark:text-amber-400">
              {cat.score} pts
            </span>
          )}
        </button>
        {isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-0.5 bg-background">
      {macros.length === 0 ? (
        <p className="text-xs text-muted-foreground p-2">Nenhuma categoria cadastrada.</p>
      ) : (
        macros.map((cat) => renderNode(cat, 0))
      )}
    </div>
  );
}

export default function TicketDetailModal({ ticket, onClose }: Props) {
  const { hasRole, user } = useAuth();
  const isAdmin = hasRole("admin");
  const isSuperAdmin = hasRole("super_admin");
  const canEditPeople = isAdmin || isSuperAdmin;
  const isTecnico = hasRole("tecnico");
  const canChangeStatus = isAdmin || isTecnico;
  const updateTicket = useUpdateTicket();
  const pickTicket = usePickTicket();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(ticket.status);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evalScore, setEvalScore] = useState(0);
  const [evalHover, setEvalHover] = useState(0);
  const [evalComment, setEvalComment] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    (ticket as any).category_id || null
  );
  const [selectedCategoryScore, setSelectedCategoryScore] = useState<number | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: attachments = [] } = useQuery({
    queryKey: ["ticket-attachments", ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_attachments")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: existingEvaluation } = useQuery({
    queryKey: ["ticket-evaluation", ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("*")
        .eq("ticket_id", ticket.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: reworkCount = 0 } = useQuery({
    queryKey: ["ticket-rework-count", ticket.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ticket_history")
        .select("*", { count: "exact", head: true })
        .eq("ticket_id", ticket.id)
        .eq("action", "rework");
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return null;
    const cat = categories.find((c) => c.id === selectedCategoryId);
    if (!cat) return null;
    const parts = [cat.name];
    let parent = categories.find((c) => c.id === cat.parent_id);
    while (parent) {
      parts.unshift(parent.name);
      parent = categories.find((c) => c.id === parent!.parent_id);
    }
    return parts.join(" → ");
  }, [selectedCategoryId, categories]);

  // Record history entry
  const addHistory = async (action: string, oldValue?: string, newValue?: string) => {
    await supabase.from("ticket_history").insert({
      ticket_id: ticket.id,
      user_id: user!.id,
      action,
      old_value: oldValue || null,
      new_value: newValue || null,
    });
    queryClient.invalidateQueries({ queryKey: ["ticket-history", ticket.id] });
  };

  const submitEvaluation = useMutation({
    mutationFn: async () => {
      // Update category and close ticket
      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          category_id: selectedCategoryId,
          status: "Fechado",
        })
        .eq("id", ticket.id);
      if (updateError) throw updateError;

      const { error } = await supabase.from("evaluations").insert({
        ticket_id: ticket.id,
        evaluator_id: user!.id,
        score: evalScore,
        comment: evalComment || null,
        type: "meta",
      } as any);
      if (error) throw error;

      await addHistory("status_change", status, "Fechado");
      await addHistory("evaluated", undefined, `${evalScore}/5`);
    },
    onSuccess: () => {
      setStatus("Fechado");
      queryClient.invalidateQueries({ queryKey: ["ticket-evaluation", ticket.id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Avaliação enviada e chamado fechado!");
      dispatchWebhookEvent(ticket.id, "ticket_closed");
      setShowEvaluation(false);
    },
    onError: (e: Error) => {
      toast.error("Erro ao enviar avaliação: " + e.message);
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    const oldStatus = status;
    setStatus(newStatus);
    updateTicket.mutate({ id: ticket.id, status: newStatus });
    await addHistory("status_change", oldStatus, newStatus);
  };

  // Technician starts working
  const handleStartService = async () => {
    // Update started_at when technician begins
    await supabase.from("tickets").update({ started_at: new Date().toISOString() }).eq("id", ticket.id);
    await handleStatusChange("Em Andamento");
    await addHistory("started");
    dispatchWebhookEvent(ticket.id, "ticket_started");
  };

  // Technician marks as finished (sends to admin for approval)
  const handleFinishService = async () => {
    await handleStatusChange("Aguardando Aprovação");
    dispatchWebhookEvent(ticket.id, "ticket_finished");
  };

  // Admin approves and opens evaluation
  const handleApproveAndEvaluate = () => {
    handleStatusChange("Aprovado");
    setShowEvaluation(true);
    dispatchWebhookEvent(ticket.id, "ticket_approved");
  };

  // Solicitante approves the resolution
  const handleSolicitanteApprove = async () => {
    await handleStatusChange("Aprovado");
    await addHistory("approved", undefined, "Solicitante aprovou");
    dispatchWebhookEvent(ticket.id, "ticket_approved");
    toast.success("Chamado aprovado! Aguardando avaliação do administrador.");
  };

  // Solicitante rejects - sends back for rework
  const handleSolicitanteReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Informe o motivo da reprovação.");
      return;
    }
    await handleStatusChange("Em Andamento");
    await addHistory("rework", "Aguardando Aprovação", `Retrabalho: ${rejectReason.trim()}`);
    dispatchWebhookEvent(ticket.id, "ticket_rejected", { reason: rejectReason.trim() });
    toast.info("Chamado reprovado e devolvido ao técnico para retrabalho.");
    setShowRejectForm(false);
    setRejectReason("");

    // Notify technician via WhatsApp
    supabase.functions.invoke("send-whatsapp", {
      body: { ticket_id: ticket.id, event_type: "rework" },
    }).catch(() => {});
  };

  const isOpen = status === "Aberto";
  const isInProgress = status === "Em Andamento";
  const isAwaitingApproval = status === "Aguardando Aprovação";
  const isApproved = status === "Aprovado";
  const isClosed = status === "Fechado";
  const isDisponivel = status === "Disponível";
  const isSolicitante = ticket.created_by === user?.id;

  // Technician assigned to this ticket
  const isAssigned = ticket.assigned_to === user?.id;

  // SLA info
  const slaDeadline = ticket.sla_deadline ? new Date(ticket.sla_deadline) : null;
  const now = new Date();
  const slaExpired = slaDeadline ? now > slaDeadline : false;
  const slaRemainingMs = slaDeadline ? slaDeadline.getTime() - now.getTime() : 0;
  const slaRemainingHours = Math.max(0, Math.floor(slaRemainingMs / (1000 * 60 * 60)));
  const slaRemainingMinutes = Math.max(0, Math.floor((slaRemainingMs % (1000 * 60 * 60)) / (1000 * 60)));

  const handlePickTicket = async () => {
    pickTicket.mutate(ticket.id);
    setStatus("Em Andamento");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold text-foreground truncate">{ticket.title}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <p className="text-xs text-muted-foreground">
                {new Date(ticket.created_at).toLocaleDateString("pt-BR")}
              </p>
              <StatusBadge status={status} />
              {reworkCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                  <RefreshCw className="h-3 w-3" />
                  Retrabalho ({reworkCount}x)
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Tag className="h-3 w-3" /> {ticket.type}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</span>
            <div className="p-4 rounded-lg bg-muted/30 border border-border text-sm text-foreground whitespace-pre-wrap">
              {ticket.description || "Sem descrição."}
            </div>
          </div>

          {/* People */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Solicitante</span>
              <span className="text-sm font-medium text-foreground">{ticket.creatorProfile?.full_name || "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Técnico Responsável</span>
              <span className="text-sm font-medium text-foreground">{ticket.assignedProfile?.full_name || "Não atribuído"}</span>
            </div>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Prioridade</span>
            <PriorityBadge priority={ticket.priority} />
          </div>

          {/* Status selector for admin */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Status</span>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                {allStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Selected category display */}
          {selectedCategoryName && !showEvaluation && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <LayoutList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Categoria do Serviço</p>
                <p className="text-sm font-medium text-foreground">{selectedCategoryName}</p>
              </div>
              {selectedCategoryScore != null && (
                <span className="ml-auto text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {selectedCategoryScore} pts
                </span>
              )}
            </div>
          )}

          {/* SLA Info */}
          {(isOpen || isDisponivel) && slaDeadline && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${
              slaExpired || isDisponivel
                ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700"
                : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            }`}>
              {slaExpired || isDisponivel ? (
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              ) : (
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">SLA de Início</p>
                <p className={`text-sm font-medium ${
                  slaExpired || isDisponivel ? "text-red-700 dark:text-red-400" : "text-foreground"
                }`}>
                  {slaExpired || isDisponivel
                    ? "SLA Expirado — chamado disponível para reatribuição"
                    : `${slaRemainingHours}h ${slaRemainingMinutes}min restantes`
                  }
                </p>
              </div>
            </div>
          )}

          {/* === ACTION BUTTONS === */}

          {/* Technician: Pick available ticket */}
          {isTecnico && isDisponivel && (
            <button
              onClick={handlePickTicket}
              disabled={pickTicket.isPending}
              className="w-full py-3 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <HandMetal className="h-4 w-4" />
              Pegar para mim
            </button>
          )}

          {/* Technician: Iniciar Atendimento (when ticket is Open and assigned) */}
          {isTecnico && isOpen && (isAssigned || isAdmin) && (
            <button
              onClick={handleStartService}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Play className="h-4 w-4" />
              Iniciar Atendimento
            </button>
          )}

          {/* Technician: Finalizar Atendimento (when in progress) */}
          {isTecnico && isInProgress && (isAssigned || isAdmin) && (
            <button
              onClick={handleFinishService}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Finalizar Atendimento
            </button>
          )}

          {/* Solicitante: Aprovar ou Reprovar (when awaiting approval) */}
          {isSolicitante && isAwaitingApproval && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                O técnico finalizou o atendimento. O problema foi resolvido?
              </p>

              {showRejectForm ? (
                <div className="space-y-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Motivo da reprovação *
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Descreva por que o problema não foi resolvido..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectReason(""); }}
                      className="flex-1 py-2 rounded-lg border border-input text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSolicitanteReject}
                      disabled={!rejectReason.trim()}
                      className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      Confirmar Reprovação
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 py-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Não, Retrabalhar
                  </button>
                  <button
                    onClick={handleSolicitanteApprove}
                    className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Sim, Aprovar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Admin: Aguardando aprovação do solicitante */}
          {isAdmin && isAwaitingApproval && !isSolicitante && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-sm text-muted-foreground">
                Aguardando aprovação do solicitante.
              </p>
            </div>
          )}

          {/* Admin: Evaluate closed/approved tickets without evaluation */}
          {isAdmin && !existingEvaluation && !showEvaluation && (isApproved || isClosed) && (
            <button
              onClick={() => setShowEvaluation(true)}
              className="w-full py-2.5 rounded-lg border border-input bg-muted/50 text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
            >
              <Star className="h-4 w-4" />
              Avaliar Atendimento
            </button>
          )}

          {/* Evaluation form (admin only) */}
          {showEvaluation && (
            <div className="space-y-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
              <h3 className="text-sm font-semibold text-foreground">Avaliar e Pontuar</h3>

              {/* Category selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutList className="h-3.5 w-3.5" />
                  Categoria do Serviço (Item)
                </label>
                {selectedCategoryName ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                    <span className="text-sm text-foreground">{selectedCategoryName}</span>
                    <div className="flex items-center gap-2">
                      {selectedCategoryScore != null && (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {selectedCategoryScore} pts
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(null);
                          setSelectedCategoryScore(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Alterar
                      </button>
                    </div>
                  </div>
                ) : (
                  <CategoryTreePicker
                    categories={categories}
                    selectedId={selectedCategoryId}
                    onSelect={(id, score) => {
                      setSelectedCategoryId(id);
                      setSelectedCategoryScore(score);
                    }}
                  />
                )}
              </div>

              {/* Star rating */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Nota de atendimento
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEvalScore(star)}
                      onMouseEnter={() => setEvalHover(star)}
                      onMouseLeave={() => setEvalHover(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          star <= (evalHover || evalScore)
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                  {evalScore > 0 && (
                    <span className="ml-2 text-sm text-muted-foreground">{evalScore}/5</span>
                  )}
                </div>
              </div>

              <textarea
                value={evalComment}
                onChange={(e) => setEvalComment(e.target.value)}
                placeholder="Comentário (opcional)..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEvaluation(false)}
                  className="flex-1 py-2 rounded-lg border border-input text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={evalScore === 0 || !selectedCategoryId || submitEvaluation.isPending}
                  onClick={() => submitEvaluation.mutate()}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitEvaluation.isPending ? "Enviando..." : "Enviar Avaliação"}
                </button>
              </div>
            </div>
          )}

          {/* Existing evaluation */}
          {existingEvaluation && (
            <div className="space-y-2 p-4 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Star className="h-3.5 w-3.5" />
                Avaliação
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${star <= existingEvaluation.score ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
                  />
                ))}
                <span className="ml-2 text-sm font-medium text-foreground">{existingEvaluation.score}/5</span>
              </div>
              {existingEvaluation.comment && (
                <p className="text-sm text-muted-foreground">{existingEvaluation.comment}</p>
              )}
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Paperclip className="h-3.5 w-3.5" />
                Anexos ({attachments.length})
              </div>
              <div className="space-y-1.5">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm text-foreground"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    {att.file_name || "Arquivo"}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <TicketComments ticketId={ticket.id} />

          {/* History */}
          <TicketHistory ticketId={ticket.id} createdAt={ticket.created_at} />
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
