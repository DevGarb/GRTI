import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MySector {
  id: string;
  name: string;
}

export function useMySector() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-sector", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MySector | null> => {
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("sector_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const sectorId = (prof as any)?.sector_id as string | null | undefined;
      if (!sectorId) return null;
      const { data: sector, error: secErr } = await supabase
        .from("sectors")
        .select("id, name")
        .eq("id", sectorId)
        .maybeSingle();
      if (secErr) throw secErr;
      return sector ? { id: sector.id, name: sector.name } : null;
    },
  });
}
