import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Phone, MessageCircle, LogOut, Sun, Moon, CheckCircle2, PlayCircle,
  Clock, ChevronDown, ListTodo, Trophy, Plus, Building2, Calendar,
  FileText, AlertTriangle, Wrench, User,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useMaintenanceOrders, useSites, type MaintenanceOrder, type MaintenancePhoto } from "@/hooks/useManutencao";
import { useDeliveryRequesters } from "@/hooks/useDeliveryRequesters";
import { useMaintTechnicians } from "@/hooks/useMaintTechnicians";
import { useMaintProfile } from "@/hooks/useMaintProfile";
import { useManutencaoProfile } from "@/contexts/ManutencaoProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import OpClosureDialog from "@/components/operacional/OpClosureDialog";
import NewMaintOrderModal from "@/components/operacional/NewMaintOrderModal";
import MaintenanceMaterials from "@/components/operacional/MaintenanceMaterials";
import { formatMaintenanceDue, maintenanceDueAt, maintenanceIsOverdue, readMaterials, TECH_TONES, weekStart, weekDates, dateKey } from "@/lib/maintenancePlanning";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import "./cearagps.css";

const STATUS_STYLES: Record<string, string> = {
  "Aberta": "bg-amber-100 text-amber-800 border-amber-200",
  "Em execução": "bg-blue-100 text-blue-800 border-blue-200",
  "Concluída": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Cancelada": "bg-rose-100 text-rose-800 border-rose-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  "Baixa": "hsl(210 10% 55%)",
  "Média": "hsl(200 80% 45%)",
  "Alta": "hsl(24 90% 50%)",
  "Urgente": "hsl(0 80% 55%)",
};

const TEAL = "hsl(191 74% 20%)";
const TEAL_DARK = "hsl(191 74% 12%)";
const ORANGE = "hsl(14 82% 51%)";

function formatTime(iso?: string | null) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}
function formatDate(d?: string | null) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return day ? `${day}/${m}/${y}` : d;
}
function renderWithLinks(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="underline break-all" style={{ color: ORANGE }}>{p}</a>
    ) : <span key={i}>{p}</span>
  );
}

