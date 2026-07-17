import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Phone, MessageCircle, LogOut, Sun, Moon, CheckCircle2, PlayCircle, Navigation, Clock, ChevronDown, Package, ListTodo, Trophy, X, Camera, Trash2, Loader2, User, Plus, Building2, Calendar, Bike, Car, HelpCircle, FileText, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useDeliveryCategories } from "@/hooks/useDeliveryCategories";
import { useCompanies } from "@/hooks/useOperacional";
import { useEntregasProfile } from "@/contexts/EntregasProfileContext";
import { useDeliveryRequesters } from "@/hooks/useDeliveryRequesters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "./cearagps.css";

const STATUS_STYLES: Record<string, string> = {
  "Pendente": "bg-amber-100 text-amber-800 border-amber-200",
  "Em rota": "bg-blue-100 text-blue-800 border-blue-200",
  "Finalizado": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Cancelado": "bg-rose-100 text-rose-800 border-rose-200",
};

const TEAL = "hsl(191 74% 20%)";
const TEAL_DARK = "hsl(191 74% 12%)";
const ORANGE = "hsl(14 82% 51%)";

function formatTime(iso?: string | null) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

export default function OpEntregasMinhas() {
  const navigate = useNavigate();
  const { profile, clear } = useEntregasProfile();
  const { items, loading, update } = useDeliveries();
  const { activeItems: categories } = useDeliveryCategories();
  const { items: companies } = useCompanies();
  const { items: requesters } = useDeliveryRequesters();

  const [tab, setTab] = useState<"tarefas" | "finalizadas">("tarefas");
  const [highContrast, setHighContrast] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [finishingId, setFinishingId] = useState<string | null>(null);

  const isMotorista = profile?.type === "motorista";
  const isSolicitante = profile?.type === "solicitante";

  const mine = useMemo(() => {
    if (!profile) return [];
    if (isMotorista) return items.filter((d) => d.driver_id === profile.id);
    if (isSolicitante) return items.filter((d) => d.requester_name === profile.name);
    return items;
  }, [items, profile, isMotorista, isSolicitante]);

  const active = useMemo(
    () => mine.filter((d) => d.status !== "Finalizado" && d.status !== "Cancelado"),
    [mine]
  );
  const finished = useMemo(
    () => mine
      .filter((d) => d.status === "Finalizado" || d.status === "Cancelado")
      .sort((a, b) => (b.closed_at || b.scheduled_date).localeCompare(a.closed_at || a.scheduled_date)),
    [mine]
  );

  const todayISO = new Date().toISOString().slice(0, 10);
  const routesToday = active.filter((d) => d.scheduled_date === todayISO).length;
  const doneToday = finished.filter((d) => (d.closed_at || "").slice(0, 10) === todayISO).length;

  const logout = () => { clear(); navigate("/op/entregas/pin"); };

  const startRoute = async (id: string) => {
    await update(id, { status: "Em rota" });
    toast.success("🚀 Em rota!");
  };
  const handleFinishConfirm = async (
    id: string,
    payload: { receiver_name: string; receiver_document?: string; notes?: string; photos: string[] }
  ) => {
    await update(id, {
      status: "Finalizado",
      closed_at: new Date().toISOString() as any,
      receiver_name: payload.receiver_name,
      receiver_document: payload.receiver_document || null,
      closure_summary: payload.notes || null,
      photos: payload.photos as any,
    } as any);
    toast.success("✅ Entrega finalizada!");
    setFinishingId(null);
    setExpandedId(null);
  };

  const reportProblem = (d: any) => {
    const rPhone = requesterPhone(d)?.replace(/\D/g, "");
    const rName = requesterName(d) || "solicitante";
    const ref = companyName(d.company_id) || d.address || catNameOf(d.category_id) || "entrega";
    const msg = `Olá ${rName}, sou o motorista responsável pela entrega "${ref}". Preciso relatar um problema/pedir uma informação:`;
    if (rPhone) {
      const withDdi = rPhone.length <= 11 ? `55${rPhone}` : rPhone;
      window.open(`https://wa.me/${withDdi}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      toast.error("Solicitante sem telefone cadastrado. Contate a equipe.");
    }
  };

  const catNameOf = (id?: string | null) => categories.find((c) => c.id === id)?.name;
  const catColorOf = (id?: string | null) => categories.find((c) => c.id === id)?.color || "#0d4a56";
  const companyName = (id?: string | null) => companies.find((c) => c.id === id)?.name;
  const requesterName = (d: any) => d.requester_name || requesters.find((r) => r.id === d.requester_id)?.name;
  const requesterPhone = (d: any) => {
    const name = d.requester_name;
    if (name) return requesters.find((r) => r.name === name)?.phone || null;
    return requesters.find((r) => r.id === d.requester_id)?.phone || null;
  };
  const vehicleLabel = (v?: string | null) => {
    if (v === "moto") return { label: "Moto", Icon: Bike };
    if (v === "carro") return { label: "Carro", Icon: Car };
    return { label: "Qualquer", Icon: HelpCircle };
  };
  const formatDate = (d?: string | null) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const bg = highContrast ? "#000000" : "hsl(210 20% 96%)";
  const cardBg = highContrast ? "#0b0b0b" : "#ffffff";
  const textMain = highContrast ? "#ffffff" : "hsl(222 20% 18%)";
  const textMuted = highContrast ? "#c4c4c4" : "hsl(215 15% 45%)";

  const listToShow = tab === "tarefas" ? active : finished;

  return (
    <div className="cgps-scope min-h-screen pb-24" style={{ background: bg, color: textMain }}>
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between sticky top-0 z-30" style={{ background: TEAL }}>
        <div className="flex items-center gap-3">
          <span className="text-white font-extrabold tracking-tight text-lg">
            CEARA<span style={{ color: ORANGE }}> GPS</span>
          </span>
          {profile && (
            <span
              className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
              style={{ background: TEAL_DARK, color: "#ffffff" }}
            >
              {profile.type}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setHighContrast((v) => !v)}
            className="h-9 w-9 rounded-md flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)", color: "#ffffff" }}
            aria-label="Alto contraste"
          >
            {highContrast ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={logout}
            className="h-9 w-9 rounded-md flex items-center justify-center"
            style={{ background: ORANGE, color: "#ffffff" }}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </motion.button>
        </div>
      </header>

      {/* Welcome + counters */}
      <section className="px-5 pt-5 pb-4" style={{ background: cardBg, borderBottom: "1px solid hsl(210 15% 90%)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>Bem-vindo(a),</div>
            <h1 className="text-2xl font-extrabold leading-tight" style={{ color: textMain }}>
              {profile?.name || "—"}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>Rotas de hoje</div>
            <motion.div
              key={routesToday}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-1 inline-flex items-center justify-center min-w-8 h-8 px-2.5 rounded-full text-sm font-bold"
              style={{ background: "hsl(180 25% 92%)", color: TEAL }}
            >
              {routesToday}
            </motion.div>
          </div>
        </div>

        {/* Progress bar */}
        {mine.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5" style={{ color: textMuted }}>
              <span>PROGRESSO DO DIA</span>
              <span>{doneToday}/{doneToday + routesToday} entregues</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(210 15% 90%)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(doneToday / Math.max(1, doneToday + routesToday)) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${ORANGE}, hsl(160 65% 45%))` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-2 grid grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setTab("tarefas"); setExpandedId(null); }}
          className="rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition"
          style={
            tab === "tarefas"
              ? { background: ORANGE, color: "#ffffff", boxShadow: "0 8px 24px -8px hsl(14 82% 51% / 0.55)" }
              : { background: cardBg, color: textMain, border: "1px solid hsl(210 15% 88%)" }
          }
        >
          <ListTodo className="h-4 w-4" />
          {isSolicitante ? `STATUS DE SOLICITAÇÃO (${active.length})` : `MINHAS TAREFAS (${active.length})`}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setTab("finalizadas"); setExpandedId(null); }}
          className="rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition"
          style={
            tab === "finalizadas"
              ? { background: "hsl(160 65% 38%)", color: "#ffffff", boxShadow: "0 8px 24px -8px hsl(160 65% 38% / 0.55)" }
              : { background: cardBg, color: textMain, border: "1px solid hsl(210 15% 88%)" }
          }
        >
          <Trophy className="h-4 w-4" />
          {isSolicitante ? `FINALIZADAS (${finished.length})` : `FINALIZADAS (${finished.length})`}
        </motion.button>
      </div>

      {/* Content */}
      <main className="px-4 pt-2">
        {loading ? (
          <div className="text-center py-12" style={{ color: textMuted }}>Carregando...</div>
        ) : listToShow.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-xl p-8 text-center"
            style={{ background: cardBg, border: "1px solid hsl(210 15% 88%)" }}
          >
          {tab === "tarefas" ? (
              <>
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: "hsl(160 60% 45%)" }} />
                <div className="font-extrabold text-lg" style={{ color: textMain }}>
                  {isSolicitante ? "Nenhuma solicitação em andamento" : "Tudo em dia! 🎉"}
                </div>
                <p className="text-sm mt-1" style={{ color: textMuted }}>
                  {isSolicitante ? "Suas solicitações pendentes ou em rota aparecerão aqui." : "Sem entregas pendentes no momento."}
                </p>
              </>
            ) : (
              <>
                <Package className="h-12 w-12 mx-auto mb-3" style={{ color: textMuted }} />
                <div className="font-extrabold text-lg" style={{ color: textMain }}>
                  {isSolicitante ? "Nenhuma solicitação finalizada" : "Nenhuma entrega finalizada"}
                </div>
                <p className="text-sm mt-1" style={{ color: textMuted }}>
                  {isSolicitante ? "Suas solicitações concluídas aparecerão aqui." : "Suas entregas concluídas aparecerão aqui."}
                </p>
              </>
            )}
          </motion.div>
        ) : (
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {listToShow.map((d) => {
                  const catName = catNameOf(d.category_id) || d.type;
                  const catColor = catColorOf(d.category_id);
                  const cName = companyName(d.company_id);
                  const reqName = requesterName(d);
                  const phone = d.receiver_phone || d.contact_phone;
                  const cleanPhone = phone?.replace(/\D/g, "");
                  const isExpanded = expandedId === d.id;
                  const isFinished = d.status === "Finalizado" || d.status === "Cancelado";
                  const mapsUrl = d.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.address)}` : null;

                  return (
                    <motion.article
                      layout
                      key={d.id}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -60, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 260, damping: 24 }}
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: cardBg,
                        border: `1px solid ${isExpanded ? ORANGE : "hsl(210 15% 88%)"}`,
                        boxShadow: highContrast ? "none" : isExpanded
                          ? "0 12px 32px -12px hsl(14 82% 51% / 0.35)"
                          : "0 2px 8px -4px rgba(0,0,0,0.08)",
                      }}
                    >
                      {/* Header row (always visible, tap to expand) */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : d.id)}
                        className="w-full text-left p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-lg font-extrabold truncate" style={{ color: textMain }}>
                              {cName || d.associated_name || "Entrega"}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span
                                className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                style={{ background: catColor + "22", color: catColor }}
                              >
                                {catName}
                              </span>
                              {isFinished && d.closed_at && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: textMuted }}>
                                  <Clock className="h-3 w-3" />
                                  {formatTime(d.closed_at)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[d.status] || ""}`}>
                              {d.status}
                            </span>
                            {!isFinished && (
                              <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown className="h-4 w-4" style={{ color: textMuted }} />
                              </motion.span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          {reqName && (
                            <div className="flex items-center gap-2 text-sm" style={{ color: textMain }}>
                              <User className="h-4 w-4 flex-shrink-0" style={{ color: TEAL }} />
                              <span className="font-medium">
                                <span style={{ color: textMuted }}>Solicitante: </span>{reqName}
                              </span>
                            </div>
                          )}
                          {phone && (
                            <div className="flex items-center gap-2 text-sm" style={{ color: textMain }}>
                              <Phone className="h-4 w-4 flex-shrink-0" style={{ color: "hsl(142 70% 40%)" }} />
                              <span className="font-medium">
                                <span style={{ color: textMuted }}>Recebedor: </span>{phone}
                              </span>
                            </div>
                          )}
                          {d.address && (
                            <div className="flex items-start gap-2 text-sm" style={{ color: textMain }}>
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: ORANGE }} />
                              <span className="font-medium">{d.address}</span>
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Expanded content: full details + actions */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3">
                              {/* Detalhes completos (somente leitura) */}
                              <div className="rounded-lg p-3 space-y-2" style={{ background: highContrast ? "#161616" : "hsl(210 20% 97%)" }}>
                                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: textMuted }}>
                                  Detalhes da solicitação
                                </div>
                                {cName && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Building2 className="h-4 w-4 flex-shrink-0" style={{ color: TEAL }} />
                                    <span style={{ color: textMuted }}>Empresa:</span>
                                    <span className="font-bold ml-auto text-right" style={{ color: textMain }}>{cName}</span>
                                  </div>
                                )}
                                {reqName && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 flex-shrink-0" style={{ color: TEAL }} />
                                    <span style={{ color: textMuted }}>Solicitante:</span>
                                    <span className="font-bold ml-auto text-right" style={{ color: textMain }}>{reqName}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: TEAL }} />
                                  <span style={{ color: textMuted }}>Data / Período:</span>
                                  <span className="font-bold ml-auto text-right" style={{ color: textMain }}>
                                    {formatDate(d.scheduled_date)} • {d.period}
                                  </span>
                                </div>
                                {d.vehicle_required && (() => {
                                  const v = vehicleLabel(d.vehicle_required);
                                  return (
                                    <div className="flex items-center gap-2 text-sm">
                                      <v.Icon className="h-4 w-4 flex-shrink-0" style={{ color: TEAL }} />
                                      <span style={{ color: textMuted }}>Veículo:</span>
                                      <span className="font-bold ml-auto text-right" style={{ color: textMain }}>{v.label}</span>
                                    </div>
                                  );
                                })()}
                                {d.contact_name && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 flex-shrink-0" style={{ color: "hsl(142 70% 40%)" }} />
                                    <span style={{ color: textMuted }}>Recebedor:</span>
                                    <span className="font-bold ml-auto text-right" style={{ color: textMain }}>{d.contact_name}</span>
                                  </div>
                                )}
                                {phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4 flex-shrink-0" style={{ color: "hsl(142 70% 40%)" }} />
                                    <span style={{ color: textMuted }}>Tel. recebedor:</span>
                                    <span className="font-bold ml-auto text-right" style={{ color: textMain }}>{phone}</span>
                                  </div>
                                )}
                                {d.address && (
                                  <div className="flex items-start gap-2 text-sm">
                                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: ORANGE }} />
                                    <span style={{ color: textMuted }}>Endereço:</span>
                                    <span className="font-bold ml-auto text-right" style={{ color: textMain }}>{d.address}</span>
                                  </div>
                                )}
                                {d.notes && (
                                  <div className="flex items-start gap-2 text-sm pt-1 mt-1 border-t" style={{ borderColor: highContrast ? "#2a2a2a" : "hsl(210 15% 90%)" }}>
                                    <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: textMuted }} />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>Observações</div>
                                      <div className="font-medium mt-0.5 whitespace-pre-wrap break-words" style={{ color: textMain }}>
                                        {renderWithLinks(d.notes)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Ações de contato com recebedor */}
                              {cleanPhone && !isFinished && (
                                <div className="grid grid-cols-2 gap-2">
                                  <motion.a
                                    whileTap={{ scale: 0.96 }}
                                    href={`tel:${cleanPhone}`}
                                    className="rounded-lg py-2.5 flex items-center justify-center gap-1.5 text-sm font-bold"
                                    style={{ background: TEAL, color: "#ffffff" }}
                                  >
                                    <Phone className="h-4 w-4" /> Ligar recebedor
                                  </motion.a>
                                  <motion.a
                                    whileTap={{ scale: 0.96 }}
                                    href={`https://wa.me/55${cleanPhone}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg py-2.5 flex items-center justify-center gap-1.5 text-sm font-bold"
                                    style={{ background: "hsl(142 70% 40%)", color: "#ffffff" }}
                                  >
                                    <MessageCircle className="h-4 w-4" /> WhatsApp
                                  </motion.a>
                                </div>
                              )}

                              {mapsUrl && !isFinished && (
                                <motion.a
                                  whileTap={{ scale: 0.97 }}
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-bold"
                                  style={{ background: "hsl(210 15% 96%)", color: TEAL, border: "1px solid hsl(210 15% 88%)" }}
                                >
                                  <Navigation className="h-4 w-4" /> Abrir no Google Maps
                                </motion.a>
                              )}

                              {isMotorista && !isFinished && (
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => reportProblem(d)}
                                  className="w-full rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-bold"
                                  style={{ background: "hsl(38 92% 50%)", color: "#ffffff", boxShadow: "0 6px 18px -8px hsl(38 92% 50% / 0.6)" }}
                                >
                                  <AlertTriangle className="h-4 w-4" /> Reportar problema ao solicitante
                                </motion.button>
                              )}


                              {d.status === "Pendente" && isMotorista && (
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => startRoute(d.id)}
                                  className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wide"
                                  style={{ background: "hsl(220 90% 55%)", color: "#ffffff", boxShadow: "0 8px 24px -10px hsl(220 90% 55% / 0.6)" }}
                                >
                                  <PlayCircle className="h-5 w-5" /> Iniciar deslocamento
                                </motion.button>
                              )}
                              {d.status === "Em rota" && (
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => setFinishingId(d.id)}
                                  className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wide"
                                  style={{ background: "hsl(160 65% 38%)", color: "#ffffff", boxShadow: "0 8px 24px -10px hsl(160 65% 38% / 0.6)" }}
                                >
                                  <CheckCircle2 className="h-5 w-5" /> Finalizar entrega
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.article>
                  );
                })}
              </div>
            </AnimatePresence>
          </LayoutGroup>
        )}
      </main>

      {isSolicitante && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/op/entregas/solicitar")}
          className="fixed bottom-6 right-6 z-40 rounded-full h-16 w-16 flex items-center justify-center shadow-2xl"
          style={{ background: ORANGE, color: "#ffffff", boxShadow: "0 12px 32px -8px hsl(14 82% 51% / 0.65)" }}
          aria-label="Nova solicitação"
        >
          <Plus className="h-7 w-7" />
        </motion.button>
      )}

      <FinishDeliveryModal
        deliveryId={finishingId}
        highContrast={highContrast}
        onClose={() => setFinishingId(null)}
        onConfirm={handleFinishConfirm}
      />
    </div>
  );
}

// ============ Modal de finalização ============
function FinishDeliveryModal({
  deliveryId,
  highContrast,
  onClose,
  onConfirm,
}: {
  deliveryId: string | null;
  highContrast: boolean;
  onClose: () => void;
  onConfirm: (
    id: string,
    payload: { receiver_name: string; receiver_document?: string; notes?: string; photos: string[] }
  ) => Promise<void>;
}) {
  const [receiverName, setReceiverName] = useState("");
  const [receiverDoc, setReceiverDoc] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<{ url: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isOpen = !!deliveryId;
  const bg = highContrast ? "#0b0b0b" : "#ffffff";
  const text = highContrast ? "#ffffff" : "hsl(222 20% 18%)";
  const muted = highContrast ? "#b4b4b4" : "hsl(215 15% 45%)";
  const inputBg = highContrast ? "#161616" : "hsl(210 20% 97%)";
  const border = highContrast ? "#2a2a2a" : "hsl(210 15% 88%)";

  const reset = () => {
    setReceiverName(""); setReceiverDoc(""); setNotes(""); setPhotos([]);
  };

  const close = () => { if (!saving && !uploading) { reset(); onClose(); } };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !deliveryId) return;
    setUploading(true);
    try {
      const uploaded: { url: string; path: string }[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${deliveryId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("delivery-photos").upload(path, file, {
          cacheControl: "3600", upsert: false, contentType: file.type,
        });
        if (error) throw error;
        const { data } = supabase.storage.from("delivery-photos").getPublicUrl(path);
        uploaded.push({ url: data.publicUrl, path });
      }
      setPhotos((p) => [...p, ...uploaded]);
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async (path: string) => {
    await supabase.storage.from("delivery-photos").remove([path]);
    setPhotos((p) => p.filter((x) => x.path !== path));
  };

  const submit = async () => {
    if (!deliveryId) return;
    if (!receiverName.trim()) { toast.error("Informe o nome de quem recebeu"); return; }
    setSaving(true);
    try {
      await onConfirm(deliveryId, {
        receiver_name: receiverName.trim(),
        receiver_document: receiverDoc.trim() || undefined,
        notes: notes.trim() || undefined,
        photos: photos.map((p) => p.url),
      });
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={close}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92vh] flex flex-col"
            style={{ background: bg, color: text }}
          >
            <header className="px-5 py-4 flex items-center justify-between" style={{ background: TEAL, color: "#fff" }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <h2 className="font-extrabold text-base uppercase tracking-wide">Finalizar entrega</h2>
              </div>
              <button onClick={close} className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: muted }}>
                  Quem recebeu? *
                </label>
                <div className="relative">
                  <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: muted }} />
                  <input
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full rounded-lg pl-9 pr-3 py-3 text-sm font-medium outline-none"
                    style={{ background: inputBg, color: text, border: `1px solid ${border}` }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: muted }}>
                  Documento (opcional)
                </label>
                <input
                  value={receiverDoc}
                  onChange={(e) => setReceiverDoc(e.target.value)}
                  placeholder="RG, CPF ou matrícula"
                  className="w-full rounded-lg px-3 py-3 text-sm font-medium outline-none"
                  style={{ background: inputBg, color: text, border: `1px solid ${border}` }}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: muted }}>
                  Observações (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Ex: entregue na portaria, cliente ausente..."
                  className="w-full rounded-lg px-3 py-3 text-sm font-medium outline-none resize-none"
                  style={{ background: inputBg, color: text, border: `1px solid ${border}` }}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: muted }}>
                  Fotos ({photos.length})
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p) => (
                    <div key={p.path} className="relative aspect-square rounded-lg overflow-hidden" style={{ border: `1px solid ${border}` }}>
                      <img src={p.url} alt="foto" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(p.path)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-md flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: inputBg, color: muted, border: `1.5px dashed ${border}` }}
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                    {uploading ? "Enviando" : "Adicionar"}
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>
            </div>

            <footer className="p-4 flex gap-2" style={{ borderTop: `1px solid ${border}` }}>
              <button
                onClick={close}
                disabled={saving || uploading}
                className="flex-1 rounded-xl py-3 text-sm font-bold uppercase tracking-wide"
                style={{ background: inputBg, color: text, border: `1px solid ${border}` }}
              >
                Cancelar
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={submit}
                disabled={saving || uploading || !receiverName.trim()}
                className="flex-[2] rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wide disabled:opacity-50"
                style={{ background: "hsl(160 65% 38%)", color: "#fff", boxShadow: "0 8px 24px -10px hsl(160 65% 38% / 0.6)" }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? "Salvando" : "Confirmar entrega"}
              </motion.button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
