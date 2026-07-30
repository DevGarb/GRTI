import { Link } from "react-router-dom";
import { ClipboardCheck, Building2, FileText, UserCheck, ListChecks, BarChart3, AlertTriangle, CheckCircle2, Clock, Layers, ChevronRight } from "lucide-react";
import { useChkExecutions, useChkTemplates, useChkCompanies, useChkAssignments } from "@/hooks/useChecklists";
import { useAuth } from "@/contexts/AuthContext";
import { ChkPageHeader, ChkKpiCard } from "@/components/checklists/ChkUI";

export default function ChkDashboard() {
  const { hasRole, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin || hasRole("admin");
  const { data: execs = [] } = useChkExecutions();
  const { data: templates = [] } = useChkTemplates();
  const { data: companies = [] } = useChkCompanies();
  const { data: assigns = [] } = useChkAssignments();

  const totals = {
    total: execs.length,
    concluidas: execs.filter((e) => e.status === "concluida").length,
    pendentes: execs.filter((e) => e.status === "pendente" || e.status === "em_andamento").length,
    atrasadas: execs.filter((e) => e.status === "atrasada").length,
  };
  const avgScore = (() => {
    const done = execs.filter((e) => e.status === "concluida" && e.score !== null);
    if (done.length === 0) return 0;
    return Math.round(done.reduce((s, e) => s + Number(e.score), 0) / done.length);
  })();

  const cards = isAdmin
    ? [
        { to: "/checklists/modelos", icon: FileText, label: "Modelos", count: templates.length },
        { to: "/checklists/empresas", icon: Building2, label: "Empresas", count: companies.length },
        { to: "/checklists/atribuicoes", icon: UserCheck, label: "Atribuições", count: assigns.length },
        { to: "/checklists/execucoes", icon: ListChecks, label: "Execuções", count: execs.length },
        { to: "/checklists/relatorios", icon: BarChart3, label: "Relatórios", count: null },
      ]
    : [{ to: "/checklists/minhas", icon: ClipboardCheck, label: "Minhas execuções", count: null }];

  return (
    <div className="space-y-6 sm:space-y-8">
      <ChkPageHeader
        icon={ClipboardCheck}
        title="Checklists Operacionais"
        subtitle={isAdmin ? "Painel do gestor" : "Suas execuções atribuídas"}
      />

      {isAdmin && (
        <section className="space-y-3">
          <p className="chk-eyebrow">Visão geral</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <ChkKpiCard label="Total" value={totals.total} icon={Layers} />
            <ChkKpiCard label="Concluídas" value={totals.concluidas} tone="ok" icon={CheckCircle2} />
            <ChkKpiCard label="Pendentes" value={totals.pendentes} tone="warn" icon={Clock} />
            <Link
              to="/checklists/execucoes?status=atrasada"
              className="card-elevated chk-card-interactive relative overflow-hidden p-4 sm:p-5 block"
            >
              <span className="absolute left-0 top-0 h-full w-[3px] bg-[hsl(var(--chk-danger))]" />
              <div className="flex items-start justify-between gap-2">
                <p className="chk-eyebrow">Atrasadas</p>
                <AlertTriangle className="h-4 w-4 shrink-0 text-[hsl(var(--chk-danger))]" />
              </div>
              <p className="mt-1.5 text-2xl sm:text-3xl font-bold tabular-nums text-[hsl(var(--chk-danger))]">
                {totals.atrasadas}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[hsl(var(--chk-text-dim))]">
                Ver a fila <ChevronRight className="h-3 w-3" />
              </p>
            </Link>
          </div>
        </section>
      )}

      {isAdmin && (
        <div className="card-elevated p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="chk-eyebrow">Score médio ponderado</p>
              <p className="mt-1 text-4xl font-bold tabular-nums text-[hsl(var(--chk-primary))]">{avgScore}%</p>
            </div>
            <p className="text-xs text-[hsl(var(--chk-text-dim))] text-right">
              Média das execuções concluídas
            </p>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-[hsl(var(--chk-surface-3))] overflow-hidden">
            <div
              className="h-full rounded-full bg-[hsl(var(--chk-primary))] transition-[width] duration-500"
              style={{ width: `${Math.min(Math.max(avgScore, 0), 100)}%` }}
            />
          </div>
        </div>
      )}

      <section className="space-y-3">
        <p className="chk-eyebrow">Acessos rápidos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="card-elevated chk-card-interactive group flex items-center gap-4 p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--chk-primary)/0.10)] text-[hsl(var(--chk-primary))] ring-1 ring-[hsl(var(--chk-primary)/0.16)]">
                <c.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">{c.label}</p>
                {c.count !== null && (
                  <p className="text-xs text-[hsl(var(--chk-text-dim))] mt-0.5">{c.count} itens</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--chk-text-dim))] transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
