import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Search, Filter, ChevronDown, ChevronRight, Plus, User, RefreshCw, Inbox,
  SendHorizonal, HandMetal, AlertTriangle, Clock, TicketCheck, CircleDot,
  Loader2, CheckCircle2, LayoutGrid, List, Trophy, CheckSquare, Trash2, X,
  MessageSquare, Sparkles,
} from "lucide-react";
import KanbanBoard from "@/components/KanbanBoard";
import MonthSelector, { getCurrentMonthValue, getMonthDateRange } from "@/components/MonthSelector";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { useTickets, Ticket, useBulkDeleteTickets, useTechnicianProfiles } from "@/hooks/useTickets";
import { formatTicketNumber, normalizeTicketNumberQuery } from "@/lib/ticketNumber";
import { buildScoreMap, computeScoreBreakdown } from "@/lib/sprintScoring";
import { useAuth } from "@/contexts/AuthContext";
import NewTicketWizardModal from "@/components/NewTicketWizardModal";
import PendingApprovalGateDialog from "@/components/PendingApprovalGateDialog";
import { usePendingApprovalTickets } from "@/hooks/usePendingApprovalTickets";
import TicketDetailModal from "@/components/TicketDetailModal";
import AssignTicketModal from "@/components/AssignTicketModal";
import AiCloseApprovedModal from "@/components/chamados/AiCloseApprovedModal";
import ChamadosTabs from "@/components/chamados/ChamadosTabs";
import { supabase } from "@/integrations/supabase/client";
import MyGoalCard from "@/components/metas/MyGoalCard";
import { formatBusinessTime, getSlaStatus } from "@/lib/businessHours";
import { fetchTicketWorkMinutes } from "@/lib/ticketTiming";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDateBR } from "@/lib/dateFormat";

const allStatuses = ["Aberto", "Em Andamento", "Aguardando Aprovação", "Aprovado", "Fechado", "Disponível"];

// Rail de status à esquerda de cada linha + cor de texto/badge. Funciona em claro e escuro.
const STATUS_META: Record<string, { rail: string; bar: string; bg: string; text: string }> = {
  "Aberto":               { rail: "#ef4444", bar: "bg-red-500",     bg: "bg-red-100 dark:bg-red-900/30",       text: "text-red-600 dark:text-red-400" },
  "Em Andamento":         { rail: "#f59e0b", bar: "bg-amber-500",   bg: "bg-amber-100 dark:bg-amber-900/30",   text: "text-amber-600 dark:text-amber-400" },
  "Aguardando Aprovação": { rail: "#8b5cf6", bar: "bg-violet-500",  bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600 dark:text-violet-400" },
  "Aprovado":             { rail: "#0ea5e9", bar: "bg-sky-500",     bg: "bg-sky-100 dark:bg-sky-900/30",       text: "text-sky-600 dark:text-sky-400" },
  "Fechado":              { rail: "#10b981", bar: "bg-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  "Disponível":           { rail: "#dc2626", bar: "bg-red-600",     bg: "bg-red-100 dark:bg-red-900/30",       text: "text-red-600 dark:text-red-400" },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function SlaTimer({ ticket, workMinutes }: { ticket: Ticket; workMinutes?: number }) {
  const isClosed = ticket.status === "Fechado";
  const isWorking = ticket.status === "Em Andamento";
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isWorking) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [isWorking]);

  if (workMinutes === undefined && !ticket.started_at) {
    return (
      <span className="inline-flex items-center gap-1 font-mono-tech text-xs text-muted-foreground italic">
        <Clock className="h-3 w-3" />
        Aguardando
      </span>
    );
  }

  const elapsed = workMinutes ?? 0;
  const label = formatBusinessTime(elapsed);

  if (!isWorking) {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono-tech text-xs text-muted-foreground"
        title={isClosed ? "Tempo total de atendimento" : "Atendimento pausado"}
      >
        <Clock className="h-3 w-3" />
        {label}
      </span>
    );
  }

  const sla = getSlaStatus(elapsed, ticket.priority);
  const colors = {
    ok:   "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    warn: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    crit: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-mono-tech text-xs font-medium ${colors[sla]}`}
      title="Tempo de trabalho do técnico (atualizado em tempo real)"
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}

