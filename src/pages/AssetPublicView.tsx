import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Monitor, Laptop, Printer, Server, Wifi, Battery, Phone, MonitorSpeaker, HardDrive, MapPin, User, Hash, Building2, Calendar, Package, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

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

export default function AssetPublicView() {
  const { id } = useParams<{ id: string }>();

  const { data: asset, isLoading, error } = useQuery<PublicAsset>({
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="h-10 w-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-sm">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Patrimônio não encontrado</h1>
          <p className="text-sm text-gray-500">O QR Code escaneado não corresponde a nenhum equipamento cadastrado.</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[asset.status] || statusConfig["Inativo"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-4 sm:p-6">
      <div className="max-w-lg mx-auto space-y-4 pt-4 sm:pt-8">
        {asset.organization && (
          <div className="flex items-center justify-center gap-2.5 pb-1">
            {asset.organization.logo_url ? (
              <img src={asset.organization.logo_url} alt={asset.organization.name} className="h-8 w-8 rounded-md object-contain bg-white p-1 shadow-sm" />
            ) : (
              <div className="h-8 w-8 rounded-md bg-white shadow-sm flex items-center justify-center">
                <Building2 className="h-4 w-4 text-gray-500" />
              </div>
            )}
            <span className="text-sm font-semibold text-gray-700">{asset.organization.name}</span>
          </div>
        )}

        {/* Hero Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Photo or icon header */}
          {asset.photo_url ? (
            <div className="h-48 sm:h-56 bg-gray-100 relative">
              <img src={asset.photo_url} alt={asset.asset_tag} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <p className="text-white text-2xl font-bold tracking-tight">{asset.asset_tag}</p>
                <p className="text-white/80 text-sm">{asset.equipment_type}</p>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white flex items-center gap-5">
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
              <DetailRow icon={<Package className="h-4 w-4" />} label="Marca / Modelo" value={[asset.brand, asset.model].filter(Boolean).join(" ")} />
            )}
            {asset.serial_number && (
              <DetailRow icon={<Hash className="h-4 w-4" />} label="Nº Série" value={asset.serial_number} mono />
            )}
            {asset.sector && (
              <DetailRow icon={<Building2 className="h-4 w-4" />} label="Setor" value={asset.sector} />
            )}
            {asset.responsible && (
              <DetailRow icon={<User className="h-4 w-4" />} label="Responsável" value={asset.responsible} />
            )}
            {asset.location && (
              <DetailRow icon={<MapPin className="h-4 w-4" />} label="Localização" value={asset.location} />
            )}
            <DetailRow icon={<Calendar className="h-4 w-4" />} label="Cadastrado em" value={format(new Date(asset.created_at), "dd/MM/yyyy")} />
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

function DetailRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-sm text-gray-800 ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
