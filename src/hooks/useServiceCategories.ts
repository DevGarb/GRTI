import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceCategoryLeaf {
  id: string;
  name: string;
  path: string;
  score: number;
}

interface RawCategory {
  id: string;
  name: string;
  parent_id: string | null;
  score: number | null;
  is_active: boolean;
}

/** Folhas ativas com pontuação (score não nulo) da organização, com caminho completo (Grupo → Subgrupo → Folha). */
export function useServiceCategoryLeaves(orgId?: string | null) {
  return useQuery({
    queryKey: ["service-category-leaves", orgId ?? null],
    queryFn: async () => {
      let q = supabase.from("categories").select("id, name, parent_id, score, is_active");
      if (orgId) q = q.or(`organization_id.eq.${orgId},organization_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      const all = (data || []) as RawCategory[];
      const byId = new Map(all.map((c) => [c.id, c]));
      const pathOf = (c: RawCategory): string => {
        const parts = [c.name];
        let cur = c;
        while (cur.parent_id) {
          const p = byId.get(cur.parent_id);
          if (!p) break;
          parts.unshift(p.name);
          cur = p;
        }
        return parts.join(" → ");
      };
      // Só folhas de verdade: alguns nós intermediários têm score preenchido por engano
      // no cadastro mesmo tendo filhos reais — exclui quem aparece como parent_id de outro.
      const parentIds = new Set(all.map((c) => c.parent_id).filter(Boolean));
      return all
        .filter((c) => c.is_active && c.score != null && !parentIds.has(c.id))
        .map((c): ServiceCategoryLeaf => ({ id: c.id, name: c.name, path: pathOf(c), score: c.score! }))
        .sort((a, b) => a.score - b.score || a.path.localeCompare(b.path));
    },
    enabled: true,
  });
}
