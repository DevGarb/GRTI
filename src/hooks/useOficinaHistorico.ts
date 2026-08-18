import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ServiceOrder, ServiceOrderPart, ServiceOrderPhoto } from "@/hooks/useOficina";

export interface PlateHistory {
  plate: string;
  orders: ServiceOrder[];
  partsByOs: Record<string, ServiceOrderPart[]>;
  photosByOs: Record<string, ServiceOrderPhoto[]>;
}

export const normalizePlate = (v: string) => v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

export function useOficinaHistorico() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [partsByOs, setPartsByOs] = useState<Record<string, ServiceOrderPart[]>>({});
  const [photosByOs, setPhotosByOs] = useState<Record<string, ServiceOrderPhoto[]>>({});

  const search = useCallback(async (term: string, from: string, to: string) => {
    if (!profile?.organization_id) return;
    setLoading(true);
    let q = supabase
      .from("op_service_orders")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .not("vehicle_plate", "is", null)
      .order("opened_at", { ascending: false });

    const t = term.trim();
    if (t) q = q.ilike("vehicle_plate", `%${t.replace(/[^a-zA-Z0-9]/g, "")}%`);
    if (from) q = q.gte("opened_at", from);
    if (to) q = q.lte("opened_at", to);

    const { data } = await q;
    const rows = (data || []) as ServiceOrder[];
    setOrders(rows);

    const ids = rows.map((o) => o.id);
    if (ids.length) {
      const [{ data: parts }, { data: photos }] = await Promise.all([
        supabase.from("op_service_order_parts").select("*").in("service_order_id", ids),
        supabase.from("op_service_order_photos").select("*").in("service_order_id", ids),
      ]);
      const pm: Record<string, ServiceOrderPart[]> = {};
      (parts || []).forEach((p) => {
        const row = p as unknown as ServiceOrderPart;
        (pm[row.service_order_id] ||= []).push(row);
      });
      const fm: Record<string, ServiceOrderPhoto[]> = {};
      (photos || []).forEach((p) => {
        const row = p as unknown as ServiceOrderPhoto;
        (fm[row.service_order_id] ||= []).push(row);
      });
      setPartsByOs(pm);
      setPhotosByOs(fm);
    } else {
      setPartsByOs({});
      setPhotosByOs({});
    }
    setLoading(false);
  }, [profile?.organization_id]);

  /** Agrupa as OS por placa normalizada. */
  const groupByPlate = (rows: ServiceOrder[]): PlateHistory[] => {
    const m = new Map<string, ServiceOrder[]>();
    rows.forEach((o) => {
      const key = normalizePlate(o.vehicle_plate || "");
      if (!key) return;
      const arr = m.get(key) || [];
      arr.push(o);
      m.set(key, arr);
    });
    return Array.from(m.entries())
      .map(([plate, list]) => ({ plate, orders: list, partsByOs, photosByOs }))
      .sort((a, b) => (b.orders[0]?.opened_at || "").localeCompare(a.orders[0]?.opened_at || ""));
  };

  return { loading, orders, partsByOs, photosByOs, search, groupByPlate };
}
