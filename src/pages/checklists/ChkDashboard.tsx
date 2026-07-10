import { Link } from "react-router-dom";
import { ClipboardCheck, Building2, FileText, UserCheck, ListChecks, BarChart3 } from "lucide-react";
import { useChkExecutions, useChkTemplates, useChkCompanies } from "@/hooks/useChecklists";
import { useAuth } from "@/contexts/AuthContext";

export default function ChkDashboard() {
  const { hasRole, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin || hasRole("admin");
  const { data: execs = [] } = useChkExecutions();
  const { data: templates = [] } = useChkTemplates();
  const { data: companies = [] } = useChkCompanies();

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
        { to: "/checklists/atribuicoes", icon: UserCheck, label: "Atribuições", count: 0 },
        { to: "/checklists/execucoes", icon: ListChecks, label: "Execuções", count: execs.length },
        { to: "/checklists/relatorios", icon: BarChart3, label: "Relatórios", count: null },
      ]
    : [{ to: "/checklists/minhas", icon: ClipboardCheck, label: "Minhas execuções", count: null }];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Checklists Operacionais</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Painel do gestor" : "Suas execuções atribuídas"}
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label="Total" value={totals.total} />
          <KPI label="Concluídas" value={totals.concluidas} tone="success" />
          <KPI label="Pendentes" value={totals.pendentes} tone="warning" />
          <KPI label="Atrasadas" value={totals.atrasadas} tone="danger" />
        </div>
      )}

      {isAdmin && (
        <div className="card-elevated p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Score médio ponderado</p>
          <p className="text-3xl font-bold text-primary">{avgScore}%</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="card-elevated p-5 hover:border-primary hover:shadow-md transition-all">
            <c.icon className="h-6 w-6 text-primary mb-2" />
            <p className="font-semibold text-foreground">{c.label}</p>
            {c.count !== null && <p className="text-xs text-muted-foreground mt-1">{c.count} itens</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

function KPI({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "warning" | "danger" }) {
  const color = { default: "text-foreground", success: "text-emerald-600", warning: "text-amber-600", danger: "text-red-600" }[tone];
  return (
    <div className="card-elevated p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
    </div>
  );
}
