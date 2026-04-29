import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Monitor, Laptop, Printer, Server, Wifi, Battery, Phone, MonitorSpeaker, HardDrive,
  MapPin, User, Hash, Building2, Calendar, Package, CheckCircle2, AlertTriangle,
  XCircle, RefreshCw, Wrench, ChevronDown, History, Clock, Activity,
} from "lucide-react";
import { format, differenceInDays, addDays, differenceInMonths } from "date-fns";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const DEFAULT_PRIMARY = "#0F4C4C";

interface PublicAsset {
  id: string;
  asset_tag: string;
  equipment_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  sector: string | null;
  responsible: string | null;
  location: string | null;
  status: string;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  organization: { name: string; logo_url: string | null; primary_color: string | null } | null;
  last_maintenance: { execution_date: string; responsible: string | null; notes: string | null } | null;
  maintenance_interval_days: number | null;
  relocation_history: Array<{ changed_at: string; field: string; old_value: string | null; new_value: string | null }>;
}

const typeIcons: Record<string, React.ReactNode> = {
  Desktop: <Monitor className="h-8 w-8" />,
  Notebook: <Laptop className="h-8 w-8" />,
  Impressora: <Printer className="h-8 w-8" />,
  Servidor: <Server className="h-8 w-8" />,
  Switch: <Wifi className="h-8 w-8" />,
  Roteador: <Wifi className="h-8 w-8" />,
  Nobreak: <Battery className="h-8 w-8" />,
  Monitor: <MonitorSpeaker className="h-8 w-8" />,
  "Telefone IP": <Phone className="h-8 w-8" />,
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Ativo: { icon: <CheckCircle2 className="h-5 w-5" />, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  "Em manutenção": { icon: <AlertTriangle className="h-5 w-5" />, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  Inativo: { icon: <XCircle className="h-5 w-5" />, color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
  Descartado: { icon: <XCircle className="h-5 w-5" />, color: "text-red-600", bg: "bg-red-50 border-red-200" },
};

const fieldLabels: Record<string, string> = {
  responsible: "Responsável",
  sector: "Setor",
  location: "Localização",
  status: "Status",
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function shade(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = Math.max(0, Math.min(1, factor));
  const r = Math.round(rgb.r * (1 - f));
  const g = Math.round(rgb.g * (1 - f));
  const b = Math.round(rgb.b * (1 - f));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(15, 76, 76, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

type MaintHealth = "ok" | "warn" | "late" | "none";

function computeMaintenanceHealth(
  lastDate: Date | null,
  intervalDays: number | null,
): { state: MaintHealth; nextDate: Date | null; daysLeft: number | null } {
  if (!lastDate || !intervalDays) return { state: "none", nextDate: null, daysLeft: null };
  const next = addDays(lastDate, intervalDays);
  const days = differenceInDays(next, new Date());
  if (days < 0) return { state: "late", nextDate: next, daysLeft: days };
  if (days <= 15) return { state: "warn", nextDate: next, daysLeft: days };
  return { state: "ok", nextDate: next, daysLeft: days };
}

function usageLabel(createdAt: string): string {
  const months = differenceInMonths(new Date(), new Date(createdAt));
  if (months < 1) return "Em uso há menos de 1 mês";
  if (months < 12) return `Em uso há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `Em uso há ${years} ${years === 1 ? "ano" : "anos"}`;
  return `Em uso há ${years} ${years === 1 ? "ano" : "anos"} e ${rem} ${rem === 1 ? "mês" : "meses"}`;
}

export default function AssetPublicView() {
  const { id } = useParams<{ id: string }>();

  const { data: asset, isLoading, isFetching, error, refetch } = useQuery<PublicAsset>({
    queryKey: ["asset-public", id],
    queryFn: async () => {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/get-public-asset?id=${id}`, {
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
      });
      if (!r.ok) throw new Error("not_found");
      return r.json();
    },
    enabled: !!id,
    retry: false,
  });

  const primary = (asset?.organization?.primary_color || DEFAULT_PRIMARY).trim() || DEFAULT_PRIMARY;
  const primaryDark = shade(primary, 0.25);
  const headerGradient = `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`;

  const RETRY_COOLDOWN_MS = 2000;
  const [cooldown, setCooldown] = useState(false);
  const lockedRef = useRef(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (cooldownTimer.current) clearTimeout(cooldownTimer.current); }, []);

  const handleRetry = () => {
    if (lockedRef.current || isFetching) return;
    lockedRef.current = true;
    setCooldown(true);
    refetch();
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => {
      lockedRef.current = false;
      setCooldown(false);
    }, RETRY_COOLDOWN_MS);
  };
  const retryDisabled = cooldown || isFetching;

  const [showHistory, setShowHistory] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const maintHealth = useMemo(() => {
    if (!asset) return { state: "none" as MaintHealth, nextDate: null, daysLeft: null };
    const last = asset.last_maintenance ? new Date(asset.last_maintenance.execution_date) : null;
    return computeMaintenanceHealth(last, asset.maintenance_interval_days);
  }, [asset]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div
          className="h-10 w-10 border-[3px] rounded-full animate-spin"
          style={{ borderColor: primary, borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 text-center max-w-sm w-full">
          {isFetching ? (
            <div className="animate-pulse" aria-busy="true" aria-label="Carregando">
              <div className="h-16 w-16 rounded-2xl bg-gray-100 mx-auto mb-5" />
              <div className="h-5 w-3/4 bg-gray-100 rounded mx-auto mb-3" />
              <div className="h-3 w-full bg-gray-100 rounded mx-auto mb-2" />
              <div className="h-3 w-5/6 bg-gray-100 rounded mx-auto mb-6" />
              <div className="h-10 w-full rounded-lg" style={{ backgroundColor: rgba(primary, 0.15) }} />
            </div>
          ) : (
            <>
              <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-100 mx-auto mb-5 flex items-center justify-center">
                <Package className="h-8 w-8 text-amber-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">Patrimônio não encontrado</h1>
              <p className="text-sm text-gray-500 mb-6">
                O QR Code escaneado não corresponde a nenhum equipamento cadastrado, ou o patrimônio pode ter sido removido.
              </p>
              <button
                onClick={handleRetry}
                disabled={retryDisabled}
                style={{ backgroundColor: primary }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity w-full disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </button>
              <p className="text-[11px] text-gray-400 mt-4">
                Se o problema persistir, entre em contato com o setor de TI.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const status = statusConfig[asset.status] || statusConfig["Inativo"];

  // Visual da saúde de manutenção
  const maintVisual: Record<MaintHealth, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    ok: { label: "Em dia", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: <CheckCircle2 className="h-5 w-5" /> },
    warn: { label: "Próxima do vencimento", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: <AlertTriangle className="h-5 w-5" /> },
    late: { label: "Atrasada", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: <AlertTriangle className="h-5 w-5" /> },
    none: { label: "Sem registro", color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200", icon: <Clock className="h-5 w-5" /> },
  };
  const mv = maintVisual[maintHealth.state];

  return (
    <div
      className="min-h-screen p-4 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${rgba(primary, 0.06)} 0%, #f8fafc 50%, ${rgba(primary, 0.04)} 100%)`,
      }}
    >
      <div className="max-w-lg mx-auto space-y-4 pt-4 sm:pt-8">
        {asset.organization && (
          <div className="flex items-center justify-center gap-2.5 pb-1">
            {asset.organization.logo_url ? (
              <img
                src={asset.organization.logo_url}
                alt={asset.organization.name}
                className="h-8 w-8 rounded-md object-contain bg-white p-1 shadow-sm"
                style={{ borderTop: `2px solid ${primary}` }}
              />
            ) : (
              <div
                className="h-8 w-8 rounded-md bg-white shadow-sm flex items-center justify-center"
                style={{ borderTop: `2px solid ${primary}` }}
              >
                <Building2 className="h-4 w-4" style={{ color: primary }} />
              </div>
            )}
            <span className="text-sm font-semibold text-gray-700">{asset.organization.name}</span>
          </div>
        )}

        {/* Hero Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden" style={{ borderTop: `3px solid ${primary}` }}>
          {asset.photo_url ? (
            <div className="h-48 sm:h-56 bg-gray-100 relative">
              <img src={asset.photo_url} alt={asset.asset_tag} className="w-full h-full object-cover" />
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(to top, ${rgba(primaryDark, 0.85)} 0%, transparent 60%)` }}
              />
              <div className="absolute bottom-4 left-4">
                <p className="text-white text-2xl font-bold tracking-tight">{asset.asset_tag}</p>
                <p className="text-white/80 text-sm">{asset.equipment_type}</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-white flex items-center gap-5" style={{ background: headerGradient }}>
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                {typeIcons[asset.equipment_type] || <HardDrive className="h-8 w-8" />}
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{asset.asset_tag}</p>
                <p className="text-white/80 text-sm mt-0.5">{asset.equipment_type}</p>
              </div>
            </div>
          )}

          {/* Status */}
          <div className={`mx-4 -mt-0 sm:mx-5 my-4 flex items-center gap-2.5 px-4 py-3 rounded-xl border ${status.bg}`}>
            <span className={status.color}>{status.icon}</span>
            <div>
              <p className={`text-sm font-semibold ${status.color}`}>{asset.status}</p>
              <p className="text-[11px] text-gray-500">Status atual do equipamento</p>
            </div>
          </div>

          {/* Manutenção */}
          <div className="mx-4 sm:mx-5 mb-4">
            <div
              className={`rounded-xl border ${mv.bg} ${mv.border} p-4`}
              style={{ borderLeft: `3px solid ${primary}` }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <span className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: rgba(primary, 0.1), color: primary }}>
                  <Wrench className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider">Manutenção preventiva</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={mv.color}>{mv.icon}</span>
                    <span className={`text-sm font-semibold ${mv.color}`}>{mv.label}</span>
                  </div>
                </div>
              </div>

              {asset.last_maintenance ? (
                <div className="space-y-1.5 text-sm">
                  <p className="text-gray-700">
                    <span className="text-gray-400 text-xs uppercase tracking-wider mr-2">Última</span>
                    {format(new Date(asset.last_maintenance.execution_date), "dd/MM/yyyy")}
                    {asset.last_maintenance.responsible && (
                      <span className="text-gray-500"> — {asset.last_maintenance.responsible}</span>
                    )}
                  </p>
                  {maintHealth.nextDate && (
                    <p className="text-gray-700">
                      <span className="text-gray-400 text-xs uppercase tracking-wider mr-2">Próxima</span>
                      {format(maintHealth.nextDate, "dd/MM/yyyy")}
                      {maintHealth.daysLeft !== null && (
                        <span className="text-gray-500 text-xs ml-1">
                          ({maintHealth.daysLeft < 0
                            ? `${Math.abs(maintHealth.daysLeft)} ${Math.abs(maintHealth.daysLeft) === 1 ? "dia" : "dias"} em atraso`
                            : maintHealth.daysLeft === 0
                            ? "hoje"
                            : `em ${maintHealth.daysLeft} ${maintHealth.daysLeft === 1 ? "dia" : "dias"}`})
                        </span>
                      )}
                    </p>
                  )}
                  {!asset.maintenance_interval_days && (
                    <p className="text-[11px] text-gray-400">Intervalo de manutenção não configurado para este tipo.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhuma preventiva registrada para este patrimônio.</p>
              )}
            </div>

            {/* Tempo de uso */}
            <div className="flex items-center gap-2 mt-3 px-1">
              <Activity className="h-3.5 w-3.5 text-gray-400" />
              <p className="text-xs text-gray-500">{usageLabel(asset.created_at)}</p>
            </div>
          </div>

          {/* Details */}
          <div className="px-4 sm:px-5 pb-5 space-y-3">
            {(asset.brand || asset.model) && (
              <DetailRow accent={primary} icon={<Package className="h-4 w-4" />} label="Marca / Modelo" value={[asset.brand, asset.model].filter(Boolean).join(" ")} />
            )}
            {asset.serial_number && (
              <DetailRow accent={primary} icon={<Hash className="h-4 w-4" />} label="Nº Série" value={asset.serial_number} mono />
            )}
            {asset.sector && (
              <DetailRow accent={primary} icon={<Building2 className="h-4 w-4" />} label="Setor" value={asset.sector} />
            )}
            {asset.responsible && (
              <DetailRow accent={primary} icon={<User className="h-4 w-4" />} label="Responsável" value={asset.responsible} />
            )}
            {asset.location && (
              <DetailRow accent={primary} icon={<MapPin className="h-4 w-4" />} label="Localização" value={asset.location} />
            )}
            <DetailRow accent={primary} icon={<Calendar className="h-4 w-4" />} label="Cadastrado em" value={format(new Date(asset.created_at), "dd/MM/yyyy")} />
            {asset.notes && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Observações</p>
                <p className="text-sm text-gray-700">{asset.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Histórico de manutenção (colapsável) */}
        {asset.last_maintenance && (
          <CollapsibleCard
            primary={primary}
            open={showHistory}
            onToggle={() => setShowHistory((v) => !v)}
            icon={<History className="h-4 w-4" />}
            title="Histórico de manutenção"
            count={1}
          >
            <div className="space-y-2 pt-2">
              <div className="text-sm text-gray-700">
                <p className="font-medium">
                  {format(new Date(asset.last_maintenance.execution_date), "dd/MM/yyyy")}
                  {asset.last_maintenance.responsible && (
                    <span className="text-gray-500 font-normal"> — {asset.last_maintenance.responsible}</span>
                  )}
                </p>
                {asset.last_maintenance.notes && (
                  <p className="text-xs text-gray-500 mt-1">{asset.last_maintenance.notes}</p>
                )}
              </div>
            </div>
          </CollapsibleCard>
        )}

        {/* Linha do tempo do equipamento (colapsável) */}
        <CollapsibleCard
          primary={primary}
          open={showTimeline}
          onToggle={() => setShowTimeline((v) => !v)}
          icon={<Clock className="h-4 w-4" />}
          title="Linha do tempo do equipamento"
          count={asset.relocation_history.length}
        >
          {asset.relocation_history.length === 0 ? (
            <p className="text-xs text-gray-500 pt-2">
              Sem alterações registradas. O histórico passa a ser registrado a partir das próximas edições do patrimônio.
            </p>
          ) : (
            <ol className="relative border-l-2 pt-2 space-y-3 ml-1.5" style={{ borderColor: rgba(primary, 0.2) }}>
              {asset.relocation_history.map((h, i) => (
                <li key={i} className="pl-4 relative">
                  <span
                    className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: primary }}
                  />
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                    {format(new Date(h.changed_at), "dd/MM/yyyy HH:mm")}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{fieldLabels[h.field] || h.field}</span>
                    : <span className="text-gray-500">{h.old_value || "—"}</span>
                    <span className="mx-1.5 text-gray-400">→</span>
                    <span className="text-gray-800">{h.new_value || "—"}</span>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CollapsibleCard>

        <p className="text-center text-[11px] text-gray-400 pb-4">
          Gerado automaticamente pelo sistema de gestão de patrimônio
        </p>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, mono, accent }: { icon: React.ReactNode; label: string; value: string; mono?: boolean; accent: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: rgba(accent, 0.1), color: accent }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-sm text-gray-800 ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function CollapsibleCard({
  primary, open, onToggle, icon, title, count, children,
}: {
  primary: string;
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden" style={{ borderTop: `2px solid ${rgba(primary, 0.4)}` }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <span className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: rgba(primary, 0.1), color: primary }}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          <p className="text-[11px] text-gray-400">{count} {count === 1 ? "registro" : "registros"}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-4 sm:px-5 pb-4">{children}</div>}
    </div>
  );
}
