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
}

export const menuItems: MenuItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/", adminOnly: true, tooltip: "Visão geral com métricas e indicadores" },
  { key: "chamados", label: "Chamados", icon: Ticket, path: "/chamados", tooltip: "Abrir e gerenciar chamados técnicos" },
  { key: "chamados-abertos", label: "Chamados Abertos", icon: Clock, path: "/chamados-abertos", techAllowed: true, tooltip: "Ver todos os chamados em aberto e atribuir para si" },
  { key: "usuarios", label: "Usuários", icon: Users, path: "/usuarios", adminOnly: true, tooltip: "Gerenciar usuários da organização" },
  { key: "avaliacoes", label: "Avaliações", icon: Star, path: "/avaliacoes", adminOnly: true, tooltip: "Avaliações de atendimento dos chamados" },
  { key: "metas", label: "Metas", icon: Target, path: "/metas", techAllowed: true, tooltip: "Metas de desempenho dos técnicos" },
  { key: "historico", label: "Histórico", icon: History, path: "/historico", adminOnly: true, tooltip: "Log de auditoria de ações no sistema" },
  { key: "auditoria", label: "Auditoria", icon: Shield, path: "/auditoria", auditorOnly: true, tooltip: "Trilha de auditoria completa" },
  { key: "categorias", label: "Categorias", icon: LayoutList, path: "/categorias", adminOnly: true, tooltip: "Categorias hierárquicas de serviço" },
  { key: "setores", label: "Setores", icon: Building2, path: "/setores", adminOnly: true, tooltip: "Gerenciar setores da organização" },
  { key: "webhook-logs", label: "Webhook Logs", icon: Webhook, path: "/webhook-logs", adminOnly: true, tooltip: "Monitorar webhooks enviados" },
  { key: "preventivas", label: "Preventivas", icon: Wrench, path: "/preventivas", techAllowed: true, tooltip: "Manutenções preventivas programadas" },
  { key: "patrimonio", label: "Patrimônio", icon: Package, path: "/patrimonio", adminOnly: true, tooltip: "Cadastro e histórico de equipamentos" },
  { key: "projetos", label: "Projetos", icon: FolderKanban, path: "/projetos", adminOnly: true, tooltip: "Gestão de projetos da organização" },
  { key: "super-admin", label: "Painel Admin", icon: Shield, path: "/super-admin", superAdminOnly: true, subtitle: "Organizações, Usuários e Planos", tooltip: "Gestão global de organizações, usuários e planos" },
  { key: "planos", label: "Planos", icon: CreditCard, path: "/planos", superAdminOnly: true, tooltip: "Gerenciar planos de assinatura" },
  { key: "migracao", label: "Migração", icon: Database, path: "/migracao", superAdminOnly: true, tooltip: "Migração de dados e espelhamento entre projetos" },
  { key: "white-label", label: "White Label", icon: Building2, path: "/white-label", adminOnly: true, tooltip: "Personalizar identidade visual" },
  { key: "integracoes", label: "Integrações", icon: MessageSquare, path: "/integracoes", adminOnly: true, tooltip: "Configurar integrações externas (WhatsApp)" },
  { key: "documentacao", label: "Documentação", icon: BookOpen, path: "/documentacao", adminOnly: true, tooltip: "Guias e manuais do sistema" },
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
