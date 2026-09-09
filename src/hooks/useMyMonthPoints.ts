import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Fonte única de verdade da pontuação mensal do técnico/desenvolvedor:
 * a mesma RPC `get_metas_tecnicos` usada na aba Metas e no card "Minhas Metas".
 * Evita cálculos paralelos (status, organização, fuso) que geravam divergência.
 */
export function useMyMonthPoints(year: number, month: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-month-points", user?.id, year, month],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_metas_tecnicos", {
        _year: year,
        _month: month,
      });
      if (error) throw error;
      const rows = ((data || []) as unknown) as Array<{
        user_id: string;
        total_points: number;
        total_closed: number;
      }>;
      const mine = rows.find((r) => r.user_id === user!.id);
      return {
        points: Math.round(Number(mine?.total_points || 0)),
        closed: Number(mine?.total_closed || 0),
      };
    },
  });
}
