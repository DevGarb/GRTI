import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Phone, MessageCircle, LogOut, Sun, Moon, Truck, CheckCircle2, PlayCircle, Mic } from "lucide-react";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useDeliveryCategories } from "@/hooks/useDeliveryCategories";
import { useCompanies } from "@/hooks/useOperacional";
import { useEntregasProfile } from "@/contexts/EntregasProfileContext";
import { useDeliveryRequesters } from "@/hooks/useDeliveryRequesters";
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

export default function OpEntregasMinhas() {
  const navigate = useNavigate();
  const { profile, clear } = useEntregasProfile();
  const { items, loading, update } = useDeliveries();
  const { activeItems: categories } = useDeliveryCategories();
  const { items: companies } = useCompanies();
  const { items: requesters } = useDeliveryRequesters();

  const [tab, setTab] = useState<"tarefas" | "chamado">("tarefas");
  const [highContrast, setHighContrast] = useState(false);

  const isMotorista = profile?.type === "motorista";
  const isSolicitante = profile?.type === "solicitante";

  const mine = useMemo(() => {
    if (!profile) return [];
    if (isMotorista) return items.filter((d) => d.driver_id === profile.id);
    if (isSolicitante) return items.filter((d) => d.requester_name === profile.name);
    return items;
  }, [items, profile, isMotorista, isSolicitante]);

  // hide finalized/cancelled
  const active = useMemo(
    () => mine.filter((d) => d.status !== "Finalizado" && d.status !== "Cancelado"),
    [mine]
  );

  const todayISO = new Date().toISOString().slice(0, 10);
  const routesToday = active.filter((d) => d.scheduled_date === todayISO).length;

  const logout = () => { clear(); navigate("/op/entregas/pin"); };

  const startRoute = async (id: string) => {
    await update(id, { status: "Em rota" });
    toast.success("Em rota");
  };
  const finish = async (id: string) => {
    await update(id, { status: "Finalizado", closed_at: new Date().toISOString() as any });
    toast.success("Entrega finalizada");
  };

  const catNameOf = (id?: string | null) => categories.find((c) => c.id === id)?.name;
  const catColorOf = (id?: string | null) => categories.find((c) => c.id === id)?.color || "#0d4a56";
  const companyName = (id?: string | null) => companies.find((c) => c.id === id)?.name;
  const requesterName = (d: any) => d.requester_name || requesters.find((r) => r.id === d.requester_id)?.name;

  const bg = highContrast ? "#000000" : "hsl(210 20% 96%)";
  const cardBg = highContrast ? "#0b0b0b" : "#ffffff";
  const textMain = highContrast ? "#ffffff" : "hsl(222 20% 18%)";
  const textMuted = highContrast ? "#c4c4c4" : "hsl(215 15% 45%)";

  return (
    <div className="cgps-scope min-h-screen" style={{ background: bg, color: textMain }}>
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between" style={{ background: TEAL }}>
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
          <button
            onClick={() => setHighContrast((v) => !v)}
            className="h-9 w-9 rounded-md flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)", color: "#ffffff" }}
            aria-label="Alto contraste"
          >
            {highContrast ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            onClick={logout}
            className="h-9 w-9 rounded-md flex items-center justify-center"
            style={{ background: ORANGE, color: "#ffffff" }}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Welcome + counter */}
      <section className="px-5 pt-5 pb-3 flex items-start justify-between" style={{ background: cardBg, borderBottom: "1px solid hsl(210 15% 90%)" }}>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>Bem-vindo(a),</div>
          <h1 className="text-2xl font-extrabold leading-tight" style={{ color: textMain }}>
            {profile?.name || "—"}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>Rotas de hoje</div>
          <div className="mt-1 inline-flex items-center justify-center min-w-8 h-8 px-2.5 rounded-full text-sm font-bold" style={{ background: "hsl(180 25% 92%)", color: TEAL }}>
            {routesToday}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-2 grid grid-cols-2 gap-3">
        <button
          onClick={() => setTab("tarefas")}
          className="rounded-xl px-4 py-3 text-sm font-bold text-left transition"
          style={
            tab === "tarefas"
              ? { background: ORANGE, color: "#ffffff", boxShadow: "0 6px 20px -8px hsl(14 82% 51% / 0.6)" }
              : { background: cardBg, color: textMain, border: "1px solid hsl(210 15% 88%)" }
          }
        >
          MINHAS TAREFAS ({active.length})
        </button>
        <button
          onClick={() => setTab("chamado")}
          className="rounded-xl px-4 py-3 text-xs font-bold leading-tight text-left transition"
          style={
            tab === "chamado"
              ? { background: ORANGE, color: "#ffffff" }
              : { background: cardBg, color: textMain, border: "1px solid hsl(210 15% 88%)" }
          }
        >
          ABRIR CHAMADO<br />VOZ / GPS
        </button>
      </div>

      {/* Content */}
      <main className="px-4 pt-2 pb-8">
        {tab === "chamado" ? (
          <div className="mt-4 rounded-xl p-6 text-center" style={{ background: cardBg, border: "1px dashed hsl(210 15% 82%)" }}>
            <Mic className="h-8 w-8 mx-auto mb-2" style={{ color: TEAL }} />
            <div className="font-bold mb-1" style={{ color: textMain }}>Chamado por voz + GPS</div>
            <p className="text-xs" style={{ color: textMuted }}>
              Recurso em breve. Vai permitir abrir um chamado ditando o problema e enviando sua localização.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-12" style={{ color: textMuted }}>Carregando...</div>
        ) : active.length === 0 ? (
          <div className="mt-6 rounded-xl p-8 text-center" style={{ background: cardBg, border: "1px solid hsl(210 15% 88%)" }}>
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2" style={{ color: "hsl(160 60% 40%)" }} />
            <div className="font-bold" style={{ color: textMain }}>Sem tarefas pendentes</div>
            <p className="text-xs mt-1" style={{ color: textMuted }}>Todas as entregas foram finalizadas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {active.map((d) => {
              const catName = catNameOf(d.category_id) || d.type;
              const catColor = catColorOf(d.category_id);
              const cName = companyName(d.company_id);
              const reqName = requesterName(d);
              const phone = d.receiver_phone || d.contact_phone;
              const cleanPhone = phone?.replace(/\D/g, "");

              return (
                <article
                  key={d.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: cardBg, border: "1px solid hsl(210 15% 88%)", boxShadow: highContrast ? "none" : "0 2px 8px -4px rgba(0,0,0,0.08)" }}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-lg font-extrabold" style={{ color: textMain }}>
                          {cName || d.associated_name || "Entrega"}
                        </div>
                        <span
                          className="inline-flex mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: catColor + "22", color: catColor }}
                        >
                          {catName}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[d.status] || ""}`}>
                        {d.status}
                      </span>
                    </div>

                    {d.address && (
                      <div className="flex items-start gap-2 text-sm" style={{ color: textMain }}>
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: ORANGE }} />
                        <span className="font-medium">{d.address}</span>
                      </div>
                    )}

                    {(reqName || phone) && (
                      <div className="rounded-lg p-3 space-y-2" style={{ background: highContrast ? "#161616" : "hsl(210 20% 97%)" }}>
                        {reqName && (
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: textMuted }}>Solicitado por:</span>
                            <span className="font-bold" style={{ color: textMain }}>{reqName}</span>
                          </div>
                        )}
                        {phone && (
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: textMuted }}>Telefone do Recebedor:</span>
                            <span className="font-bold" style={{ color: textMain }}>{phone}</span>
                          </div>
                        )}
                        {cleanPhone && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <a
                              href={`tel:${cleanPhone}`}
                              className="rounded-lg py-2.5 flex items-center justify-center gap-1.5 text-sm font-bold"
                              style={{ background: TEAL, color: "#ffffff" }}
                            >
                              <Phone className="h-4 w-4" /> Ligar
                            </a>
                            <a
                              href={`https://wa.me/55${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg py-2.5 flex items-center justify-center gap-1.5 text-sm font-bold"
                              style={{ background: "hsl(142 70% 40%)", color: "#ffffff" }}
                            >
                              <MessageCircle className="h-4 w-4" /> WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-4 pt-0">
                    {d.status === "Pendente" && (
                      <button
                        onClick={() => startRoute(d.id)}
                        className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wide"
                        style={{ background: "hsl(220 90% 55%)", color: "#ffffff" }}
                      >
                        <PlayCircle className="h-5 w-5" /> Iniciar deslocamento (em rota)
                      </button>
                    )}
                    {d.status === "Em rota" && (
                      <button
                        onClick={() => finish(d.id)}
                        className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wide"
                        style={{ background: "hsl(160 65% 38%)", color: "#ffffff" }}
                      >
                        <CheckCircle2 className="h-5 w-5" /> Finalizar entrega
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
