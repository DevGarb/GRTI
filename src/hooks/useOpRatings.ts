import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type OpRatingKind = "delivery" | "maintenance";

export interface OpRating {
  id: string;
  organization_id: string;
  rating: number;
  comment: string | null;
  rated_by_type: "solicitante" | "admin" | "tecnico" | "motorista";
  rated_by_name: string | null;
  rated_by_user: string | null;
  created_at: string;
  // one of these will be set depending on kind:
  delivery_id?: string;
  maintenance_order_id?: string;
}

const TABLE: Record<OpRatingKind, string> = {
  delivery: "op_delivery_ratings",
  maintenance: "op_maintenance_ratings",
};
const FK: Record<OpRatingKind, string> = {
  delivery: "delivery_id",
  maintenance: "maintenance_order_id",
};

/** Fetch all ratings of a given kind for the org. */
export function useOpRatings(kind: OpRatingKind) {
  const { profile } = useAuth();
  const [items, setItems] = useState<OpRating[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from(TABLE[kind])
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setItems((data || []) as OpRating[]);
    setLoading(false);
  }, [profile?.organization_id, kind]);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, refetch: fetch };
}

/**
 * Submit a new rating.
 * targetId = delivery_id or maintenance_order_id depending on kind
 */
export async function submitOpRating(params: {
  kind: OpRatingKind;
  organization_id: string;
  targetId: string;
  rating: number;
  comment?: string;
  rated_by_type: "solicitante" | "admin" | "tecnico" | "motorista";
  rated_by_name?: string;
  rated_by_user?: string | null;
}) {
  const { kind, organization_id, targetId, rating, comment, rated_by_type, rated_by_name, rated_by_user } = params;
  const payload: any = {
    organization_id,
    rating,
    comment: comment?.trim() || null,
    rated_by_type,
    rated_by_name: rated_by_name || null,
    rated_by_user: rated_by_user || null,
    [FK[kind]]: targetId,
  };
  const { error } = await (supabase as any).from(TABLE[kind]).insert(payload);
  if (error) {
    if ((error as any).code === "23505") {
      toast.error("Esta demanda já foi avaliada.");
    } else {
      toast.error(error.message);
    }
    return false;
  }
  toast.success("Avaliação registrada. Obrigado!");
  return true;
}

/** Get IDs already rated for the org, per kind (helper for pending-check). */
export async function fetchRatedIds(kind: OpRatingKind, organization_id: string): Promise<Set<string>> {
  const { data } = await (supabase as any)
    .from(TABLE[kind])
    .select(FK[kind])
    .eq("organization_id", organization_id);
  return new Set((data || []).map((r: any) => r[FK[kind]]));
}
