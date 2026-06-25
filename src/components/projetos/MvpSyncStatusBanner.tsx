import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Track = "chamados" | "projetos";

const SCORE_TOL = 0.5; // pp
const MONEY_TOL = 1; // R$

interface Props {
  year: number;
  month: number;
  track: Track;
  rankingRows: any[];
  evolutionLastPoint?: { year: number; month: number; total_deliveries: number; total_value: number; avg_final: number } | null;
}

export default function MvpSyncStatusBanner({ year, month, track, rankingRows, evolutionLastPoint }: Props) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  const qc = useQueryClient();

  // Re-fetch the source of truth independently (the same RPC the other tabs use).
  const rpc = track === "chamados" ? "get_mvp_chamados_metrics" : "get_mvp_metrics";
  const sourceQ = useQuery({
    queryKey: ["mvp-sync-source", orgId, year, month, track],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(rpc, {
        _organization_id: orgId,
        _year: year,
        _month: month,
      });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const checks = useMemo(() => {
    if (sourceQ.isLoading || !sourceQ.data) return null;
    const source = sourceQ.data;
    const issues: string[] = [];

    // 1. user count
    if (source.length !== rankingRows.length) {
      issues.push(`Colaboradores: ranking ${rankingRows.length} ≠ trilha ${source.length}`);
    }

    // 2. deliveries / closed
    const field = track === "chamados" ? "total_closed" : "total_deliveries";
    const sumSrc = source.reduce((a: number, r: any) => a + (Number(r[field]) || 0), 0);
    const sumRank = rankingRows.reduce((a: number, r: any) => a + (Number(r[field]) || 0), 0);
    if (sumSrc !== sumRank) {
      issues.push(`${track === "chamados" ? "Fechados" : "Entregas"}: ranking ${sumRank} ≠ trilha ${sumSrc}`);
    }

    // 3. avg final score
    const avg = (arr: any[]) =>
      arr.length ? arr.reduce((a, r) => a + (Number(r.final_score) || 0), 0) / arr.length : 0;
    const avgSrc = avg(source);
    const avgRank = avg(rankingRows);
    if (Math.abs(avgSrc - avgRank) > SCORE_TOL) {
      issues.push(`Score final médio: ranking ${avgRank.toFixed(1)}% ≠ trilha ${avgSrc.toFixed(1)}%`);
    }

    // 4. sum R$ (projetos only)
    if (track === "projetos") {
      const moneySrc = source.reduce((a: number, r: any) => a + (Number(r.amount_brl) || 0), 0);
      const moneyRank = rankingRows.reduce((a: number, r: any) => a + (Number(r.amount_brl) || 0), 0);
      if (Math.abs(moneySrc - moneyRank) > MONEY_TOL) {
        issues.push(`Valor R$: ranking R$ ${moneyRank.toFixed(0)} ≠ trilha R$ ${moneySrc.toFixed(0)}`);
      }
    }

    // 5. evolution last point matches current month aggregates
    if (evolutionLastPoint && evolutionLastPoint.year === year && evolutionLastPoint.month === month) {
      if (Number(evolutionLastPoint.total_deliveries) !== sumSrc) {
        issues.push(
          `Evolução (mês atual): ${evolutionLastPoint.total_deliveries} ≠ trilha ${sumSrc}`
        );
      }
      if (track === "projetos") {
        const moneySrc = source.reduce((a: number, r: any) => a + (Number(r.amount_brl) || 0), 0);
        if (Math.abs(Number(evolutionLastPoint.total_value) - moneySrc) > MONEY_TOL) {
          issues.push(
            `Evolução R$ (mês atual): R$ ${Number(evolutionLastPoint.total_value).toFixed(0)} ≠ trilha R$ ${moneySrc.toFixed(0)}`
          );
        }
      }
      if (Math.abs(Number(evolutionLastPoint.avg_final) - avgSrc) > SCORE_TOL) {
        issues.push(
          `Evolução score (mês atual): ${Number(evolutionLastPoint.avg_final).toFixed(1)}% ≠ trilha ${avgSrc.toFixed(1)}%`
        );
      }
    }

    // 6. top 1 matches
    if (source.length && rankingRows.length) {
      const topSrc = [...source].sort((a, b) => Number(b.final_score) - Number(a.final_score))[0];
      const topRank = rankingRows[0];
      if (topSrc.user_id !== topRank.user_id) {
        issues.push(`Top 1: ranking "${topRank.full_name}" ≠ trilha "${topSrc.full_name}"`);
      }
    }

    return issues;
  }, [sourceQ.data, sourceQ.isLoading, rankingRows, evolutionLastPoint, year, month, track]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["mvp-sync-source"] });
    qc.invalidateQueries({ queryKey: ["mvp-chamados-metrics"] });
    qc.invalidateQueries({ queryKey: ["mvp-metrics"] });
    qc.invalidateQueries({ queryKey: ["mvp-evolution-v2"] });
  };

  if (sourceQ.isLoading || checks === null) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Verificando sincronização...</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          Comparando ranking com a trilha {track}.
        </AlertDescription>
      </Alert>
    );
  }

  const label = `${new Date(year, month - 1, 1).toLocaleString("pt-BR", { month: "long" })}/${year}`;

  if (checks.length === 0) {
    return (
      <Alert className="border-emerald-500/40 bg-emerald-500/5">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertTitle className="flex items-center gap-2">
          Sincronizado com {track === "chamados" ? "Chamados" : "Projetos"}
          <Badge variant="outline" className="text-xs">{label}</Badge>
        </AlertTitle>
        <AlertDescription className="text-xs">
          Ranking, evolução e agregados batem com a fonte da trilha.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-amber-500/50 bg-amber-500/5">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="flex items-center justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-2">
          Divergência detectada com {track === "chamados" ? "Chamados" : "Projetos"}
          <Badge variant="outline" className="text-xs">{label}</Badge>
        </span>
        <Button size="sm" variant="outline" onClick={refresh}>
          <RefreshCw className="h-3 w-3 mr-1" /> Recarregar dados
        </Button>
      </AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-5 text-xs space-y-0.5 mt-1">
          {checks.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
