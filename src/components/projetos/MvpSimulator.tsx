import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Trophy, Medal, AlertTriangle } from "lucide-react";
import { useMvpMetrics, MvpRow } from "@/hooks/useProjetosDashboard";

/**
 * Divisão de times (editável). Cada membro é casado com o técnico real
 * pelo primeiro nome dentro do full_name retornado por useMvpMetrics.
 */
const TEAMS = {
  hardware: { label: "Hardware", members: ["Izabele", "Felipe"] },
  software: { label: "Software", members: ["Victor", "Danilo"] },
} as const;

type TeamKey = keyof typeof TEAMS;

interface SimState {
  onTime: number;
  quality: number;
  rework: number;
  penalty: number;
}

const GOLD_AMOUNT = 500;
const SILVER_AMOUNT = 300;

function matchTech(rows: MvpRow[], member: string): MvpRow | undefined {
  const norm = (s: string) => s.trim().toLowerCase();
  return rows.find((r) => {
    const full = norm(r.full_name || "");
    return full === norm(member) || full.split(/\s+/).includes(norm(member)) || full.startsWith(norm(member));
  });
}

function computeAward(final: number) {
  if (final >= 100) return { level: "ouro" as const, amount: GOLD_AMOUNT };
  if (final >= 90) return { level: "prata" as const, amount: SILVER_AMOUNT };
  return { level: "none" as const, amount: 0 };
}

function SliderRow({
  label,
  value,
  onChange,
  step = 1,
  danger = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 flex items-center gap-4",
        danger ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/20"
      )}
    >
      <span className={cn("text-sm w-56 shrink-0", danger ? "text-destructive font-medium" : "text-foreground")}>
        {label}
      </span>
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        className="flex-1"
      />
      <span className="text-sm font-bold w-12 text-right tabular-nums">{value}%</span>
    </div>
  );
}

export default function MvpSimulator({ year, month }: { year: number; month: number }) {
  const { data: rows = [], isLoading } = useMvpMetrics(year, month);
  const [team, setTeam] = useState<TeamKey>("hardware");
  const [member, setMember] = useState<string>(TEAMS.hardware.members[0]);
  const [sim, setSim] = useState<SimState>({ onTime: 0, quality: 0, rework: 0, penalty: 0 });

  const realTech = useMemo(() => matchTech(rows, member), [rows, member]);

  // Carrega os dados reais do técnico nos sliders sempre que mudar o técnico/dados.
  useEffect(() => {
    setSim({
      onTime: Math.round(realTech?.on_time_rate ?? 0),
      quality: Math.round(realTech?.quality_rate ?? 0),
      rework: Math.round(realTech?.rework_rate ?? 0),
      penalty: 0,
    });
  }, [realTech?.user_id, realTech?.on_time_rate, realTech?.quality_rate, realTech?.rework_rate]);

  const bruta = (sim.onTime / 100) * (sim.quality / 100) * (1 - sim.rework / 100) * 100;
  const final = bruta * (1 - sim.penalty / 100);
  const award = computeAward(final);

  const selectTeam = (t: TeamKey) => {
    setTeam(t);
    setMember(TEAMS[t].members[0]);
  };

  return (
    <div className="space-y-4">
      {/* Seleção de time */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TEAMS) as TeamKey[]).map((t) => (
          <button
            key={t}
            onClick={() => selectTeam(t)}
            className={cn(
              "px-4 py-1.5 rounded-md border text-sm transition-colors",
              team === t
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {TEAMS[t].label}
          </button>
        ))}
      </div>

      {/* Seleção de técnico dentro do time */}
      <div className="flex flex-wrap gap-2">
        {TEAMS[team].members.map((m) => {
          const has = !!matchTech(rows, m);
          return (
            <button
              key={m}
              onClick={() => setMember(m)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-xs transition-colors",
                member === m
                  ? "border-primary bg-primary text-primary-foreground font-medium"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title={has ? "Dados reais carregados" : "Sem dados no período"}
            >
              {m}
              {!has && <span className="ml-1 opacity-60">·sem dados</span>}
            </button>
          );
        })}
      </div>

      <h2 className="text-lg font-bold">
        Simulador — Time de {TEAMS[team].label} · {realTech?.full_name ?? member}
      </h2>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando dados do período…</p>}

      <div className="space-y-3">
        <SliderRow
          label="Entregas no prazo ÷ Planejadas (%)"
          value={sim.onTime}
          onChange={(v) => setSim((s) => ({ ...s, onTime: v }))}
        />
        <SliderRow
          label="Qualidade técnica (checklist 5 itens)"
          value={sim.quality}
          step={20}
          onChange={(v) => setSim((s) => ({ ...s, quality: v }))}
        />
        <SliderRow
          label="Retrabalho (%)"
          value={sim.rework}
          onChange={(v) => setSim((s) => ({ ...s, rework: v }))}
        />
        <SliderRow
          label="Penalidade conduta/pontual. (%)"
          value={sim.penalty}
          danger
          onChange={(v) => setSim((s) => ({ ...s, penalty: v }))}
        />
      </div>

      {/* Cálculo */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold mb-1">Cálculo passo a passo</p>
            <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
{`bruta = ${sim.onTime}% × ${sim.quality}% × (1 − ${sim.rework}%) = ${bruta.toFixed(1)}%
final = ${bruta.toFixed(1)}% × (1 − ${sim.penalty}%) = ${final.toFixed(1)}%`}
            </pre>
          </div>

          <div className="border-t border-border pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Eficiência bruta</p>
              <p className="text-2xl font-bold text-amber-500">{bruta.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Eficiência final</p>
              <p className="text-2xl font-bold text-amber-500">{final.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Premiação</p>
              {award.level === "ouro" ? (
                <Badge className="bg-amber-500/20 text-amber-700 gap-1"><Trophy className="h-3 w-3" /> Ouro</Badge>
              ) : award.level === "prata" ? (
                <Badge className="bg-slate-400/20 text-slate-700 gap-1"><Medal className="h-3 w-3" /> Prata</Badge>
              ) : (
                <Badge variant="outline">Fora da premiação</Badge>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-2xl font-bold text-amber-500">R$ {award.amount}</p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  award.level === "ouro"
                    ? "bg-amber-500"
                    : award.level === "prata"
                      ? "bg-orange-400"
                      : "bg-muted-foreground/40"
                )}
                style={{ width: `${Math.min(100, Math.max(0, final))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>0%</span>
              <span>Prata ≥ 90%</span>
              <span>Ouro = 100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
        Nota: Qualidade técnica só varia em múltiplos de 20% (cada item do checklist vale 20 pontos).
        Certifique que os 5 critérios estão claros para o colaborador. Os sliders vêm preenchidos com os
        dados reais do mês; ajuste-os para simular cenários (não altera os dados oficiais).
      </p>
    </div>
  );
}
