import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  isDuplicateLabel, requestedPoints, approvedPoints,
  type OsServiceItem, type AwardTier,
} from "@/lib/oficinaScoring";

export interface ServiceType {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  active: boolean;
  maxPoints?: number; // soma dos pontos dos itens ativos (calculado no cliente)
}

export interface ServiceTypeItem {
  id: string;
  service_type_id: string;
  label: string;
  points: number;
  position: number;
  is_required: boolean;
  active: boolean;
}

export interface ExtraService {
  id: string;
  organization_id: string;
  name: string;
  points: number;
  active: boolean;
}

/* ================= Tipos de serviço (checklists) ================= */

export function useServiceTypes() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [items, setItems] = useState<ServiceTypeItem[]>([]);
  const [links, setLinks] = useState<{ service_type_id: string; company_id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [{ data: t }, { data: i }, { data: l }] = await Promise.all([
      supabase.from("op_service_types").select("*").eq("organization_id", orgId).order("name"),
      supabase.from("op_service_type_items").select("*").order("position"),
      supabase.from("op_service_type_companies").select("service_type_id, company_id"),
    ]);
    setTypes((t || []) as ServiceType[]);
    setItems((i || []) as ServiceTypeItem[]);
    setLinks((l || []) as { service_type_id: string; company_id: string }[]);
    setLoading(false);
  }, [orgId]);
  useEffect(() => { fetch(); }, [fetch]);

  const itemsByType = useMemo(() => {
    const m: Record<string, ServiceTypeItem[]> = {};
    items.forEach((i) => { (m[i.service_type_id] ||= []).push(i); });
    return m;
  }, [items]);

  const companyIdsByType = useMemo(() => {
    const m: Record<string, string[]> = {};
    links.forEach((l) => { (m[l.service_type_id] ||= []).push(l.company_id); });
    return m;
  }, [links]);

  /** Tipos ativos vinculados a uma empresa (Passo 2 da abertura da OS). */
  const typesForCompany = useCallback(
    (companyId?: string | null) =>
      types.filter((t) => t.active && (!companyId || (companyIdsByType[t.id] || []).includes(companyId))),
    [types, companyIdsByType],
  );

  const maxPointsOf = useCallback(
    (typeId: string) =>
      (itemsByType[typeId] || []).filter((i) => i.active).reduce((s, i) => s + Number(i.points || 0), 0),
    [itemsByType],
  );

  const addType = async (name: string, description: string, companyIds: string[]) => {
    if (!orgId || !name.trim()) return;
    const { data, error } = await supabase
      .from("op_service_types")
      .insert({ organization_id: orgId, name: name.trim(), description: description.trim() || null })
      .select().single();
    if (error) return toast.error(error.message);
    if (companyIds.length) {
      await supabase.from("op_service_type_companies")
        .insert(companyIds.map((company_id) => ({ service_type_id: data.id, company_id })));
    }
    toast.success("Checklist criado");
    fetch();
  };

  const updateType = async (id: string, patch: Partial<ServiceType>) => {
    const { error } = await supabase.from("op_service_types").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  const setTypeCompanies = async (typeId: string, companyIds: string[]) => {
    const { error } = await supabase.from("op_service_type_companies").delete().eq("service_type_id", typeId);
    if (error) return toast.error(error.message);
    if (companyIds.length) {
      const { error: insErr } = await supabase.from("op_service_type_companies")
        .insert(companyIds.map((company_id) => ({ service_type_id: typeId, company_id })));
      if (insErr) return toast.error(insErr.message);
    }
    fetch();
  };

  const addItem = async (typeId: string, input: { label: string; points: number; is_required?: boolean }) => {
    if (!input.label.trim()) return;
    const position = (itemsByType[typeId]?.slice(-1)[0]?.position ?? 0) + 1;
    const { error } = await supabase.from("op_service_type_items").insert({
      service_type_id: typeId, label: input.label.trim(),
      points: input.points || 0, position, is_required: !!input.is_required,
    });
    if (error) toast.error(error.message); else fetch();
  };

  const updateItem = async (id: string, patch: Partial<ServiceTypeItem>) => {
    const { error } = await supabase.from("op_service_type_items").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("op_service_type_items").delete().eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  return {
    types, itemsByType, companyIdsByType, loading, typesForCompany, maxPointsOf,
    addType, updateType, setTypeCompanies, addItem, updateItem, removeItem, refetch: fetch,
  };
}

/* ================= Serviços adicionais (biblioteca) ================= */

export function useExtraServices() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [extras, setExtras] = useState<ExtraService[]>([]);
  const [links, setLinks] = useState<{ extra_service_id: string; company_id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [{ data: e }, { data: l }] = await Promise.all([
      supabase.from("op_extra_services").select("*").eq("organization_id", orgId).order("name"),
      supabase.from("op_extra_service_companies").select("extra_service_id, company_id"),
    ]);
    setExtras((e || []) as ExtraService[]);
    setLinks((l || []) as { extra_service_id: string; company_id: string }[]);
    setLoading(false);
  }, [orgId]);
  useEffect(() => { fetch(); }, [fetch]);

  const companyIdsByExtra = useMemo(() => {
    const m: Record<string, string[]> = {};
    links.forEach((l) => { (m[l.extra_service_id] ||= []).push(l.company_id); });
    return m;
  }, [links]);

  /** Adicionais ativos disponíveis para a empresa da OS. */
  const extrasForCompany = useCallback(
    (companyId?: string | null) =>
      extras.filter((e) => e.active && (!companyId || (companyIdsByExtra[e.id] || []).includes(companyId))),
    [extras, companyIdsByExtra],
  );

  const addExtra = async (name: string, points: number, companyIds: string[]) => {
    if (!orgId || !name.trim()) return;
    const { data, error } = await supabase
      .from("op_extra_services")
      .insert({ organization_id: orgId, name: name.trim(), points: points || 0 })
      .select().single();
    if (error) return toast.error(error.message);
    if (companyIds.length) {
      await supabase.from("op_extra_service_companies")
        .insert(companyIds.map((company_id) => ({ extra_service_id: data.id, company_id })));
    }
    toast.success("Serviço adicional criado");
    fetch();
  };

  const updateExtra = async (id: string, patch: Partial<ExtraService>) => {
    const { error } = await supabase.from("op_extra_services").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  const removeExtra = async (id: string) => {
    const { error } = await supabase.from("op_extra_services").delete().eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  const setExtraCompanies = async (extraId: string, companyIds: string[]) => {
    const { error } = await supabase.from("op_extra_service_companies").delete().eq("extra_service_id", extraId);
    if (error) return toast.error(error.message);
    if (companyIds.length) {
      const { error: insErr } = await supabase.from("op_extra_service_companies")
        .insert(companyIds.map((company_id) => ({ extra_service_id: extraId, company_id })));
      if (insErr) return toast.error(insErr.message);
    }
    fetch();
  };

  return { extras, companyIdsByExtra, loading, extrasForCompany, addExtra, updateExtra, removeExtra, setExtraCompanies, refetch: fetch };
}

/* ================= Faixas de premiação ================= */

export function useAwardTiers() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [tiers, setTiers] = useState<AwardTier[]>([]);

  const fetch = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase.from("op_award_tiers").select("*").eq("organization_id", orgId).order("position");
    setTiers((data || []) as AwardTier[]);
  }, [orgId]);
  useEffect(() => { fetch(); }, [fetch]);

  const addTier = async (input: { label: string; from_points: number; to_points: number | null; rate_brl: number }) => {
    if (!orgId) return;
    const position = (tiers.slice(-1)[0]?.position ?? 0) + 1;
    const { error } = await supabase.from("op_award_tiers").insert({ organization_id: orgId, ...input, position } as any);
    if (error) toast.error(error.message); else fetch();
  };

  const updateTier = async (id: string, patch: Partial<AwardTier>) => {
    const { error } = await supabase.from("op_award_tiers").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  const removeTier = async (id: string) => {
    const { error } = await supabase.from("op_award_tiers").delete().eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  return { tiers, addTier, updateTier, removeTier, refetch: fetch };
}

/* ================= Itens pontuados das OS ================= */

export function useOsServiceItems() {
  const { profile, user } = useAuth();
  const orgId = profile?.organization_id;
  const [byOs, setByOs] = useState<Record<string, OsServiceItem[]>>({});

  const fetch = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("op_os_service_items")
      .select("*")
      .eq("organization_id", orgId)
      .order("position")
      .order("created_at");
    const map: Record<string, OsServiceItem[]> = {};
    ((data || []) as OsServiceItem[]).forEach((r) => { (map[r.service_order_id] ||= []).push(r); });
    setByOs(map);
  }, [orgId]);
  useEffect(() => { fetch(); }, [fetch]);

  const toggle = async (item: OsServiceItem, done?: boolean) => {
    const next = done ?? !item.done;
    const { error } = await supabase.from("op_os_service_items").update({
      done: next,
      done_at: next ? new Date().toISOString() : null,
      done_by: next ? user?.id || null : null,
    }).eq("id", item.id);
    if (error) toast.error(error.message); else fetch();
  };

  /** Adiciona serviço extra da biblioteca, bloqueando duplicidade com o checklist. */
  const addExtraItem = async (os: { id: string; organization_id: string }, extra: ExtraService) => {
    const current = byOs[os.id] || [];
    if (isDuplicateLabel(current, extra.name)) {
      toast.error("Este serviço já está incluído no checklist desta OS.");
      return false;
    }
    const position = (current.slice(-1)[0]?.position ?? 0) + 1;
    const { error } = await supabase.from("op_os_service_items").insert({
      organization_id: os.organization_id,
      service_order_id: os.id,
      item_type: "adicional",
      label: extra.name,
      points: extra.points,
      done: true,
      done_at: new Date().toISOString(),
      done_by: user?.id || null,
      position,
    });
    if (error) { toast.error(error.message); return false; }
    toast.success(`Adicional incluído: ${extra.name} (+${extra.points})`);
    fetch();
    return true;
  };

  /** "Serviço não cadastrado": entra sem pontos, pendente de avaliação do admin. */
  const addCustomItem = async (os: { id: string; organization_id: string }, label: string) => {
    if (!label.trim()) return false;
    const current = byOs[os.id] || [];
    if (isDuplicateLabel(current, label)) {
      toast.error("Este serviço já está incluído no checklist desta OS.");
      return false;
    }
    const position = (current.slice(-1)[0]?.position ?? 0) + 1;
    const { error } = await supabase.from("op_os_service_items").insert({
      organization_id: os.organization_id,
      service_order_id: os.id,
      item_type: "nao_cadastrado",
      label: label.trim(),
      points: 0,
      done: true,
      done_at: new Date().toISOString(),
      done_by: user?.id || null,
      position,
    });
    if (error) { toast.error(error.message); return false; }
    toast.success("Serviço registrado — ficará pendente de avaliação de pontos");
    fetch();
    return true;
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("op_os_service_items").delete().eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  /** Semeia o checklist pontuado de um tipo em uma OS sem itens (mudança manual de tipo). */
  const seedFromType = async (os: { id: string; organization_id: string }, typeId: string) => {
    if ((byOs[os.id] || []).length > 0) return;
    const { data: tItems } = await supabase
      .from("op_service_type_items").select("*")
      .eq("service_type_id", typeId).eq("active", true).order("position");
    if (!tItems?.length) return;
    const rows = (tItems as ServiceTypeItem[]).map((t, i) => ({
      organization_id: os.organization_id,
      service_order_id: os.id,
      item_type: "checklist",
      label: t.label,
      points: t.points,
      position: i + 1,
    }));
    const { error } = await supabase.from("op_os_service_items").insert(rows);
    if (error) toast.error(error.message); else fetch();
  };

  /* ---------- Auditoria ---------- */

  const setItemApproval = async (item: OsServiceItem, approved: boolean, pointsApproved?: number) => {
    const { error } = await supabase.from("op_os_service_items").update({
      approved,
      points_approved: approved ? (pointsApproved ?? item.points ?? 0) : 0,
    }).eq("id", item.id);
    if (error) toast.error(error.message); else fetch();
  };

  const setItemAuditPoints = async (item: OsServiceItem, points: number, note?: string) => {
    const { error } = await supabase.from("op_os_service_items").update({
      points_approved: points,
      audit_note: note ?? item.audit_note,
    }).eq("id", item.id);
    if (error) toast.error(error.message); else fetch();
  };

  /**
   * Consolida a auditoria da OS: aprova os itens marcados (mantendo rejeições/ajustes
   * já feitos) e grava pontos solicitados × aprovados + situação na OS.
   */
  const finalizeAudit = async (osId: string, items: OsServiceItem[], auditorId?: string | null) => {
    const done = items.filter((i) => i.done);
    for (const item of done) {
      if (item.approved === null || item.approved === undefined) {
        await supabase.from("op_os_service_items").update({
          approved: true,
          points_approved: item.points_approved ?? item.points ?? 0,
        }).eq("id", item.id);
      }
    }
    await fetch();
    const fresh = (await supabase.from("op_os_service_items").select("*").eq("service_order_id", osId)).data as OsServiceItem[] || [];
    const requested = requestedPoints(fresh);
    const approved = approvedPoints(fresh);
    const anyRejected = fresh.some((i) => i.done && i.approved === false);
    const anyAdjusted = fresh.some((i) => i.approved === true && Number(i.points_approved ?? i.points) !== Number(i.points));
    const status = !anyRejected && !anyAdjusted && approved === requested ? "aprovada" : "ajustada";
    const { error } = await supabase.from("op_service_orders").update({
      points_requested: requested,
      points_approved: approved,
      points_status: status,
      points_audited_by: auditorId || null,
      points_audited_at: new Date().toISOString(),
    } as any).eq("id", osId);
    if (error) toast.error(error.message);
    else toast.success(status === "aprovada" ? "Pontuação aprovada" : "Pontuação aprovada com ajustes");
    await fetch();
    return !error;
  };

  return { byOs, toggle, addExtraItem, addCustomItem, removeItem, seedFromType, setItemApproval, setItemAuditPoints, finalizeAudit, refetch: fetch };
}
