import {
  LayoutDashboard,
  Ticket,
  Clock,
  Wrench,
  FolderKanban,
  Settings,
  Building2,
  CreditCard,
  Shield,
  Users,
  Star,
  Target,
  History,
  LayoutList,
  Webhook,
  MessageSquare,
  BookOpen,
  Database,
  Package,
  CheckSquare,
  Truck,
  HardHat,
  ClipboardCheck,
  FileText,
  UserCheck,
  ListChecks,
  BarChart3,
  HelpCircle,
  Upload,
} from "lucide-react";

export interface MenuItem {
  key: string;
  label: string;
  icon: any;
  path: string;
  tooltip?: string;
  subtitle?: string;
  adminOnly?: boolean;
  techAllowed?: boolean;
  superAdminOnly?: boolean;
  auditorOnly?: boolean;
  /** If set, only show when current org slug matches one of these. */
  orgSlugs?: string[];
  /** Visual grouping section in the sidebar. */
  section?: "gerencial";
}

export const menuItems: MenuItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/", adminOnly: true, tooltip: "Visão geral com métricas e indicadores" },
  { key: "metricas-gerenciais", label: "Métricas Gerenciais", icon: Target, path: "/metricas-gerenciais", adminOnly: true, tooltip: "Relatório gerencial D-1 por técnico e configuração de webhook diário" },
  { key: "chamados", label: "Chamados", icon: Ticket, path: "/chamados", tooltip: "Abrir e gerenciar chamados técnicos" },
  { key: "chamados-abertos", label: "Chamados Abertos", icon: Clock, path: "/chamados-abertos", techAllowed: true, tooltip: "Ver todos os chamados em aberto e atribuir para si" },
  { key: "todos", label: "TODO List", icon: CheckSquare, path: "/todos", tooltip: "Tarefas pessoais; técnicos e admins compartilham visibilidade" },
  { key: "usuarios", label: "Usuários", icon: Users, path: "/usuarios", adminOnly: true, section: "gerencial", tooltip: "Gerenciar usuários da organização" },
  { key: "avaliacoes", label: "Avaliações", icon: Star, path: "/avaliacoes", adminOnly: true, section: "gerencial", tooltip: "Avaliações de atendimento dos chamados" },
  { key: "metas", label: "Metas", icon: Target, path: "/metas", techAllowed: true, tooltip: "Metas de desempenho dos técnicos" },
  { key: "historico", label: "Histórico", icon: History, path: "/historico", adminOnly: true, section: "gerencial", tooltip: "Log de auditoria de ações no sistema" },
  { key: "auditoria", label: "Auditoria", icon: Shield, path: "/auditoria", auditorOnly: true, section: "gerencial", tooltip: "Trilha de auditoria completa" },
  { key: "categorias", label: "Categorias", icon: LayoutList, path: "/categorias", adminOnly: true, section: "gerencial", tooltip: "Categorias hierárquicas de serviço" },
  { key: "setores", label: "Setores", icon: Building2, path: "/setores", adminOnly: true, section: "gerencial", tooltip: "Gerenciar setores da organização" },
  { key: "webhook-logs", label: "Webhook Logs", icon: Webhook, path: "/webhook-logs", adminOnly: true, section: "gerencial", tooltip: "Monitorar webhooks enviados" },
  { key: "preventivas", label: "Preventivas", icon: Wrench, path: "/preventivas", techAllowed: true, tooltip: "Manutenções preventivas programadas" },
  { key: "patrimonio", label: "Patrimônio", icon: Package, path: "/patrimonio", adminOnly: true, techAllowed: true, tooltip: "Cadastro e histórico de equipamentos" },
  { key: "projetos", label: "Projetos", icon: FolderKanban, path: "/projetos", adminOnly: true, tooltip: "Gestão de projetos da organização" },
  { key: "super-admin", label: "Painel Admin", icon: Shield, path: "/super-admin", superAdminOnly: true, subtitle: "Organizações, Usuários e Planos", tooltip: "Gestão global de organizações, usuários e planos" },
  { key: "planos", label: "Planos", icon: CreditCard, path: "/planos", superAdminOnly: true, tooltip: "Gerenciar planos de assinatura" },
  { key: "migracao", label: "Migração", icon: Database, path: "/migracao", superAdminOnly: true, tooltip: "Migração de dados e espelhamento entre projetos" },
  { key: "white-label", label: "White Label", icon: Building2, path: "/white-label", adminOnly: true, section: "gerencial", tooltip: "Personalizar identidade visual" },
  { key: "integracoes", label: "Integrações", icon: MessageSquare, path: "/integracoes", adminOnly: true, section: "gerencial", tooltip: "Configurar integrações externas (WhatsApp)" },
  { key: "documentacao", label: "Documentação", icon: BookOpen, path: "/documentacao", adminOnly: true, tooltip: "Guias e manuais do sistema" },
  { key: "op-cadastros", label: "Cadastros", icon: Users, path: "/op/cadastros", orgSlugs: ["cgps-operacional"], tooltip: "Cadastros do módulo Operacional: motoristas, empresas e veículos" },
  { key: "op-entregas", label: "Entregas", icon: Truck, path: "/op/entregas", orgSlugs: ["cgps-operacional"], tooltip: "Controle de entregas externas" },
  { key: "op-oficina", label: "Oficina", icon: Wrench, path: "/op/oficina", orgSlugs: ["cgps-operacional"], tooltip: "Ordens de serviço da oficina" },
  { key: "op-manutencao", label: "Manutenção Predial", icon: HardHat, path: "/op/manutencao", orgSlugs: ["cgps-operacional"], tooltip: "Ordens de manutenção, sedes e checklists" },
  { key: "op-avaliacoes", label: "Avaliações Op.", icon: Star, path: "/op/avaliacoes", orgSlugs: ["cgps-operacional"], tooltip: "Feedback dos solicitantes sobre entregas e manutenções" },
  { key: "chk-dashboard", label: "Painel", icon: ClipboardCheck, path: "/checklists", orgSlugs: ["grcheck"], techAllowed: true, tooltip: "Painel de checklists" },
  { key: "chk-como-funciona", label: "Como Funciona", icon: HelpCircle, path: "/checklists/como-funciona", orgSlugs: ["grcheck"], techAllowed: true, tooltip: "Como funciona o checklist" },
  { key: "chk-minhas", label: "Meus Checklists", icon: ClipboardCheck, path: "/checklists/minhas", orgSlugs: ["grcheck"], techAllowed: true, tooltip: "Checklists atribuídos a você" },
  { key: "chk-execucoes", label: "Execuções", icon: ListChecks, path: "/checklists/execucoes", orgSlugs: ["grcheck"], adminOnly: true, tooltip: "Todas as execuções de checklists" },
  { key: "chk-modelos", label: "Modelos", icon: FileText, path: "/checklists/modelos", orgSlugs: ["grcheck"], adminOnly: true, tooltip: "Modelos de checklist" },
  { key: "chk-atribuicoes", label: "Atribuições", icon: UserCheck, path: "/checklists/atribuicoes", orgSlugs: ["grcheck"], adminOnly: true, tooltip: "Atribuir checklists a colaboradores" },
  { key: "chk-empresas", label: "Empresas", icon: Building2, path: "/checklists/empresas", orgSlugs: ["grcheck"], adminOnly: true, tooltip: "Empresas parceiras" },
  { key: "chk-setores", label: "Setores", icon: Building2, path: "/checklists/setores", orgSlugs: ["grcheck"], adminOnly: true, tooltip: "Setores da organização de checklists" },
  { key: "chk-importar", label: "Importar", icon: Upload, path: "/checklists/importar", orgSlugs: ["grcheck"], adminOnly: true, tooltip: "Importar checklists a partir de arquivo JSON" },
  { key: "chk-relatorios", label: "Relatórios", icon: BarChart3, path: "/checklists/relatorios", orgSlugs: ["grcheck"], adminOnly: true, tooltip: "Relatório de acompanhamento" },
  { key: "configuracoes", label: "Configurações", icon: Settings, path: "/configuracoes", tooltip: "Preferências e configurações gerais" },
];

export type Roles = {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isTech: boolean;
  isAuditor: boolean;
};

export function defaultAccess(item: MenuItem, r: Roles): boolean {
  if (r.isSuperAdmin) return true;
  if (item.superAdminOnly) return false;
  if (item.auditorOnly) return r.isAdmin || r.isAuditor;
  if (item.techAllowed) return r.isAdmin || r.isTech;
  if (item.adminOnly) return r.isAdmin;
  return true;
}