function TicketRows({
  tickets, onSelect, scoreMap, showScore, workMinutesMap, monthFrom, monthTo,
  selectionMode, selectedIds, onToggleSelect, onToggleSelectAll, unreadIds,
}: {
  tickets: Ticket[]; onSelect: (t: Ticket) => void; scoreMap?: Map<string, number>;
  showScore?: boolean; workMinutesMap?: Map<string, number>; monthFrom?: Date; monthTo?: Date;
  selectionMode?: boolean; selectedIds?: Set<string>; onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (ids: string[]) => void; unreadIds?: Set<string>;
}) {
  const allIds = tickets.map((t) => t.id);
  const selectedInGroup = selectionMode && selectedIds ? allIds.filter((id) => selectedIds.has(id)).length : 0;
  const allChecked = selectionMode && tickets.length > 0 && selectedInGroup === tickets.length;
  const someChecked = selectionMode && selectedInGroup > 0 && selectedInGroup < tickets.length;

  return (
    <div>
      {/* Cabeçalho de colunas — some no mobile */}
      <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-border text-[11px] font-mono-tech uppercase tracking-wider text-muted-foreground">
        {selectionMode && (
          <span className="w-5 shrink-0">
            <Checkbox
              checked={allChecked ? true : someChecked ? "indeterminate" : false}
              onCheckedChange={() => onToggleSelectAll?.(allIds)}
              aria-label="Selecionar todos"
            />
          </span>
        )}
        <span className="flex-1 min-w-0">Chamado</span>
        <span className="w-36 shrink-0">Solicitante</span>
        <span className="w-36 shrink-0">Status</span>
        <span className="w-24 shrink-0">Data</span>
        <span className="w-24 shrink-0">SLA</span>
        <span className="w-24 shrink-0">Prioridade</span>
        {showScore && <span className="w-16 shrink-0 text-right">Pts</span>}
      </div>

      <div>
        {tickets.map((ticket) => {
          const score = scoreMap?.get(ticket.id);
          const createdAt = new Date(ticket.created_at);
          const isFromOtherMonth = !!(monthFrom && monthTo) && (createdAt < monthFrom || createdAt > monthTo);
          const isSelected = selectionMode && selectedIds?.has(ticket.id);
          const meta = STATUS_META[ticket.status];

          return (
            <div
              key={ticket.id}
              onClick={() => (selectionMode ? onToggleSelect?.(ticket.id) : onSelect(ticket))}
              style={{ boxShadow: `inset 3px 0 0 0 ${meta?.rail || "transparent"}` }}
              className={`group flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/40 ${
                isSelected ? "bg-primary/5" : ""
              }`}
            >
              {selectionMode && (
                <span className="w-5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={!!isSelected}
                    onCheckedChange={() => onToggleSelect?.(ticket.id)}
                    aria-label="Selecionar chamado"
                  />
                </span>
              )}

              {/* Chamado: Nº mono + título + badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {formatTicketNumber(ticket.ticket_number) && (
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono-tech text-[11px] font-semibold text-muted-foreground">
                      {formatTicketNumber(ticket.ticket_number)}
                    </span>
                  )}
                  <span className="truncate text-sm font-medium text-foreground">{ticket.title}</span>
                  {unreadIds?.has(ticket.id) && (
                    <span title="Novo comentário do técnico" className="inline-flex shrink-0 items-center justify-center text-primary animate-pulse">
                      <MessageSquare className="h-4 w-4" fill="currentColor" />
                    </span>
                  )}
                  {isFromOtherMonth && (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      title={`Pendente de ${createdAt.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`}
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {createdAt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}/{String(createdAt.getFullYear()).slice(-2)}
                    </span>
                  )}
                  {(ticket.reworkCount || 0) > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-200 bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                      <RefreshCw className="h-2.5 w-2.5" />
                      {ticket.reworkCount}x
                    </span>
                  )}
                </div>
                {/* Linha secundária no mobile */}
                <div className="mt-1 flex items-center gap-2 md:hidden">
                  <StatusBadge status={ticket.status} />
                  <span className="text-xs text-muted-foreground truncate">{ticket.creatorProfile?.full_name || "—"}</span>
                </div>
              </div>

              <span className="hidden md:block w-36 shrink-0 truncate text-sm text-muted-foreground">
                {ticket.creatorProfile?.full_name || "—"}
              </span>
              <span className="hidden md:block w-36 shrink-0">
                <StatusBadge status={ticket.status} />
              </span>
              <span className="hidden md:block w-24 shrink-0 font-mono-tech text-xs text-muted-foreground">
                {formatDateBR(ticket.created_at)}
              </span>
              <span className="hidden md:block w-24 shrink-0">
                <SlaTimer ticket={ticket} workMinutes={workMinutesMap?.get(ticket.id)} />
              </span>
              <span className="hidden md:block w-24 shrink-0">
                <PriorityBadge priority={ticket.priority} />
              </span>
              {showScore && (
                <span className="hidden md:flex w-16 shrink-0 justify-end">
                  {score !== undefined && score > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Trophy className="h-3 w-3" />
                      {score}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AvailableTicketsSection({
  tickets, onSelect, onAssign, title, description, variant = "expired",
}: {
  tickets: Ticket[]; onSelect: (t: Ticket) => void; onAssign: (id: string) => void;
  title?: string; description?: string; variant?: "expired" | "open";
}) {
  const isExpired = variant === "expired";
  const accent = isExpired
    ? { border: "border-red-300 dark:border-red-800", bg: "bg-red-50/60 dark:bg-red-950/20", icon: "text-red-600 dark:text-red-400", title: "text-red-700 dark:text-red-400", desc: "text-red-600/70 dark:text-red-400/70", Icon: AlertTriangle }
    : { border: "border-amber-300 dark:border-amber-800", bg: "bg-amber-50/60 dark:bg-amber-950/20", icon: "text-amber-600 dark:text-amber-400", title: "text-amber-700 dark:text-amber-400", desc: "text-amber-600/70 dark:text-amber-400/70", Icon: Clock };
  const { Icon } = accent;

  return (
    <div className={`overflow-hidden rounded-2xl border-2 ${accent.border} bg-card shadow-sm`}>
      <div className={`flex items-center gap-2 border-b border-border px-4 py-3 ${accent.bg}`}>
        <Icon className={`h-4 w-4 ${accent.icon}`} />
        <div className="flex-1">
          <h2 className={`font-display text-sm font-semibold ${accent.title}`}>{title || "Disponíveis para assumir"}</h2>
          <p className={`text-xs ${accent.desc}`}>{description || `${tickets.length} chamado${tickets.length !== 1 ? "s" : ""} com SLA expirado`}</p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelect(ticket)}>
              <div className="flex items-center gap-2">
                {formatTicketNumber(ticket.ticket_number) && (
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono-tech text-[11px] font-semibold text-muted-foreground">
                    {formatTicketNumber(ticket.ticket_number)}
                  </span>
                )}
                <p className="truncate text-sm font-medium text-foreground">{ticket.title}</p>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <span className="text-xs text-muted-foreground">{ticket.creatorProfile?.full_name || "—"}</span>
              </div>
            </div>
            <button
              onClick={() => onAssign(ticket.id)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <HandMetal className="h-4 w-4" />
              Atribuir para mim
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ Icon, title, count, children }: { Icon: any; title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <Icon className="h-4 w-4 text-primary" />
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{count} chamado{count !== 1 ? "s" : ""}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function ChamadosTI() {
  const reduce = useReducedMotion();
  const [showModal, setShowModal] = useState(false);
  const [showPendingGate, setShowPendingGate] = useState(false);
  const { data: pendingApproval = [], refetch: refetchPendingApproval } = usePendingApprovalTickets();
  const handleNewTicketClick = async () => {
    const { data } = await refetchPendingApproval();
    if ((data?.length ?? pendingApproval.length) > 0) setShowPendingGate(true);
    else setShowModal(true);
  };
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [assignTicketId, setAssignTicketId] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos Status");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue());
  const [reworkFilter, setReworkFilter] = useState(false);
  const [requesterFilter, setRequesterFilter] = useState("");
  const [technicianFilter, setTechnicianFilter] = useState("");
  const [numberFilter, setNumberFilter] = useState("");
  const { data: technicianProfiles = [] } = useTechnicianProfiles();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAiClose, setShowAiClose] = useState(false);
  const bulkDelete = useBulkDeleteTickets();
  const { data: tickets = [], isLoading } = useTickets();
  const { roles, user, profile } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isTech = roles.includes("tecnico") || roles.includes("desenvolvedor");
  const approvedCount = tickets.filter((t) => t.status === "Aprovado").length;

  const { from: monthFrom, to: monthTo } = getMonthDateRange(selectedMonth);

  const inRange = (iso: string | null | undefined) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= monthFrom && d <= monthTo;
  };
  const filtered = tickets.filter((t: any) => {
    const matchSearch =
      t.title.toLowerCase().includes(searchText.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (t.creatorProfile?.full_name || "").toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === "Todos Status" || t.status === statusFilter;
    const PENDING_STATUSES = ["Aberto", "Em Andamento", "Aguardando Aprovação", "Aprovado", "Disponível"];
    const isPending = PENDING_STATUSES.includes(t.status);
    const matchPeriod = isPending ? inRange(t.created_at) : inRange(t.closed_at) || (!t.closed_at && inRange(t.updated_at));
    const matchRework = !reworkFilter || (t.reworkCount || 0) > 0;
    const matchRequester = !requesterFilter || t.created_by === requesterFilter;
    const matchTechnician = !technicianFilter || t.assigned_to === technicianFilter;
    const normalizedQuery = normalizeTicketNumberQuery(numberFilter);
    const matchNumber = !normalizedQuery || (t.ticket_number != null && String(t.ticket_number).includes(normalizedQuery));
    return matchSearch && matchStatus && (matchPeriod || isPending) && matchRework && matchRequester && matchTechnician && matchNumber;
  });

  const requesterOptions = Array.from(
    new Map(
      tickets
        .filter((t) => t.created_by && t.creatorProfile?.full_name)
        .map((t) => [t.created_by, t.creatorProfile!.full_name])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const closedByMe = tickets.filter((t: any) => {
    if (t.assigned_to !== user?.id || t.status !== "Fechado") return false;
    return inRange(t.closed_at) || (!t.closed_at && inRange(t.updated_at));
  });
  const closedTicketIds = closedByMe.map((t) => t.id);

  const { data: myEvalScore = 0 } = useQuery({
    queryKey: ["my-score", user?.id, selectedMonth, closedTicketIds.join(",")],
    queryFn: async () => {
      if (!user?.id || closedTicketIds.length === 0) return 0;
      const { data: evals, error } = await supabase
        .from("evaluations").select("score").eq("type", "meta").in("ticket_id", closedTicketIds);
      if (error) throw error;
      return (evals || []).reduce((sum, e) => sum + (e.score || 0), 0);
    },
    enabled: !!user?.id && !isAdmin && closedTicketIds.length > 0,
  });

  // Chamados de crédito de sprint (tipo "Projeto") não recebem avaliação de pontuação:
  // usam o story_points, mesma regra das Metas e do MVP.
  const scoreBreakdown = computeScoreBreakdown(myEvalScore, closedByMe as any);
  const myScore = scoreBreakdown.total;
  const [showScoreDetail, setShowScoreDetail] = useState(false);


  const closedFilteredIds = filtered.filter((t) => t.status === "Fechado").map((t) => t.id);
  const { data: evalScoreMap = new Map<string, number>() } = useQuery({
    queryKey: ["ticket-scores", closedFilteredIds.join(",")],
    queryFn: async () => {
      const map = new Map<string, number>();
      if (closedFilteredIds.length === 0) return map;
      const { data: evals, error } = await supabase
        .from("evaluations").select("ticket_id, score").eq("type", "meta").in("ticket_id", closedFilteredIds);
      if (error) throw error;
      (evals || []).forEach((e) => map.set(e.ticket_id, e.score || 0));
      return map;
    },
    enabled: closedFilteredIds.length > 0,
  });

  const scoreMap = buildScoreMap(evalScoreMap, filtered as any);



  const filteredIdsKey = filtered.map((t) => t.id).sort().join(",");
  const { data: workMinutesMap = new Map<string, number>() } = useQuery({
    queryKey: ["ticket-work-minutes", filteredIdsKey],
    queryFn: () =>
      fetchTicketWorkMinutes(
        filtered.map((t) => ({ id: t.id, started_at: t.started_at, created_at: t.created_at, status: t.status, updated_at: t.updated_at }))
      ),
    enabled: filtered.length > 0,
  });

  const myCreatedTickets = filtered.filter((t) => t.created_by === user?.id);
  const myCreatedIds = myCreatedTickets.map((t) => t.id);
  const { data: unreadIds = new Set<string>() } = useQuery({
    queryKey: ["ticket-unread-comments", user?.id, myCreatedIds.join(",")],
    queryFn: async () => {
      const set = new Set<string>();
      if (!user?.id || myCreatedIds.length === 0) return set;
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("ticket_id, created_at, user_id, is_public")
        .in("ticket_id", myCreatedIds).eq("is_public", true).neq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const lastByTicket = new Map<string, string>();
      (data || []).forEach((c: any) => { if (!lastByTicket.has(c.ticket_id)) lastByTicket.set(c.ticket_id, c.created_at); });
      myCreatedTickets.forEach((t: any) => {
        const last = lastByTicket.get(t.id);
        if (!last) return;
        const seen = t.last_seen_by_requester_at || t.created_at;
        if (new Date(last) > new Date(seen)) set.add(t.id);
      });
      return set;
    },
    enabled: !!user?.id && myCreatedIds.length > 0,
  });

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, t) => {
    const name = t.assignedProfile?.full_name || "Sem técnico atribuído";
    (acc[name] = acc[name] || []).push(t);
    return acc;
  }, {});
  const sortedGroups = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allIn = ids.every((id) => next.has(id));
      if (allIn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };
  const exitSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); };
  const handleBulkDelete = async () => {
    await bulkDelete.mutateAsync(Array.from(selectedIds));
    setConfirmDelete(false);
    exitSelection();
  };
  const tableSelectionProps = selectionMode
    ? { selectionMode: true, selectedIds, onToggleSelect: toggleSelect, onToggleSelectAll: toggleSelectAll }
    : {};

  const stats = [
    { label: "Total", count: filtered.length, Icon: TicketCheck, bar: "bg-sky-500", bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-600 dark:text-sky-400" },
    { label: "Abertos", count: filtered.filter((t) => t.status === "Aberto").length, Icon: CircleDot, bar: "bg-red-500", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400" },
    { label: "Em Andamento", count: filtered.filter((t) => t.status === "Em Andamento").length, Icon: Loader2, bar: "bg-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
    { label: "Fechados", count: filtered.filter((t) => t.status === "Fechado").length, Icon: CheckCircle2, bar: "bg-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="max-w-7xl space-y-6">
      <ChamadosTabs />

      <motion.div variants={stagger} initial={reduce ? false : "hidden"} animate="show" className="space-y-6">
        {/* Header command bar — signature */}
        <motion.div variants={rise} className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.07] via-cyan-400/[0.04] to-violet-500/[0.07]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300/80">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Central de Chamados · Setor T.I
              </div>
              <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-foreground">
                Chamados{" "}
                <span className="bg-gradient-to-r from-sky-500 via-cyan-400 to-violet-500 bg-clip-text text-transparent">T.I</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Operação de suporte do Grupo Ramos em tempo real.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-border bg-background/60 p-0.5 backdrop-blur">
                <button
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="h-4 w-4" /> Lista
                </button>
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" /> Kanban
                </button>
              </div>

              {isAdmin && viewMode === "list" && (
                <button
                  onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    selectionMode
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border bg-background/60 text-muted-foreground backdrop-blur hover:text-foreground"
                  }`}
                >
                  {selectionMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                  {selectionMode ? "Cancelar" : "Selecionar"}
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => setShowAiClose(true)}
                  disabled={approvedCount === 0}
                  title={approvedCount === 0 ? "Nenhum chamado aprovado aguardando fechamento" : undefined}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-cyan-400/40 bg-background/60 px-3 py-2.5 text-sm font-medium text-cyan-600 backdrop-blur transition-colors hover:bg-cyan-500/5 disabled:cursor-not-allowed disabled:opacity-40 dark:text-cyan-300"
                >
                  <Sparkles className="h-4 w-4" />
                  Fechar Aprovados (IA)
                  {approvedCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500/15 px-1.5 font-mono-tech text-[11px] font-bold text-cyan-600 dark:text-cyan-300">
                      {approvedCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={handleNewTicketClick}
                className="group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[hsl(207,95%,42%)] to-[hsl(190,90%,42%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_hsl(199_95%_50%/0.6)] transition-all hover:shadow-[0_16px_48px_-12px_hsl(199_95%_55%/0.8)] active:scale-[0.98]"
              >
                <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 opacity-0 blur-sm transition-all duration-700 group-hover/btn:left-[120%] group-hover/btn:opacity-100" />
                <Plus className="relative h-4 w-4" />
                <span className="relative">Novo Chamado</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, count, Icon, bar, bg, text }) => (
            <motion.div key={label} variants={rise} className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono-tech text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className={`font-display text-3xl font-bold ${text}`}>{count}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${text}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Card de metas — técnicos */}
      {!isAdmin && <MyGoalCard year={monthFrom.getFullYear()} month={monthFrom.getMonth() + 1} />}

      {/* Filtros */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="mb-3 flex items-center gap-2 font-mono-tech text-[11px] uppercase tracking-widest text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filtros
        </div>
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por título, descrição ou solicitante..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/60 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm text-foreground transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          >
            <option>Todos Status</option>
            {allStatuses.map((s) => (<option key={s}>{s}</option>))}
          </select>
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          <button
            onClick={() => setReworkFilter(!reworkFilter)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
              reworkFilter
                ? "border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                : "border-input bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retrabalho
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row">
          {(isAdmin || isTech) && (
            <select
              value={requesterFilter}
              onChange={(e) => setRequesterFilter(e.target.value)}
              className="rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm text-foreground transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 lg:flex-1"
            >
              <option value="">Todos Solicitantes</option>
              {requesterOptions.map(([id, name]) => (<option key={id} value={id}>{name}</option>))}
            </select>
          )}
          {(isAdmin || isTech) && (
            <select
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              className="rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm text-foreground transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 lg:flex-1"
            >
              <option value="">Todos Técnicos</option>
              {technicianProfiles.map((t: any) => (<option key={t.user_id} value={t.user_id}>{t.full_name}</option>))}
            </select>
          )}
          <input
            type="text"
            inputMode="numeric"
            placeholder="Nº do chamado (ex: 10 ou 00010)"
            value={numberFilter}
            onChange={(e) => setNumberFilter(e.target.value)}
            className="rounded-xl border border-input bg-background/60 px-3 py-2.5 font-mono-tech text-sm text-foreground transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 lg:w-64"
          />
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-12 shadow-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 shadow-sm">
          <Inbox className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhum chamado encontrado para os filtros atuais.</p>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanBoard tickets={filtered} onSelect={setSelectedTicket} />
      ) : isAdmin ? (
        <div className="space-y-3">
          {sortedGroups.map(([userName, userTickets]) => {
            const isExpanded = expandedUser === userName;
            const statusCounts = allStatuses.reduce<Record<string, number>>((acc, s) => {
              const count = userTickets.filter((t) => t.status === s).length;
              if (count > 0) acc[s] = count;
              return acc;
            }, {});

            return (
              <div key={userName} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : userName)}
                  className="flex w-full items-center gap-3 p-4 transition-colors hover:bg-muted/40"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/20 bg-gradient-to-br from-sky-500/20 to-cyan-400/10">
                    <User className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-display text-sm font-semibold text-foreground">{userName.toUpperCase()}</span>
                    <p className="font-mono-tech text-[11px] text-muted-foreground">{userTickets.length} chamados</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {Object.entries(statusCounts).map(([status, count]) => {
                      const meta = STATUS_META[status];
                      return (
                        <span key={status} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta?.bg || "bg-muted"} ${meta?.text || "text-muted-foreground"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${meta?.bar || "bg-muted-foreground"}`} />
                          {status}: {count}
                        </span>
                      );
                    })}
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-border">
                    <TicketRows tickets={userTickets} onSelect={setSelectedTicket} scoreMap={scoreMap} showScore={isAdmin || isTech} workMinutesMap={workMinutesMap} monthFrom={monthFrom} monthTo={monthTo} unreadIds={unreadIds} {...tableSelectionProps} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        (() => {
          const userId = user?.id;
          const availableTickets = filtered.filter((t) => t.status === "Disponível");
          const assignedToMe = filtered.filter((t) => t.assigned_to === userId && t.status !== "Disponível");
          const createdByMe = filtered.filter((t) => t.created_by === userId && t.assigned_to !== userId && t.status !== "Disponível");
          return (
            <div className="space-y-4">
              {(isAdmin || isTech) && (
                <div className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-amber-50/50 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
                  <div className="relative flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
                      <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-mono-tech text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Minha Pontuação — {selectedMonth}</p>
                      <p className="font-display text-3xl font-bold leading-tight text-amber-600 dark:text-amber-400">{myScore} <span className="text-base font-semibold">pts</span></p>
                      {scoreBreakdown.sprintPoints > 0 && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {scoreBreakdown.evaluationPoints} pts de chamados + {scoreBreakdown.sprintPoints} pts de sprints
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Chamados fechados</p>
                      <p className="font-display text-2xl font-bold text-foreground">{closedByMe.length}</p>
                    </div>
                  </div>
                  {scoreBreakdown.sprints.length > 0 && (
                    <div className="border-t border-amber-200 bg-amber-100/40 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
                      <button
                        type="button"
                        onClick={() => setShowScoreDetail((v) => !v)}
                        className="flex w-full items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300"
                      >
                        {showScoreDetail ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        Detalhamento por sprint ({scoreBreakdown.sprints.length})
                      </button>
                      {showScoreDetail && (
                        <div className="mt-2 space-y-1">
                          {scoreBreakdown.sprints.map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate text-foreground">{s.label}</span>
                              <span className="shrink-0 font-mono-tech font-semibold text-amber-700 dark:text-amber-300">+{s.points} pts</span>
                            </div>
                          ))}
                          <div className="mt-1 flex items-center justify-between gap-2 border-t border-amber-200 pt-1 text-xs font-semibold dark:border-amber-800">
                            <span>Total das sprints</span>
                            <span className="font-mono-tech text-amber-700 dark:text-amber-300">{scoreBreakdown.sprintPoints} pts</span>
                          </div>
                          <p className="pt-1 text-[10px] leading-snug text-muted-foreground">
                            Esses pontos também entram na sua meta mensal e no cálculo do MVP.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {availableTickets.length > 0 && (
                <AvailableTicketsSection
                  tickets={availableTickets}
                  onSelect={setSelectedTicket}
                  onAssign={setAssignTicketId}
                  title="Disponíveis para assumir"
                  description={`${availableTickets.length} chamado${availableTickets.length !== 1 ? "s" : ""} com SLA expirado`}
                  variant="expired"
                />
              )}
              {assignedToMe.length > 0 && (
                <SectionCard Icon={Inbox} title="Chamados atribuídos a mim" count={assignedToMe.length}>
                  <TicketRows tickets={assignedToMe} onSelect={setSelectedTicket} scoreMap={scoreMap} showScore={isAdmin || isTech} workMinutesMap={workMinutesMap} monthFrom={monthFrom} monthTo={monthTo} unreadIds={unreadIds} />
                </SectionCard>
              )}
              {createdByMe.length > 0 && (
                <SectionCard Icon={SendHorizonal} title="Chamados que eu abri" count={createdByMe.length}>
                  <TicketRows tickets={createdByMe} onSelect={setSelectedTicket} scoreMap={scoreMap} showScore={isAdmin || isTech} workMinutesMap={workMinutesMap} monthFrom={monthFrom} monthTo={monthTo} unreadIds={unreadIds} />
                </SectionCard>
              )}
              {availableTickets.length === 0 && assignedToMe.length === 0 && createdByMe.length === 0 && (
                <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-12 shadow-sm">
                  <p className="text-sm text-muted-foreground">Nenhum chamado encontrado.</p>
                </div>
              )}
            </div>
          );
        })()
      )}

      {showModal && <NewTicketWizardModal onClose={() => setShowModal(false)} />}
      {showAiClose && profile?.organization_id && (
        <AiCloseApprovedModal organizationId={profile.organization_id} onClose={() => setShowAiClose(false)} />
      )}
      <PendingApprovalGateDialog open={showPendingGate} onClose={() => setShowPendingGate(false)} tickets={pendingApproval} />
      {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
      {assignTicketId && <AssignTicketModal ticketId={assignTicketId} mode="self" onClose={() => setAssignTicketId(null)} />}

      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border-2 border-destructive bg-background px-4 py-3 shadow-2xl">
          <span className="text-sm font-semibold text-foreground">
            {selectedIds.size} chamado{selectedIds.size !== 1 ? "s" : ""} selecionado{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <button onClick={exitSelection} className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            Cancelar
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={bulkDelete.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Excluir selecionados
          </button>
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} chamado{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os comentários, anexos, histórico e avaliações destes chamados também serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDelete.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }}
              disabled={bulkDelete.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDelete.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
