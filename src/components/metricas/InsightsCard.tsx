import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, AlertTriangle, Trophy } from "lucide-react";

interface Props {
  insights: string[];
  highlights: string[];
  risks: string[];
  loading?: boolean;
  onRegenerate?: () => void;
}

export function InsightsCard({ insights, highlights, risks, loading, onRegenerate }: Props) {
  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Insights Gerenciais
        </CardTitle>
        {onRegenerate && (
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Regerar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Analisando dados…</p>}

        {!loading && insights.length === 0 && highlights.length === 0 && risks.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem insights para o período.</p>
        )}

        {highlights.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-[hsl(var(--status-closed))]">
              <Trophy className="h-4 w-4" /> Destaques
            </div>
            <ul className="space-y-1.5 text-sm">
              {highlights.map((h, i) => <li key={i} className="flex gap-2"><span>•</span><span>{h}</span></li>)}
            </ul>
          </div>
        )}

        {risks.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-[hsl(var(--status-open))]">
              <AlertTriangle className="h-4 w-4" /> Pontos de atenção
            </div>
            <ul className="space-y-1.5 text-sm">
              {risks.map((r, i) => <li key={i} className="flex gap-2"><span>•</span><span>{r}</span></li>)}
            </ul>
          </div>
        )}

        {insights.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> Análise IA
            </div>
            <ul className="space-y-1.5 text-sm">
              {insights.map((i, idx) => <li key={idx} className="flex gap-2"><span>•</span><span>{i}</span></li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
