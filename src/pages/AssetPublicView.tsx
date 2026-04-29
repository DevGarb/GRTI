import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Monitor, Laptop, Printer, Server, Wifi, Battery, Phone, MonitorSpeaker, HardDrive, MapPin, User, Hash, Building2, Calendar, Package, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

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

// Convert #RRGGBB to {r,g,b}; tolerate invalid input.
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Darken a hex color by a 0..1 factor (toward black).
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

export default function AssetPublicView() {
  const { id } = useParams<{ id: string }>();

  const { data: asset, isLoading, isFetching, error, refetch } = useQuery<PublicAsset>({
    queryKey: ["asset-public", id],
    queryFn: async () => {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/get-public-asset?id=${id}`, {
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
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
            // Light skeleton shown only during retry — keeps layout stable, no full screen flash
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
                onClick={() => refetch()}
                style={{ backgroundColor: primary }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity w-full"
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
        <div
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
          style={{ borderTop: `3px solid ${primary}` }}
        >
          {/* Photo or icon header */}
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
            <div
              className="p-8 text-white flex items-center gap-5"
              style={{ background: headerGradient }}
            >
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

        {/* Footer */}
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
