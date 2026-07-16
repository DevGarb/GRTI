import { useMemo } from "react";
import EntregasNav from "./EntregasNav";
import { Badge } from "@/components/ui/badge";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useEntregasProfile } from "@/contexts/EntregasProfileContext";
import { MapPin, Clock, Truck } from "lucide-react";
import { formatDateBR } from "@/lib/dateFormat";

const STATUS_COLORS: Record<string, string> = {
  "Pendente": "bg-amber-100 text-amber-800",
  "Em rota": "bg-blue-100 text-blue-800",
  "Finalizado": "bg-emerald-100 text-emerald-800",
  "Cancelado": "bg-rose-100 text-rose-800",
};

export default function OpEntregasMinhas() {
  const { profile } = useEntregasProfile();
  const { items, loading } = useDeliveries();

  const mine = useMemo(() => {
    if (!profile) return [];
    if (profile.type === "solicitante") return items.filter((d) => d.requester_name === profile.name);
    if (profile.type === "motorista") return items.filter((d) => d.driver_id === profile.id);
    return items;
  }, [items, profile]);

  return (
    <div className="cgps-scope min-h-screen bg-[hsl(var(--cgps-muted))]">
      <EntregasNav />
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "hsl(191 74% 20%)" }}>
            {profile?.type === "solicitante" ? "Minhas solicitações" : "Minhas entregas"}
          </h1>
          <p className="text-sm text-muted-foreground">{mine.length} registro(s)</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : mine.length === 0 ? (
          <div className="text-center py-12 bg-white border rounded-lg text-muted-foreground">
            Nenhuma entrega encontrada.
          </div>
        ) : (
          <div className="space-y-3">
            {mine.map((d) => (
              <div key={d.id} className="bg-white border rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-slate-500" />
                    <span className="font-semibold">{d.type}</span>
                  </div>
                  <Badge className={(STATUS_COLORS[d.status] || "bg-slate-100 text-slate-700") + " border-0"}>
                    {d.status}
                  </Badge>
                </div>
                {d.address && (
                  <div className="text-sm text-slate-600 flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 mt-0.5" />
                    <span>{d.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatDateBR(d.scheduled_date)} · {d.period}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