export default function OpManutencaoMinhas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile: pinProfile, clear } = useManutencaoProfile();
  const maintProfile = useMaintProfile();
  const orders = useMaintenanceOrders();
  const sites = useSites();
  const requesters = useDeliveryRequesters();
  const technicians = useMaintTechnicians();

  const [tab, setTab] = useState<"tarefas" | "finalizadas">("tarefas");
  const [highContrast, setHighContrast] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [closing, setClosing] = useState<MaintenanceOrder | null>(null);
  const [newOMOpen, setNewOMOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState<MaintenanceOrder | null>(null);
  const [planning, setPlanning] = useState<MaintenanceOrder | null>(null);
  const [plannedAt, setPlannedAt] = useState("");
  const [reason, setReason] = useState("");
  const [planningBusy, setPlanningBusy] = useState(false);
  const [receiving, setReceiving] = useState<MaintenanceOrder | null>(null);
  const [receivedAt, setReceivedAt] = useState("");
  const [receivedPlannedDate, setReceivedPlannedDate] = useState("");
  const [receiptDelayReason, setReceiptDelayReason] = useState("");

  const isTecnico = maintProfile.role === "tecnico";
  const isSolicitante = maintProfile.role === "solicitante";

  const mine = useMemo(() => {
    if (isTecnico) return orders.items.filter((o) => o.assigned_technician_id === maintProfile.mechanicId);
    if (isSolicitante) return orders.items.filter((o) => o.requester_id === maintProfile.requesterId);
    return orders.items;
  }, [orders.items, isTecnico, isSolicitante, maintProfile.mechanicId, maintProfile.requesterId]);

  // Mesma sequência do Kanban do admin: posição manual (nulos por último) → mais recentes
  const active = useMemo(
    () => mine
      .filter((o) => o.status !== "Concluída" && o.status !== "Cancelada")
      .sort((a, b) => {
        const pa = (a as any).kanban_position ?? Number.MAX_SAFE_INTEGER;
        const pb = (b as any).kanban_position ?? Number.MAX_SAFE_INTEGER;
        if (pa !== pb) return pa - pb;
        return (b.created_at || "").localeCompare(a.created_at || "");
      }),
    [mine]
  );

  // Agrupamento por data programada, na mesma sequência de colunas do Kanban do admin.
  // Hoje vem primeiro e destacado; dentro de cada grupo a ordem é a mesma do admin.
  const week = useMemo(() => weekDates(weekStart()), []);

  const groupKeyOf = useCallback((o: MaintenanceOrder) => {
    if (!o.scheduled_date) return "__nodate__";
    if (week.includes(o.scheduled_date)) {
      return o.scheduled_date === week[5] || o.scheduled_date === week[6] ? "__weekend__" : o.scheduled_date;
    }
    return `out:${o.scheduled_date}`;
  }, [week]);

  const { activeGroupMap, activeTodayKey } = useMemo(() => {
    const today = dateKey(new Date());
    const todayKey = week.includes(today)
      ? (today === week[5] || today === week[6] ? "__weekend__" : today)
      : `out:${today}`;
    const buckets = new Map<string, MaintenanceOrder[]>();
    for (const o of active) {
      const k = groupKeyOf(o);
      const arr = buckets.get(k);
      if (arr) arr.push(o); else buckets.set(k, [o]);
    }
    const order: string[] = [];
    const push = (k: string) => { if (buckets.has(k) && !order.includes(k)) order.push(k); };
    push(todayKey);
    week.slice(0, 5).forEach((d) => push(d));
    push("__weekend__");
    Array.from(buckets.keys()).filter((k) => k.startsWith("out:")).sort().forEach(push);
    push("__nodate__");
    const labels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
    const map = new Map<string, { label: string; orders: MaintenanceOrder[] }>();
    for (const k of order) {
      const arr = buckets.get(k)!;
      let label: string;
      if (k === "__nodate__") label = "Sem data programada";
      else if (k === "__weekend__") label = `Final de semana · ${week[5].slice(8)}/${week[5].slice(5, 7)} e ${week[6].slice(8)}/${week[6].slice(5, 7)}`;
      else if (k.startsWith("out:")) { const d = k.slice(4); label = `Programada · ${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}`; }
      else label = `${labels[week.indexOf(k)]} · ${k.slice(8)}/${k.slice(5, 7)}`;
      map.set(k, { label, orders: arr });
    }
    return { activeGroupMap: map, activeTodayKey: todayKey };
  }, [active, week, groupKeyOf]);

  const groupedActive = useMemo(
    () => Array.from(activeGroupMap.values()).flatMap((g) => g.orders),
    [activeGroupMap]
  );

  const finished = useMemo(
    () => mine.filter((o) => o.status === "Concluída" || o.status === "Cancelada")
      .sort((a, b) => (b.finished_at || b.opened_at).localeCompare(a.finished_at || a.opened_at)),
    [mine]
  );

  const todayISO = new Date().toISOString().slice(0, 10);
  const openToday = active.filter((o) => o.opened_at === todayISO || (o.deadline && o.deadline <= todayISO)).length;
  const doneToday = finished.filter((o) => (o.finished_at || "").slice(0, 10) === todayISO).length;

  const logout = () => { clear(); navigate("/op/manutencao/pin"); };

  const startExec = async (om: MaintenanceOrder) => {
    await orders.update(om.id, { status: "Em execução" });
    toast.success("🔧 Em execução!");
  };

  const confirmClosure = async (payload: { closure_summary: string; closed_at: string; photos?: File[] }) => {
    if (!closing) return;
    if (!payload.photos?.length || !payload.closed_at) throw new Error("Foto, data e hora são obrigatórias");
    for (const f of payload.photos) if (!(await orders.uploadPhoto(closing.id, f, "depois"))) throw new Error("Não foi possível enviar a foto de finalização");
    if (!(await orders.update(closing.id, {
      status: "Concluída",
      closure_summary: payload.closure_summary,
      finished_at: payload.closed_at,
      closed_by: user?.id || null,
    }))) throw new Error("Não foi possível concluir a OM");
    setClosing(null);
    setExpandedId(null);
    toast.success("✅ OM concluída!");
  };

  const siteOf = (id: string | null) => sites.items.find((s) => s.id === id);
  const requesterOf = (om: MaintenanceOrder) => requesters.items.find((r) => r.id === om.requester_id);
  const technicianOf = (om: MaintenanceOrder) => technicians.items.find((t) => t.id === om.assigned_technician_id);
  const toneOf = (om: MaintenanceOrder) => TECH_TONES[Math.max(0, technicians.items.findIndex(t => t.id === om.assigned_technician_id)) % TECH_TONES.length];

  const contactRequester = (om: MaintenanceOrder) => {
    const req = requesterOf(om);
    const rPhone = req?.phone?.replace(/\D/g, "");
    if (!rPhone) return toast.error("Solicitante sem telefone cadastrado.");
    const msg = `Olá ${req?.name || ""}, sou o técnico responsável pela OM #${om.om_number} - "${om.title}". Preciso falar sobre a manutenção:`;
    const withDdi = rPhone.length <= 11 ? `55${rPhone}` : rPhone;
    window.open(`https://wa.me/${withDdi}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const contactTechnician = (om: MaintenanceOrder) => {
    const t = technicianOf(om);
    const tPhone = t?.phone?.replace(/\D/g, "");
    if (!tPhone) return toast.error("Técnico sem telefone cadastrado.");
    const msg = `Olá ${t?.name || ""}, sobre a OM #${om.om_number} - "${om.title}":`;
    const withDdi = tPhone.length <= 11 ? `55${tPhone}` : tPhone;
    window.open(`https://wa.me/${withDdi}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const bg = highContrast ? "#000000" : "hsl(210 20% 96%)";
  const cardBg = highContrast ? "#0b0b0b" : "#ffffff";
  const textMain = highContrast ? "#ffffff" : "hsl(222 20% 18%)";
  const textMuted = highContrast ? "#c4c4c4" : "hsl(215 15% 45%)";

  const listToShow = tab === "tarefas" ? groupedActive : finished;

  return (
    <div className="cgps-scope min-h-screen pb-24" style={{ background: bg, color: textMain }}>
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between sticky top-0 z-30" style={{ background: TEAL }}>
        <div className="flex items-center gap-3">
          <span className="text-white font-extrabold tracking-tight text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5" style={{ color: ORANGE }} /> MANUTENÇÃO PREDIAL
          </span>
          {pinProfile && (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider" style={{ background: TEAL_DARK, color: "#fff" }}>
              {pinProfile.type}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setHighContrast((v) => !v)}
            className="h-9 w-9 rounded-md flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }} aria-label="Alto contraste">
            {highContrast ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={logout}
            className="h-9 w-9 rounded-md flex items-center justify-center"
            style={{ background: ORANGE, color: "#fff" }} aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </motion.button>
        </div>
      </header>

      {/* Welcome */}
      <section className="px-5 pt-5 pb-4" style={{ background: cardBg, borderBottom: "1px solid hsl(210 15% 90%)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>Bem-vindo(a),</div>
            <h1 className="text-2xl font-extrabold leading-tight" style={{ color: textMain }}>{pinProfile?.name || "—"}</h1>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
              {isTecnico ? "OMs abertas" : "Em andamento"}
            </div>
            <motion.div key={openToday} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="mt-1 inline-flex items-center justify-center min-w-8 h-8 px-2.5 rounded-full text-sm font-bold"
              style={{ background: "hsl(180 25% 92%)", color: TEAL }}>
              {active.length}
            </motion.div>
          </div>
        </div>
        {mine.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5" style={{ color: textMuted }}>
              <span>PROGRESSO</span>
              <span>{finished.length}/{mine.length} concluídas</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(210 15% 90%)" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${(finished.length / Math.max(1, mine.length)) * 100}%` }}
                transition={{ duration: 0.6 }} className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${ORANGE}, hsl(160 65% 45%))` }} />
            </div>
          </div>
        )}
      </section>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-2 grid grid-cols-2 gap-3">
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setTab("tarefas"); setExpandedId(null); }}
          className="rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition"
          style={tab === "tarefas"
            ? { background: ORANGE, color: "#fff", boxShadow: "0 8px 24px -8px hsl(14 82% 51% / 0.55)" }
            : { background: cardBg, color: textMain, border: "1px solid hsl(210 15% 88%)" }}>
          <ListTodo className="h-4 w-4" />
          {isSolicitante ? `STATUS (${active.length})` : `MINHAS OMs (${active.length})`}
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setTab("finalizadas"); setExpandedId(null); }}
          className="rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition"
          style={tab === "finalizadas"
            ? { background: "hsl(160 65% 38%)", color: "#fff", boxShadow: "0 8px 24px -8px hsl(160 65% 38% / 0.55)" }
            : { background: cardBg, color: textMain, border: "1px solid hsl(210 15% 88%)" }}>
          <Trophy className="h-4 w-4" /> FINALIZADAS ({finished.length})
        </motion.button>
      </div>

      {/* Content */}
      <main className="px-4 pt-2">
        {orders.loading ? (
          <div className="text-center py-12" style={{ color: textMuted }}>Carregando...</div>
        ) : listToShow.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-xl p-8 text-center" style={{ background: cardBg, border: "1px solid hsl(210 15% 88%)" }}>
            {tab === "tarefas" ? (
              <>
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: "hsl(160 60% 45%)" }} />
                <div className="font-extrabold text-lg" style={{ color: textMain }}>
                  {isSolicitante ? "Nenhuma solicitação em andamento" : "Tudo em dia! 🎉"}
                </div>
                <p className="text-sm mt-1" style={{ color: textMuted }}>
                  {isSolicitante ? "Suas solicitações pendentes aparecerão aqui." : "Nenhuma OM atribuída no momento."}
                </p>
              </>
            ) : (
              <>
                <Wrench className="h-12 w-12 mx-auto mb-3" style={{ color: textMuted }} />
                <div className="font-extrabold text-lg" style={{ color: textMain }}>Nenhuma OM finalizada</div>
                <p className="text-sm mt-1" style={{ color: textMuted }}>As OMs concluídas aparecerão aqui.</p>
              </>
            )}
          </motion.div>
        ) : (
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {listToShow.map((om, idx) => {
                  const showGroups = tab === "tarefas";
                  const gk = showGroups ? groupKeyOf(om) : null;
                  const prevGk = showGroups && idx > 0 ? groupKeyOf(listToShow[idx - 1]) : null;
                  const groupMeta = gk ? activeGroupMap.get(gk) : null;
                  const isTodayGroup = !!gk && gk === activeTodayKey;
                  const site = siteOf(om.site_id);
                  const req = requesterOf(om);
                  const tech = technicianOf(om);
                  const isExpanded = expandedId === om.id;
                  const isFinished = om.status === "Concluída" || om.status === "Cancelada";
                   const overdue = maintenanceIsOverdue(om);
                  const pColor = PRIORITY_COLORS[om.priority] || "hsl(210 10% 55%)";
                  const mapsUrl = site?.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.address)}` : null;

                  return (
                    <Fragment key={om.id}>
                      {showGroups && gk !== prevGk && groupMeta && (
                        <div className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={isTodayGroup
                            ? { background: ORANGE, color: "#fff" }
                            : { background: highContrast ? "#161616" : "hsl(210 20% 93%)", color: textMuted }}>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {groupMeta.label}{isTodayGroup ? " · HOJE" : ""}
                          </span>
                          <span className="text-[11px] font-bold">
                            {groupMeta.orders.length} OM{groupMeta.orders.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      <motion.article layout
                      initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -60, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 260, damping: 24 }}
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: cardBg,
                         border: `1px solid ${isExpanded ? ORANGE : "hsl(210 15% 88%)"}`,
                        boxShadow: highContrast ? "none" : isExpanded
                          ? "0 12px 32px -12px hsl(14 82% 51% / 0.35)"
                          : "0 2px 8px -4px rgba(0,0,0,0.08)",
                      }}>
                      <button onClick={() => setExpandedId(isExpanded ? null : om.id)} className="w-full text-left p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "hsl(210 15% 92%)", color: textMuted }}>
                                #{om.om_number}
                              </span>
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                style={{ background: pColor + "22", color: pColor }}>
                                {om.priority}
                              </span>
                              {overdue && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                  style={{ background: "hsl(0 80% 95%)", color: "hsl(0 80% 45%)" }}>
                                  <AlertTriangle className="h-3 w-3" /> Atrasada
                                </span>
                              )}
                               {om.awaiting_material && <Badge className="maintenance-material-tag text-[10px]">Aguardando compra</Badge>}
                            </div>
                             {tech && <Badge variant="outline" className={`${toneOf(om)} mb-1 text-[10px]`}>{tech.name}</Badge>}
                             <div className="text-lg font-extrabold leading-tight" style={{ color: textMain }}>{om.title}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>{om.category}</span>
                              {isFinished && om.finished_at && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: textMuted }}>
                                  <Clock className="h-3 w-3" /> {formatDate(om.finished_at)} {formatTime(om.finished_at) && `· ${formatTime(om.finished_at)}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[om.status] || ""}`}>
                              {om.status}
                            </span>
                            {!isFinished && (
                              <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown className="h-4 w-4" style={{ color: textMuted }} />
                              </motion.span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          {site && (
                            <div className="flex items-center gap-2 text-sm" style={{ color: textMain }}>
                              <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: TEAL }} />
                              <span className="font-medium"><span style={{ color: textMuted }}>Sede: </span>{site.name}</span>
                            </div>
                          )}
                          {isTecnico && req && (
                            <div className="flex items-center gap-2 text-sm" style={{ color: textMain }}>
                              <User className="h-4 w-4 flex-shrink-0" style={{ color: TEAL }} />
                              <span className="font-medium"><span style={{ color: textMuted }}>Solicitante: </span>{req.name}</span>
                            </div>
                          )}
                          {om.sector && (
                            <div className="flex items-center gap-2 text-sm" style={{ color: textMain }}>
                              <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: ORANGE }} />
                              <span className="font-medium"><span style={{ color: textMuted }}>Setor: </span>{om.sector}</span>
                            </div>
                          )}
                          {isSolicitante && tech && (
                            <div className="flex items-center gap-2 text-sm" style={{ color: textMain }}>
                              <User className="h-4 w-4 flex-shrink-0" style={{ color: TEAL }} />
                              <span className="font-medium"><span style={{ color: textMuted }}>Técnico: </span>{tech.name}</span>
                            </div>
                          )}
                          {om.deadline && (
                            <div className="flex items-center gap-2 text-sm" style={{ color: overdue ? "hsl(0 80% 45%)" : textMain }}>
                              <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: overdue ? "hsl(0 80% 45%)" : ORANGE }} />
                              <span className="font-medium"><span style={{ color: textMuted }}>Prazo: </span>{formatDate(om.deadline)}</span>
                            </div>
                          )}
                           {om.scheduled_date && <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 flex-shrink-0" /><span>Programada: {formatDate(om.scheduled_date)}</span></div>}
                        </div>

                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }} className="overflow-hidden">
                            <div className="px-4 pb-4 space-y-3">
                              {isTecnico && <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">Materiais necessários</span><Button size="sm" variant="outline" onClick={() => setMaterialsOpen(om)}>Editar</Button></div>
                                {readMaterials(om.materials).length ? readMaterials(om.materials).map((m, i) => <p key={i} className="text-sm">{m.quantity} × {m.name} {m.purchased ? "· Comprado" : "· Pendente"}</p>) : <p className="text-xs text-muted-foreground">Nenhum material informado.</p>}
                              </div>}
                              <div className="rounded-lg p-3 space-y-2" style={{ background: highContrast ? "#161616" : "hsl(210 20% 97%)" }}>
                                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: textMuted }}>Detalhes</div>
                                {site?.address && (
                                  <div className="flex items-start gap-2 text-sm">
                                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: ORANGE }} />
                                    <span style={{ color: textMuted }}>Endereço:</span>
                                    <span className="font-bold ml-auto text-right break-words min-w-0" style={{ color: textMain }}>{site.address}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: TEAL }} />
                                  <span style={{ color: textMuted }}>Aberta em:</span>
                                  <span className="font-bold ml-auto text-right" style={{ color: textMain }}>{formatDate(om.opened_at)}</span>
                                </div>
                                {om.description && (
                                  <div className="flex items-start gap-2 text-sm pt-1 mt-1 border-t" style={{ borderColor: highContrast ? "#2a2a2a" : "hsl(210 15% 90%)" }}>
                                    <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: textMuted }} />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>Descrição</div>
                                      <div className="font-medium mt-0.5 whitespace-pre-wrap break-words" style={{ color: textMain }}>
                                        {renderWithLinks(om.description)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {om.photo_justification && <div className="text-sm">Sem foto na abertura: {om.photo_justification}</div>}
                                {om.awaiting_sector_release && !isFinished && <div className="text-sm font-semibold text-amber-700">Aguardando liberação do setor — prazo pausado</div>}
                                {maintenanceDueAt(om) && !isFinished && <div className="text-sm">Prazo de execução: {formatMaintenanceDue(maintenanceDueAt(om))}</div>}
                                {om.postponement_reason && <div className="text-sm">Adiamento: {om.postponement_reason}</div>}
                                {om.closure_summary && isFinished && (
                                  <div className="flex items-start gap-2 text-sm pt-1 mt-1 border-t" style={{ borderColor: highContrast ? "#2a2a2a" : "hsl(210 15% 90%)" }}>
                                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "hsl(160 65% 38%)" }} />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>Conclusão</div>
                                      <div className="font-medium mt-0.5 whitespace-pre-wrap break-words" style={{ color: textMain }}>
                                        {renderWithLinks(om.closure_summary)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {isTecnico && <OpeningPhotos omId={om.id} hook={orders} labelColor={textMuted} />}

                              {/* Ações de contato + navegação */}
                              {isTecnico && !isFinished && req?.phone && (
                                <div className="grid grid-cols-2 gap-2">
                                  <motion.a whileTap={{ scale: 0.96 }} href={`tel:${req.phone.replace(/\D/g, "")}`}
                                    className="rounded-lg py-2.5 flex items-center justify-center gap-1.5 text-sm font-bold"
                                    style={{ background: TEAL, color: "#fff" }}>
                                    <Phone className="h-4 w-4" /> Ligar solicitante
                                  </motion.a>
                                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => contactRequester(om)}
                                    className="rounded-lg py-2.5 flex items-center justify-center gap-1.5 text-sm font-bold"
                                    style={{ background: "hsl(142 70% 40%)", color: "#fff" }}>
                                    <MessageCircle className="h-4 w-4" /> WhatsApp
                                  </motion.button>
                                </div>
                              )}
                              {isSolicitante && !isFinished && tech?.phone && (
                                <motion.button whileTap={{ scale: 0.96 }} onClick={() => contactTechnician(om)}
                                  className="w-full rounded-lg py-2.5 flex items-center justify-center gap-1.5 text-sm font-bold"
                                  style={{ background: "hsl(142 70% 40%)", color: "#fff" }}>
                                  <MessageCircle className="h-4 w-4" /> Falar com técnico
                                </motion.button>
                              )}

                              {mapsUrl && !isFinished && (
                                <motion.a whileTap={{ scale: 0.97 }} href={mapsUrl} target="_blank" rel="noreferrer"
                                  className="w-full rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-bold"
                                  style={{ background: "hsl(210 15% 96%)", color: TEAL, border: "1px solid hsl(210 15% 88%)" }}>
                                  <MapPin className="h-4 w-4" /> Abrir no Google Maps
                                </motion.a>
                              )}

                              {/* Ações do técnico */}
                               {isTecnico && !isFinished && <div className="flex flex-wrap gap-2">
                                 {!om.material_received_at && (
                                   <Button variant="outline" onClick={async () => {
                                     const ok = await orders.update(om.id, { material_received_at: new Date().toISOString(), awaiting_material: false, materials: readMaterials(om.materials).map(m => ({ ...m, purchased: true })) });
                                     if (ok) toast.success("Peças recebidas. Prazo de 24 horas iniciado.");
                                   }}>Peças recebidas · iniciar prazo de 24h</Button>
                                 )}
                                 {om.awaiting_material && !om.material_received_at && <Button variant="outline" onClick={() => { setReceiving(om); setReceivedAt(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)); setReceivedPlannedDate(""); setReceiptDelayReason(""); }}>Informar recebimento do material</Button>}
                                 {om.awaiting_sector_release
                                   ? <Button variant="outline" onClick={async () => {
                                       const ok = await orders.update(om.id, { awaiting_sector_release: false, sector_released_at: new Date().toISOString() });
                                       if (ok) toast.success("Setor liberado. Prazo contado a partir de agora.");
                                     }}>Setor liberou · iniciar prazo</Button>
                                   : <Button variant="outline" onClick={async () => {
                                       const ok = await orders.update(om.id, { awaiting_sector_release: true });
                                       if (ok) toast.success("Aguardando liberação do setor. Prazo pausado.");
                                     }}>Aguardando liberação do setor</Button>}
                                 <Button variant="outline" onClick={() => { setPlanning(om); setPlannedAt(""); setReason(""); }}>Adiar com justificativa</Button>
                               </div>}
                              {isTecnico && om.status === "Aberta" && (
                                <motion.button whileTap={{ scale: 0.97 }} onClick={() => startExec(om)}
                                  className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wide"
                                  style={{ background: "hsl(220 90% 55%)", color: "#fff", boxShadow: "0 8px 24px -10px hsl(220 90% 55% / 0.6)" }}>
                                  <PlayCircle className="h-5 w-5" /> Iniciar execução
                                </motion.button>
                              )}
                              {isTecnico && om.status === "Em execução" && (
                                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setClosing(om)}
                                  className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wide"
                                  style={{ background: "hsl(160 65% 38%)", color: "#fff", boxShadow: "0 8px 24px -10px hsl(160 65% 38% / 0.6)" }}>
                                  <CheckCircle2 className="h-5 w-5" /> Concluir OM
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.article>
                    </Fragment>
                  );
                })}
              </div>
            </AnimatePresence>
          </LayoutGroup>
        )}
      </main>

      {isSolicitante && (
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate("/op/manutencao/solicitar")}
          className="fixed bottom-6 right-6 z-40 rounded-full h-16 w-16 flex items-center justify-center shadow-2xl"
          style={{ background: ORANGE, color: "#fff", boxShadow: "0 12px 32px -8px hsl(14 82% 51% / 0.65)" }}
          aria-label="Nova solicitação">
          <Plus className="h-7 w-7" />
        </motion.button>
      )}

      {isTecnico && (
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setNewOMOpen(true)}
          className="fixed bottom-6 right-6 z-40 rounded-full h-16 w-16 flex items-center justify-center shadow-2xl"
          style={{ background: ORANGE, color: "#fff", boxShadow: "0 12px 32px -8px hsl(14 82% 51% / 0.65)" }}
          aria-label="Nova OM">
          <Plus className="h-7 w-7" />
        </motion.button>
      )}

      <OpClosureDialog
        open={!!closing}
        onOpenChange={(o) => !o && setClosing(null)}
        title="Concluir ordem de manutenção"
        allowPhotos
         requirePhotos
         requireTime
        onConfirm={confirmClosure}
      />
       <Dialog open={!!planning} onOpenChange={open => !open && setPlanning(null)}><DialogContent><DialogHeader><DialogTitle>Adiar manutenção #{planning?.om_number}</DialogTitle></DialogHeader>
         <label className="text-sm font-medium">Nova data e hora prevista *<Input type="datetime-local" value={plannedAt} onChange={e => setPlannedAt(e.target.value)} /></label>
         <label className="text-sm font-medium">Justificativa do adiamento *<Textarea maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
         <DialogFooter><Button variant="outline" onClick={() => setPlanning(null)}>Cancelar</Button><Button disabled={planningBusy || !plannedAt || reason.trim().length < 10} onClick={async () => {
           if (!planning || new Date(plannedAt).getTime() <= Date.now()) { toast.error("Escolha uma data futura"); return; }
           setPlanningBusy(true);
           const ok = await orders.update(planning.id, { postponed_until: new Date(plannedAt).toISOString(), postponement_reason: reason.trim(), scheduled_date: plannedAt.slice(0, 10) });
           setPlanningBusy(false);
           if (ok) { toast.success("Manutenção adiada"); setPlanning(null); }
         }}>Salvar adiamento</Button></DialogFooter>
       </DialogContent></Dialog>
       <Dialog open={!!receiving} onOpenChange={open => !open && setReceiving(null)}><DialogContent><DialogHeader><DialogTitle>Material recebido · OM #{receiving?.om_number}</DialogTitle></DialogHeader>
         <label className="text-sm font-medium">Data e hora do recebimento *<Input type="datetime-local" value={receivedAt} max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setReceivedAt(e.target.value)} /></label>
          <label className="text-sm font-medium">Data e hora previstas para realizar a manutenção *<Input type="datetime-local" value={receivedPlannedDate} onChange={e => setReceivedPlannedDate(e.target.value)} /></label>
          {receivedAt && receivedPlannedDate && new Date(receivedPlannedDate).getTime() > new Date(receivedAt).getTime() + 86400000 && <label className="text-sm font-medium">Justificativa para realizar após 24 horas *<Textarea maxLength={1000} value={receiptDelayReason} onChange={e => setReceiptDelayReason(e.target.value)} /></label>}
         <p className="text-sm text-muted-foreground">O prazo de 24 horas começa no momento do recebimento. Para realizar depois do prazo, informe um adiamento com justificativa.</p>
         <DialogFooter><Button variant="outline" onClick={() => setReceiving(null)}>Cancelar</Button><Button disabled={planningBusy || !receivedAt || !receivedPlannedDate} onClick={async () => {
            if (!receiving || !Number.isFinite(new Date(receivedAt).getTime()) || !Number.isFinite(new Date(receivedPlannedDate).getTime()) || new Date(receivedAt).getTime() > Date.now() || new Date(receivedPlannedDate).getTime() < new Date(receivedAt).getTime()) { toast.error("Confira as datas de recebimento e execução"); return; }
            const delayed = new Date(receivedPlannedDate).getTime() > new Date(receivedAt).getTime() + 86400000;
           if (delayed && receiptDelayReason.trim().length < 10) { toast.error("Justifique o adiamento (mínimo 10 caracteres)"); return; }
           setPlanningBusy(true);
            const ok = await orders.update(receiving.id, { material_received_at: new Date(receivedAt).toISOString(), awaiting_material: false, scheduled_date: receivedPlannedDate.slice(0, 10), postponed_until: delayed ? new Date(receivedPlannedDate).toISOString() : null, postponement_reason: delayed ? receiptDelayReason.trim() : null });
           setPlanningBusy(false);
           if (ok) { toast.success("Recebimento registrado. Prazo de 24 horas iniciado."); setReceiving(null); }
         }}>Confirmar recebimento</Button></DialogFooter>
       </DialogContent></Dialog>

      <NewMaintOrderModal
        open={newOMOpen}
        onOpenChange={setNewOMOpen}
        defaultTechnicianId={maintProfile.mechanicId || null}
        onCreated={() => orders.refetch()}
      />
      <Dialog open={!!materialsOpen} onOpenChange={open => !open && setMaterialsOpen(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Materiais da OM #{materialsOpen?.om_number}</DialogTitle></DialogHeader>
          <MaintenanceMaterials items={readMaterials(materialsOpen?.materials)} onChange={items => setMaterialsOpen(prev => prev ? { ...prev, materials: items } : null)} />
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!materialsOpen?.awaiting_material} onCheckedChange={checked => setMaterialsOpen(prev => prev ? { ...prev, awaiting_material: checked === true } : null)} /> Aguardando compra</label>
          {!materialsOpen?.material_received_at && (
            <Button type="button" variant="outline" onClick={async () => {
              if (!materialsOpen) return;
              const ok = await orders.update(materialsOpen.id, { material_received_at: new Date().toISOString(), awaiting_material: false, materials: readMaterials(materialsOpen.materials).map(m => ({ ...m, purchased: true })) });
              if (ok) { toast.success("Peças recebidas. Prazo de 24 horas iniciado."); setMaterialsOpen(null); }
            }}>Peças recebidas · iniciar prazo de 24h</Button>
          )}
          {materialsOpen?.material_received_at && <p className="text-sm text-muted-foreground">Peças recebidas em {new Date(materialsOpen.material_received_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} — prazo de 24h em andamento.</p>}
          <DialogFooter><Button variant="outline" onClick={() => setMaterialsOpen(null)}>Cancelar</Button><Button onClick={async () => { if (!materialsOpen) return; await orders.update(materialsOpen.id, { materials: readMaterials(materialsOpen.materials).filter(m => m.name.trim()), awaiting_material: materialsOpen.awaiting_material }); setMaterialsOpen(null); }}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OpeningPhotos({ omId, hook, labelColor }: { omId: string; hook: ReturnType<typeof useMaintenanceOrders>; labelColor: string }) {
  const [photos, setPhotos] = useState<MaintenancePhoto[]>([]);

  useEffect(() => {
    let live = true;
    hook.listPhotos(omId).then((all) => {
      if (live) setPhotos((all || []).filter((p) => p.photo_type === "antes"));
    });
    return () => { live = false; };
  }, [omId]);

  if (!photos.length) return null;

  return (
    <div className="rounded-lg p-3" style={{ background: "hsl(210 20% 97%)" }}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: labelColor }}>Foto da abertura</div>
      <div className="flex gap-2 overflow-x-auto">
        {photos.map((p) => (
          <a key={p.id} href={p.photo_url} target="_blank" rel="noreferrer" className="flex-shrink-0">
            <img src={p.photo_url} alt="Foto da abertura" className="h-24 w-24 object-cover rounded-lg border" />
          </a>
        ))}
      </div>
    </div>
  );
}

