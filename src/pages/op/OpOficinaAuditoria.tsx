import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanies } from "@/hooks/useOficina";
import { useServiceTypes, useOsServiceItems } from "@/hooks/useOficinaScoring";
import { getOsPhotos } from "@/hooks/useOperacional";
import { filterOficinaCompanies } from "@/lib/oficinaCompanies";
import { formatPoints, POINTS_STATUS_INFO, type OsServiceItem } from "@/lib/oficinaScoring";
import { DateRangeFilter, emptyRange, type DateRange, inRange } from "@/components/operacional/DateRangeFilter";
import OsAuditPanel from "@/components/operacional/OsAuditPanel";
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

export default function OpOficinaAuditoria() {
  const { profile, user } = useAuth();
  const orgId = profile?.organization_id;
  const { data: allCompanies = [] } = useCompanies();
  const companies = filterOficinaCompanies(allCompanies);
  const { types } = useServiceTypes();
  const osItems = useOsServiceItems();

  const [orders, setOrders] = useState<AuditOs[]>([]);
  const [mechanics, setMechanics] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [finalizing, setFinalizing] = useState<string | null>(null);

  const [mechanicFilter, setMechanicFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [range, setRange] = useState<DateRange>(emptyRange());

  const fetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [{ data: os }, { data: mecs }] = await Promise.all([
      supabase
        .from("op_service_orders")
        .select("id, plate, model, company_id, mechanic_id, service_type_id, status, finished_at, points_requested, points_approved, points_status, points_audited_at")
        .eq("organization_id", orgId)
        .eq("status", "entregue")
        .not("points_status", "is", null)
        .order("finished_at", { ascending: false }),
      supabase.from("op_mechanics").select("id, name").eq("organization_id", orgId),
    ]);
    setOrders((os || []) as unknown as AuditOs[]);
    setMechanics((mecs || []) as { id: string; name: string }[]);
    setLoading(false);
  }, [orgId]);
  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    Fancybox.bind(document.body, "[data-fancybox='audit-fotos']", {});
    return () => Fancybox.destroy();
  }, []);

  useEffect(() => {
    if (!expanded || photos[expanded]) return;
    let cancelled = false;
    getOsPhotos(expanded).then((urls) => {
      if (!cancelled) setPhotos((p) => ({ ...p, [expanded]: urls }));
    });
    return () => { cancelled = true; };
  }, [expanded, photos]);

  const companyName = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);
  const typeName = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t.name])), [types]);
  const mechName = useMemo(() => Object.fromEntries(mechanics.map((m) => [m.id, m.name])), [mechanics]);

  const filtered = useMemo(() => orders.filter((o) => {
    if (mechanicFilter !== "all" && o.mechanic_id !== mechanicFilter) return false;
    if (companyFilter !== "all" && o.company_id !== companyFilter) return false;
    if (!inRange(o.finished_at, range)) return false;
    return true;
  }), [orders, mechanicFilter, companyFilter, range]);

  const queue = filtered.filter((o) => o.points_status === "pendente");
  const audited = filtered.filter((o) => o.points_status === "aprovada" || o.points_status === "ajustada");

  const finalize = async (osId: string, items: OsServiceItem[]) => {
    setFinalizing(osId);
    const ok = await osItems.finalizeAudit(osId, items, user?.id);
    setFinalizing(null);
    if (ok) fetch();
  };

  const renderOs = (o: AuditOs, isQueue: boolean) => {
    const items = osItems.byOs[o.id] || [];
    const stInfo = POINTS_STATUS_INFO[o.points_status || "pendente"] || POINTS_STATUS_INFO.pendente;
    const open = expanded === o.id;
    return (
      <Card key={o.id}>
        <CardContent className="p-3 space-y-3">
          <button
            type="button"
            className="w-full flex items-center gap-3 flex-wrap text-left"
            onClick={() => setExpanded(open ? null : o.id)}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{o.plate} {o.model ? `· ${o.model}` : ""}</p>
              <p className="text-xs text-muted-foreground">
                {companyName[o.company_id || ""] || "—"} · {o.service_type_id ? typeName[o.service_type_id] || "—" : "Sem checklist"}
                {" · "}{o.mechanic_id ? mechName[o.mechanic_id] || "—" : "Sem mecânico"}
                {" · "}{o.finished_at ? new Date(o.finished_at).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{formatPoints(Number(o.points_requested || 0))} solicitados</span>
            <span className="text-sm font-bold text-emerald-600 tabular-nums">{formatPoints(Number(o.points_approved || 0))} aprovados</span>
            <Badge variant="secondary" className={cn("text-[10px]", stInfo.chip)}>{stInfo.label}</Badge>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {open && (
            <div className="space-y-3 pt-2 border-t">
              <OsAuditPanel
                items={items}
                readOnly={!isQueue}
                showFinalize={isQueue}
                finalizing={finalizing === o.id}
                onApprove={(item, approved) => osItems.setItemApproval(item, approved)}
                onAdjust={(item, pts) => osItems.setItemAuditPoints(item, pts)}
                onFinalize={() => finalize(o.id, items)}
              />
              <div>
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Camera className="h-3.5 w-3.5" /> Fotos da OS ({(photos[o.id] || []).length})
                </p>
                {(photos[o.id] || []).length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {(photos[o.id] || []).map((u, i) => (
                      <a key={i} href={u} data-fancybox="audit-fotos" data-caption={`OS ${o.plate}`}>
                        <img src={u} alt={`Foto ${i + 1} da OS ${o.plate}`} className="h-16 w-16 object-cover rounded-md border" loading="lazy" />
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
  };

  return (
    <div className="space-y-4">
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
        <DateRangeFilter value={range} onChange={setRange} />
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
            {queue.map((o) => renderOs(o, true))}
          </TabsContent>
          <TabsContent value="auditadas" className="space-y-3 mt-4">
            {audited.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhuma OS auditada no período.</p>
            )}
            {audited.map((o) => renderOs(o, false))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
