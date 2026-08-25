import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CardMoveModule = "delivery" | "service_order" | "maintenance";

export interface CardMove {
  id: string;
  module: string;
  card_id: string;
  from_column: string | null;
  to_column: string;
  moved_by: string | null;
  created_at: string;
  moved_by_name?: string | null;
}

export function useCardMoves(module: CardMoveModule, cardId: string | null) {
  return useQuery({
    queryKey: ["op-card-moves", module, cardId],
    enabled: !!cardId,
    queryFn: async (): Promise<CardMove[]> => {
      const { data, error } = await supabase
        .from("op_card_moves")
        .select("*")
        .eq("module", module)
        .eq("card_id", cardId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as CardMove[];
      const ids = Array.from(new Set(rows.map((r) => r.moved_by).filter(Boolean))) as string[];
      if (!ids.length) return rows;
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
      return rows.map((r) => ({ ...r, moved_by_name: r.moved_by ? map.get(r.moved_by) || null : null }));
    },
  });
}
