import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Monitor, Laptop, Printer, Server, Wifi, Battery, Phone, MonitorSpeaker, HardDrive,
  User, Hash, Building2, Calendar, Package, CheckCircle2, AlertTriangle,
  XCircle, RefreshCw, Wrench, ChevronDown, Clock, Activity, Timer, ListChecks,
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
  last_maintenance: { execution_date: string; responsible: string | null; notes: string | null; checklist: Record<string, unknown> | null } | null;
  maintenance_interval_days: number | null;
  maintenance_interval_source?: "configured" | "default";
  relocation_history: Array<{ changed_at: string; field: string; old_value: string | null; new_value: string | null }>;
}

const typeIcons: Record<string, React.ReactNode> = {
  Desktop: <Monitor className="h-10 w-10" />,
  Notebook: <Laptop className="h-10 w-10" />,
  Impressora: <Printer className="h-10 w-10" />,
  Servidor: <Server className="h-10 w-10" />,
  Switch: <Wifi className="h-10 w-10" />,
  Roteador: <Wifi className="h-10 w-10" />,
  Nobreak: <Battery className="h-10 w-10" />,
  Monitor: <MonitorSpeaker className="h-10 w-10" />,
  "Telefone IP": <Phone className="h-10 w-10" />,
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; dot: string }> = {
  Ativo: { icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  "Em manutenção": { icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-700", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  Inativo: { icon: <XCircle className="h-4 w-4" />, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", dot: "bg-gray-400" },
  Descartado: { icon: <XCircle className="h-4 w-4" />, color: "text-red-700", bg: "bg-red-50 border-red-200", dot: "bg-red-500" },
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

const DEFAULT_MAINT_INTERVAL_DAYS = 90;

function computeMaintenanceHealth(
  lastDate: Date | null,
  intervalDays: number | null,
): { state: MaintHealth; nextDate: Date | null; daysLeft: number | null } {
  if (!lastDate) return { state: "none", nextDate: null, daysLeft: null };
  const effective = intervalDays && intervalDays > 0 ? intervalDays : DEFAULT_MAINT_INTERVAL_DAYS;
  const next = addDays(lastDate, effective);
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

  const [showTimeline, setShowTimeline] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

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
  const checklistItems = asset.last_maintenance?.checklist
    ? Object.entries(asset.last_maintenance.checklist as Record<string, unknown>)
    : [];

  return (
    <div
      className="min-h-screen p-4 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${rgba(primary, 0.06)} 0%, #f8fafc 50%, ${rgba(primary, 0.04)} 100%)`,
      }}
    >
      <div className="max-w-lg mx-auto space-y-4 pt-4 sm:pt-8">
        {/* 1. Logo da organização */}
        {asset.organization && (
          <div className="flex items-center justify-center gap-2.5 pb-1">
            {asset.organization.logo_url ? (
              <img
                src={asset.organization.logo_url}
                alt={asset.organization.name}
                className="h-9 w-9 rounded-md object-contain bg-white p-1 shadow-sm"
                style={{ borderTop: `2px solid ${primary}` }}
              />
            ) : (
              <div
                className="h-9 w-9 rounded-md bg-white shadow-sm flex items-center justify-center"
                style={{ borderTop: `2px solid ${primary}` }}
              >
                <Building2 className="h-4 w-4" style={{ color: primary }} />
              </div>
            )}
            <span className="text-sm font-semibold text-gray-700">{asset.organization.name}</span>
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden" style={{ borderTop: `3px solid ${primary}` }}>
          {/* 2. Foto do equipamento (ou ícone) */}
          {asset.photo_url ? (
            <div className="h-56 sm:h-64 bg-gray-100 relative">
              <img src={asset.photo_url} alt={asset.asset_tag} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className="h-40 sm:h-48 flex items-center justify-center text-white"
              style={{ background: headerGradient }}
            >
              <div className="h-20 w-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                {typeIcons[asset.equipment_type] || <HardDrive className="h-10 w-10" />}
              </div>
            </div>
          )}

          {/* 3-4-5. Patrimônio + Tipo + Status */}
          <div className="px-4 sm:px-5 py-5 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Nº Patrimônio</p>
                <p className="text-3xl font-bold tracking-tight text-gray-900 leading-tight">{asset.asset_tag}</p>
                <p className="text-sm text-gray-500 mt-1">{asset.equipment_type}</p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${status.bg} ${status.color}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {asset.status}
              </span>
            </div>
          </div>

          {/* 6. Manutenção preventiva — DESTAQUE com countdown */}
          <div className="px-4 sm:px-5 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4" style={{ color: primary }} />
              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Manutenção preventiva</p>
            </div>
            <MaintenanceCountdown
              primary={primary}
              health={maintHealth.state}
              nextDate={maintHealth.nextDate}
              daysLeft={maintHealth.daysLeft}
              intervalDays={asset.maintenance_interval_days ?? DEFAULT_MAINT_INTERVAL_DAYS}
              intervalSource={asset.maintenance_interval_source ?? "default"}
              last={asset.last_maintenance}
            />

            {/* Checklist colapsável (se existir) */}
            {checklistItems.length > 0 && (
              <button
                onClick={() => setShowChecklist((v) => !v)}
                className="mt-3 w-full flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                aria-expanded={showChecklist}
              >
                <ListChecks className="h-3.5 w-3.5" />
                <span>Itens do checklist ({checklistItems.length})</span>
                <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${showChecklist ? "rotate-180" : ""}`} />
              </button>
            )}
            {showChecklist && checklistItems.length > 0 && (
              <ul className="mt-2 space-y-1.5 pl-1">
                {checklistItems.map(([key, val]) => {
                  const checked = val === true || val === "true" || val === 1;
                  return (
                    <li key={key} className="flex items-start gap-2 text-xs">
                      {checked ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-gray-300 mt-0.5 shrink-0" />
                      )}
                      <span className={checked ? "text-gray-700" : "text-gray-400 line-through"}>{key}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* 7. Tempo em uso */}
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: rgba(primary, 0.1), color: primary }}>
              <Activity className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm text-gray-700 font-medium">{usageLabel(asset.created_at)}</p>
          </div>

          {/* 8-11. Detalhes: Marca/Modelo, Setor, Responsável, Cadastro */}
          <div className="px-4 sm:px-5 py-3">
            {(asset.brand || asset.model) && (
              <DetailRow accent={primary} icon={<Package className="h-4 w-4" />} label="Marca / Modelo" value={[asset.brand, asset.model].filter(Boolean).join(" ")} />
            )}
            {asset.sector && (
              <DetailRow accent={primary} icon={<Building2 className="h-4 w-4" />} label="Setor" value={asset.sector} />
            )}
            {asset.responsible && (
              <DetailRow accent={primary} icon={<User className="h-4 w-4" />} label="Responsável" value={asset.responsible} />
            )}
            <DetailRow accent={primary} icon={<Calendar className="h-4 w-4" />} label="Cadastrado em" value={format(new Date(asset.created_at), "dd/MM/yyyy")} />
            {asset.serial_number && (
              <DetailRow accent={primary} icon={<Hash className="h-4 w-4" />} label="Nº Série" value={asset.serial_number} mono />
            )}
            {asset.notes && (
              <div className="pt-3 mt-2 border-t border-gray-100">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Observações</p>
                <p className="text-sm text-gray-700">{asset.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* 12. Linha do tempo (colapsável) */}
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

/* ──────────────── Subcomponentes ──────────────── */

function MaintenanceCountdown({
  primary,
  health,
  nextDate,
  daysLeft,
  intervalDays,
  intervalSource,
  last,
}: {
  primary: string;
  health: MaintHealth;
  nextDate: Date | null;
  daysLeft: number | null;
  intervalDays: number | null;
  intervalSource: "configured" | "default";
  last: { execution_date: string; responsible: string | null; notes: string | null } | null;
}) {
  // Cores por estado
  const palette: Record<MaintHealth, { bg: string; ring: string; text: string; bar: string; label: string }> = {
    ok:   { bg: "bg-emerald-50",  ring: "border-emerald-200", text: "text-emerald-700", bar: "bg-emerald-500", label: "Em dia" },
    warn: { bg: "bg-amber-50",    ring: "border-amber-200",   text: "text-amber-700",   bar: "bg-amber-500",   label: "Próxima do vencimento" },
    late: { bg: "bg-red-50",      ring: "border-red-200",     text: "text-red-700",     bar: "bg-red-500",     label: "Atrasada" },
    none: { bg: "bg-gray-50",     ring: "border-gray-200",    text: "text-gray-600",    bar: "bg-gray-400",    label: "Sem registro" },
  };
  const p = palette[health];

  // Progresso da barra (% do intervalo já decorrido)
  let progress = 0;
  if (intervalDays && daysLeft !== null) {
    const elapsed = intervalDays - daysLeft;
    progress = Math.max(0, Math.min(100, (elapsed / intervalDays) * 100));
  }
  if (health === "late") progress = 100;

  // Texto do contador
  let bigText = "—";
  let subText = "Sem dados";
  if (health === "none" && !last) {
    bigText = "Nenhuma";
    subText = "preventiva registrada";
  } else if (health === "none" && last) {
    bigText = "Sem intervalo";
    subText = "configurado para este tipo";
  } else if (daysLeft !== null) {
    if (daysLeft < 0) {
      const d = Math.abs(daysLeft);
      bigText = `${d}`;
      subText = `${d === 1 ? "dia" : "dias"} em atraso`;
    } else if (daysLeft === 0) {
      bigText = "Hoje";
      subText = "Vence hoje";
    } else {
      bigText = `${daysLeft}`;
      subText = `${daysLeft === 1 ? "dia restante" : "dias restantes"}`;
    }
  }

  return (
    <div className={`rounded-2xl border ${p.bg} ${p.ring} p-4`} style={{ borderLeft: `3px solid ${primary}` }}>
      {/* Header com label do estado */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${p.text}`}>
          <Timer className="h-3.5 w-3.5" />
          {p.label}
        </span>
        {nextDate && (
          <span className="text-[11px] text-gray-500">
            Próxima: <span className="font-semibold text-gray-700">{format(nextDate, "dd/MM/yyyy")}</span>
          </span>
        )}
      </div>

      {/* Contador grande */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-4xl font-bold leading-none ${p.text}`}>{bigText}</span>
        <span className="text-sm text-gray-500">{subText}</span>
      </div>

      {/* Barra de progresso */}
      {intervalDays && health !== "none" && (
        <div className="h-1.5 w-full bg-white/60 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full ${p.bar} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Microcopy: intervalo padrão */}
      {intervalSource === "default" && health !== "none" && (
        <p className="text-[11px] text-gray-400 mb-2">
          Intervalo padrão de {intervalDays} dias. Personalize em Preventivas › Intervalos.
        </p>
      )}

      {/* Última preventiva */}
      {last ? (
        <div className="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t border-white/60">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <span>
            Última: <span className="font-semibold text-gray-700">{format(new Date(last.execution_date), "dd/MM/yyyy")}</span>
            {last.responsible && <span className="text-gray-500"> por {last.responsible}</span>}
          </span>
        </div>
      ) : (
        <p className="text-xs text-gray-500 pt-2 border-t border-white/60">
          Nenhuma preventiva registrada para este patrimônio.
        </p>
      )}

      {last?.notes && (
        <p className="text-xs text-gray-500 mt-2 italic">"{last.notes}"</p>
      )}
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
