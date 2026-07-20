import { Link } from "react-router-dom";
import {
  HelpCircle,
  FileText,
  Building2,
  UserCheck,
  ClipboardCheck,
  Camera,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface Step {
  n: number;
  icon: any;
  title: string;
  desc: string;
  role: "Admin" | "Colaborador";
  cta?: { to: string; label: string };
}

const steps: Step[] = [
  {
    n: 1,
    icon: Building2,
    title: "Cadastre empresas e setores",
    desc: "Registre as empresas parceiras e os setores da sua organização. Eles servem para agrupar checklists e filtrar relatórios.",
    role: "Admin",
    cta: { to: "/checklists/empresas", label: "Ir para Empresas" },
  },
  {
    n: 2,
    icon: FileText,
    title: "Crie um modelo de checklist",
    desc: "Monte o modelo com os itens que precisam ser verificados. Cada item pode ter peso e permitir foto ou observação.",
    role: "Admin",
    cta: { to: "/checklists/modelos", label: "Criar modelo" },
  },
  {
    n: 3,
    icon: UserCheck,
    title: "Atribua o checklist a um colaborador",
    desc: "Escolha o modelo, a empresa/setor, o responsável e a frequência (diária, semanal, mensal). Também é possível atribuir em massa.",
    role: "Admin",
    cta: { to: "/checklists/atribuicoes", label: "Nova atribuição" },
  },
  {
    n: 4,
    icon: ClipboardCheck,
    title: "Colaborador executa em 'Meus Checklists'",
    desc: "A execução aparece automaticamente na fila do colaborador conforme a frequência definida, ordenada pelas mais urgentes.",
    role: "Colaborador",
    cta: { to: "/checklists/minhas", label: "Meus Checklists" },
  },
  {
    n: 5,
    icon: Camera,
    title: "Responda item por item",
    desc: "Marque cada item como feito, adicione observação quando necessário e anexe foto se for obrigatória. Se o item não se aplicar, marque N/A. O progresso é salvo em tempo real.",
    role: "Colaborador",
  },
  {
    n: 6,
    icon: BarChart3,
    title: "Acompanhe resultados",
    desc: "Ao concluir, o score ponderado é calculado automaticamente. O gestor visualiza execuções, atrasos e relatórios consolidados.",
    role: "Admin",
    cta: { to: "/checklists/relatorios", label: "Ver relatórios" },
  },
];

export default function ChkComoFunciona() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <HelpCircle className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Como funciona o Checklist</h1>
          <p className="text-sm text-muted-foreground">
            Passo a passo do fluxo, do cadastro à execução e ao relatório.
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-4 bottom-4 w-px bg-border hidden sm:block" />
        <ol className="space-y-4">
          {steps.map((s) => (
            <li key={s.n} className="relative">
              <div className="card-elevated p-5 sm:pl-16">
                <div className="hidden sm:flex absolute left-2 top-5 h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow">
                  {s.n}
                </div>
                <div className="flex items-start gap-3">
                  <div className="sm:hidden flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    {s.n}
                  </div>
                  <s.icon className="h-6 w-6 text-primary shrink-0 hidden sm:block" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{s.title}</h3>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          s.role === "Admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {s.role}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                    {s.cta && (
                      <Link
                        to={s.cta.to}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
                      >
                        {s.cta.label} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="card-elevated p-5 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Dica</h3>
            <p className="text-sm text-muted-foreground">
              Comece com um modelo simples (5 a 10 itens) e evolua conforme a operação amadurece. Você pode reabrir
              execuções concluídas se precisar corrigir algo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
