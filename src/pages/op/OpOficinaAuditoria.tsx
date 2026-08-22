import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanies } from "@/hooks/useOperacional";
import { useServiceOrderDetails } from "@/hooks/useOficina";
import { useServiceTypes, useOsServiceItems } from "@/hooks/useOficinaScoring";
import { filterOficinaCompanies } from "@/lib/oficinaCompanies";
import { formatPoints, POINTS_STATUS_INFO, type OsServiceItem } from "@/lib/oficinaScoring";
import DateRangeFilter, { todayStr, inDateRange } from "@/components/shared/DateRangeFilter";
import OsAuditPanel from "@/components/operacional/OsAuditPanel";
import OficinaNav from "./OficinaNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fancybox } from "@fancyapps/ui/dist/fancybox/fancybox.js";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import { cn } from "@/lib/utils";

interface AuditOs {
  id: string;
  plate: string;
  model: string | null;
  company_id: string | null;
  mechanic_id: string | null;
  service_type_id: string | null;
  status: string;
  finished_at: string | null;
  points_requested: number | null;
  points_approved: number | null;
  points_status: string | null;
  points_audited_at: string | null;
}

type OsItemsApi = ReturnType<typeof useOsServiceItems>;

/** Card de uma OS na auditoria: dados, painel de aprovação e fotos. */
function AuditOsCard({ os, isQueue, names, osItems, onFinalized }: {
  os: AuditOs;
  isQueue: boolean;
  names: { company: (id?: string | null) => string; type: (id?: string | null) => string; mech: (id?: string | null) => string };
  osItems: OsItemsApi;
  onFinalized: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const { photos } = useServiceOrderDetails(open ? os.id : null);
  const items = osItems.byOs[os.id] || [];
  const stInfo = POINTS_STATUS_INFO[os.points_status || "pendente"] || POINTS_STATUS_INFO.pendente;

  const finalize = async () => {
    setFinalizing(true);
    const ok = await osItems.finalizeAudit(os.id, items, null);
    setFinalizing(false);
    if (ok) onFinalized();
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-3">
        <button type="button" className="w-full flex items-center gap-3 flex-wrap text-left" onClick={() => setOpen(!open)}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{os.plate} {os.model ? `· ${os.model}` : ""}</p>
            <p className="text-xs text-muted-foreground">
              {names.company(os.company_id)} · {os.service_type_id ? names.type(os.service_type_id) : "Sem checklist"}
              {" · "}{names.mech(os.mechanic_id)}
              {" · "}{os.finished_at ? new Date(os.finished_at).toLocaleDateString("pt-BR") : "—"}
            </p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{formatPoints(Number(os.points_requested || 0))} solicitados</span>
          <span className="text-sm font-bold text-emerald-600 tabular-nums">{formatPoints(Number(os.points_approved || 0))} aprovados</span>
          <Badge variant="secondary" className={cn("text-[10px]", stInfo.chip)}>{stInfo.label}</Badge>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {open && (
          <div className="space-y-3 pt-2 border-t">
            <OsAuditPanel
              items={items}
              readOnly={!isQueue}
              showFinalize={isQueue}
              finalizing={finalizing}
              onApprove={(item, approved) => osItems.setItemApproval(item, approved)}
              onAdjust={(item, pts) => osItems.setItemAuditPoints(item, pts)}
              onFinalize={finalize}
            />
            <div>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                <Camera className="h-3.5 w-3.5" /> Fotos da OS ({photos.length})
              </p>
              {photos.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {photos.map((p: any) => (
                    <a key={p.id} href={p.photo_url} data-fancybox={`audit-fotos-${os.id}`} data-caption={`OS ${os.plate}`}>
                      <img src={p.photo_url} alt={`Foto da OS ${os.plate}`} className="h-16 w-16 object-cover rounded-md border" loading="lazy" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma foto anexada.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OpOficinaAuditoria() {
  const { profile, user } = useAuth();
  const orgId = profile?.organization_id;
  const { items: allCompanies } = useCompanies();
  const companies = filterOficinaCompanies(allCompanies);
  const { types } = useServiceTypes();
  const osItems = useOsServiceItems();

  const [orders, setOrders] = useState<AuditOs[]>([]);
  const [mechanics, setMechanics] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [mechanicFilter, setMechanicFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("1990-01-01");
  const [dateTo, setDateTo] = useState(todayStr());

  const fetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [{ data: os }, { data: mecs }] = await Promise.all([
      supabase
        .from("op_service_orders")
        .select("id, plate, model, company_id, mechanic_id, service_type_id, status, finished_at, points_requested, points_approved, points_status, points_audited_at")
        .eq("organization_id", orgId)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false }),
      supabase.from("op_mechanics").select("id, name").eq("organization_id", orgId),
    ]);
    setOrders((os || []) as unknown as AuditOs[]);
    setMechanics((mecs || []) as { id: string; name: string }[]);
    setLoading(false);
  }, [orgId]);
  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    Fancybox.bind(document.body, "[data-fancybox]", {});
    return () => Fancybox.destroy();
  }, []);

  const names = useMemo(() => ({
    company: (id?: string | null) => companies.find((c) => c.id === id)?.name || "—",
    type: (id?: string | null) => types.find((t) => t.id === id)?.name || "—",
    mech: (id?: string | null) => (id ? mechanics.find((m) => m.id === id)?.name || "—" : "Sem mecânico"),
  }), [companies, types, mechanics]);

  const filtered = useMemo(() => orders.filter((o) => {
    if (mechanicFilter !== "all" && o.mechanic_id !== mechanicFilter) return false;
    if (companyFilter !== "all" && o.company_id !== companyFilter) return false;
    if (!inDateRange(o.finished_at, dateFrom, dateTo)) return false;
    return true;
  }), [orders, mechanicFilter, companyFilter, dateFrom, dateTo]);

  const queue = filtered.filter((o) => o.points_status === "pendente");
  const audited = filtered.filter((o) => o.points_status === "aprovada" || o.points_status === "ajustada");

  return (
    <div className="min-h-screen bg-muted/30">
      <OficinaNav />
      <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> Auditoria de Pontos</h1>
        <p className="text-sm text-muted-foreground">
          Confira os serviços executados em cada OS finalizada, aprove ou ajuste os pontos do mecânico.
        </p>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <Label className="text-xs">Mecânico</Label>
          <Select value={mechanicFilter} onValueChange={setMechanicFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {mechanics.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Empresa</Label>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="fila">
          <TabsList>
            <TabsTrigger value="fila">Pendentes ({queue.length})</TabsTrigger>
            <TabsTrigger value="auditadas">Auditadas ({audited.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="fila" className="space-y-3 mt-4">
            {queue.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhuma OS aguardando auditoria.</p>
            )}
            {queue.map((o) => (
              <AuditOsCard key={o.id} os={o} isQueue names={names} osItems={osItems} onFinalized={fetch} />
            ))}
          </TabsContent>
          <TabsContent value="auditadas" className="space-y-3 mt-4">
            {audited.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhuma OS auditada no período.</p>
            )}
            {audited.map((o) => (
              <AuditOsCard key={o.id} os={o} isQueue={false} names={names} osItems={osItems} onFinalized={fetch} />
            ))}
          </TabsContent>
        </Tabs>
      )}
      </div>
    </div>
  );
}
