import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Preventiva {
  id: string;
  equipment_type: string;
  asset_tag: string;
  execution_date: string;
  checklist: Record<string, boolean>;
  notes: string | null;
  created_by: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  sector: string | null;
  responsible: string | null;
  creatorName?: string;
}

export function usePreventivas(month?: number, year?: number, equipmentType?: string) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["preventivas", month, year, equipmentType, orgId],
    queryFn: async () => {
      let query = supabase
        .from("preventive_maintenance")
        .select("*")
        .order("execution_date", { ascending: false });
      if (orgId) {
        query = query.eq("organization_id", orgId);
      }

      if (month !== undefined && year !== undefined) {
        const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const endMonth = month + 1 > 11 ? 0 : month + 1;
        const endYear = month + 1 > 11 ? year + 1 : year;
        const endDate = `${endYear}-${String(endMonth + 1).padStart(2, "0")}-01`;
        query = query.gte("execution_date", startDate).lt("execution_date", endDate);
      }

      if (equipmentType && equipmentType !== "Todos Tipos") {
        query = query.eq("equipment_type", equipmentType);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch creator names
      const userIds = [...new Set(data.map((d) => d.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

      return data.map((d) => ({
        ...d,
        checklist: (d.checklist as Record<string, boolean>) || {},
        creatorName: profileMap.get(d.created_by) || "",
      })) as Preventiva[];
    },
  });
}

interface CreatePreventivaInput {
  equipment_type: string;
  asset_tag: string;
  execution_date: string;
  checklist: Record<string, boolean>;
  notes?: string;
  sector?: string;
  responsible?: string;
}

export function useCreatePreventiva() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePreventivaInput) => {
      const { data, error } = await supabase
        .from("preventive_maintenance")
        .insert({
          ...input,
          created_by: user!.id,
          organization_id: profile?.organization_id || null,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preventivas"] });
      toast.success("Preventiva registrada com sucesso!");
    },
    onError: (e: Error) => {
      toast.error("Erro ao registrar: " + e.message);
    },
  });
}

export interface MaintenanceInterval {
  id: string;
  equipment_type: string;
  interval_days: number;
}

export function useMaintenanceIntervals() {
  return useQuery({
    queryKey: ["maintenance-intervals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_intervals")
        .select("*")
        .order("equipment_type");
      if (error) throw error;
      return data as MaintenanceInterval[];
    },
  });
}

export function useUpdateInterval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, interval_days }: { id: string; interval_days: number }) => {
      const { error } = await supabase
        .from("maintenance_intervals")
        .update({ interval_days })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-intervals"] });
      queryClient.invalidateQueries({ queryKey: ["overdue-equipment"] });
      toast.success("Intervalo atualizado!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export interface OverdueEquipment {
  asset_tag: string;
  equipment_type: string;
  last_date: string;
  days_since: number;
  interval_days: number;
  technician: string;
}

export function useOverdueEquipment() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["overdue-equipment", orgId],
    queryFn: async () => {
      // Fetch intervals
      const { data: intervals } = await supabase
        .from("maintenance_intervals")
        .select("equipment_type, interval_days");
      const intervalMap = new Map((intervals || []).map((i) => [i.equipment_type, i.interval_days]));

      let pmQuery = supabase
        .from("preventive_maintenance")
        .select("*")
        .order("execution_date", { ascending: false });
      if (orgId) {
        pmQuery = pmQuery.eq("organization_id", orgId);
      }
      const { data, error } = await pmQuery;
      if (error) throw error;

      const latestByAsset = new Map<string, typeof data[0]>();
      data.forEach((d) => {
        if (!latestByAsset.has(d.asset_tag)) latestByAsset.set(d.asset_tag, d);
      });

      const now = new Date();
      const overdue: OverdueEquipment[] = [];

      const userIds = [...new Set([...latestByAsset.values()].map((d) => d.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

      latestByAsset.forEach((record) => {
        const daysSince = Math.floor(
          (now.getTime() - new Date(record.execution_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        const threshold = intervalMap.get(record.equipment_type) ?? 90;
        if (daysSince >= threshold) {
          overdue.push({
            asset_tag: record.asset_tag,
            equipment_type: record.equipment_type,
            last_date: record.execution_date,
            days_since: daysSince,
            interval_days: threshold,
            technician: profileMap.get(record.created_by) || "",
          });
        }
      });

      return overdue.sort((a, b) => b.days_since - a.days_since);
    },
  });
}
