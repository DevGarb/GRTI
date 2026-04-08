import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Ticket,
  Wrench,
  FolderKanban,
  Settings,
  LogOut,
  Menu,
  Moon,
  Sun,
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
  HelpCircle,
  Database,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import OrgSwitcher from "@/components/OrgSwitcher";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", adminOnly: true, tooltip: "Visão geral com métricas e indicadores" },
  { label: "Chamados", icon: Ticket, path: "/chamados", tooltip: "Abrir e gerenciar chamados técnicos" },
  { label: "Usuários", icon: Users, path: "/usuarios", adminOnly: true, tooltip: "Gerenciar usuários da organização" },
  { label: "Avaliações", icon: Star, path: "/avaliacoes", adminOnly: true, tooltip: "Avaliações de atendimento dos chamados" },
  { label: "Metas", icon: Target, path: "/metas", adminOnly: true, tooltip: "Metas de desempenho dos técnicos" },
  { label: "Histórico", icon: History, path: "/historico", adminOnly: true, tooltip: "Log de auditoria de ações no sistema" },
  { label: "Auditoria", icon: Shield, path: "/auditoria", auditorOnly: true, tooltip: "Trilha de auditoria completa" },
  { label: "Categorias", icon: LayoutList, path: "/categorias", adminOnly: true, tooltip: "Categorias hierárquicas de serviço" },
  { label: "Setores", icon: Building2, path: "/setores", adminOnly: true, tooltip: "Gerenciar setores da organização" },
  { label: "Webhook Logs", icon: Webhook, path: "/webhook-logs", adminOnly: true, tooltip: "Monitorar webhooks enviados" },
  { label: "Preventivas", icon: Wrench, path: "/preventivas", techAllowed: true, tooltip: "Manutenções preventivas programadas" },
  { label: "Patrimônio", icon: Package, path: "/patrimonio", adminOnly: true, tooltip: "Cadastro e histórico de equipamentos" },
  { label: "Projetos", icon: FolderKanban, path: "/projetos", adminOnly: true, tooltip: "Gestão de projetos da organização" },
  { label: "Painel Admin", icon: Shield, path: "/super-admin", superAdminOnly: true, subtitle: "Organizações, Usuários e Planos", tooltip: "Gestão global de organizações, usuários e planos" },
  { label: "Planos", icon: CreditCard, path: "/planos", superAdminOnly: true, tooltip: "Gerenciar planos de assinatura" },
  { label: "Migração", icon: Database, path: "/migracao", superAdminOnly: true, tooltip: "Migração de dados e espelhamento entre projetos" },
  { label: "White Label", icon: Building2, path: "/white-label", adminOnly: true, tooltip: "Personalizar identidade visual" },
  { label: "Integrações", icon: MessageSquare, path: "/integracoes", adminOnly: true, tooltip: "Configurar integrações externas (WhatsApp)" },
  { label: "Documentação", icon: BookOpen, path: "/documentacao", adminOnly: true, tooltip: "Guias e manuais do sistema" },
  { label: "Configurações", icon: Settings, path: "/configuracoes", tooltip: "Preferências e configurações gerais" },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

function hexToHSL(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("dark-mode");
    if (saved !== null) return saved === "true";
    return document.documentElement.classList.contains("dark");
  });
  const { profile, roles, signOut, hasRole, isSuperAdmin } = useAuth();
  const isAdmin = hasRole("admin");

  // Apply dark mode class on mount and changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("dark-mode", String(darkMode));
  }, [darkMode]);

  // Fetch and apply white-label org data
  const [orgData, setOrgData] = useState<{ name: string; logo_url: string | null; primary_color: string | null; secondary_color: string | null; favicon_url?: string | null } | null>(null);

  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from("organizations")
      .select("name, logo_url, primary_color, secondary_color, favicon_url")
      .eq("id", profile.organization_id)
      .single()
      .then(({ data }) => {
        if (data) setOrgData(data as any);
      });
  }, [profile?.organization_id]);

  // Apply org favicon
  useEffect(() => {
    if (!orgData?.favicon_url) return;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = orgData.favicon_url;
  }, [orgData?.favicon_url]);

  // Apply white-label colors, re-run when dark mode or orgData changes
  useEffect(() => {
    const root = document.documentElement;
    // Clear any previously set inline overrides
    const vars = ["--primary", "--accent", "--ring", "--sidebar-background", "--sidebar-accent",
      "--sidebar-primary-foreground", "--sidebar-border", "--secondary", "--background"];
    vars.forEach(v => root.style.removeProperty(v));

    if (!orgData) return;

    // Only apply white-label overrides in light mode to avoid breaking dark theme
    if (darkMode) return;

    if (orgData.primary_color) {
      const hsl = hexToHSL(orgData.primary_color);
      if (hsl) {
        root.style.setProperty("--primary", hsl);
        root.style.setProperty("--accent", hsl);
        root.style.setProperty("--ring", hsl);
        root.style.setProperty("--sidebar-background", hsl);
        const [h, s, l] = hsl.split(" ").map((v) => parseFloat(v));
        root.style.setProperty("--sidebar-accent", `${h} ${Math.max(s - 17, 0)}% ${Math.min(l + 4, 100)}%`);
        root.style.setProperty("--sidebar-primary-foreground", hsl);
        root.style.setProperty("--sidebar-border", `${h} ${Math.max(s - 27, 0)}% ${Math.min(l + 6, 100)}%`);
      }
    }
    if (orgData.secondary_color) {
      const hsl = hexToHSL(orgData.secondary_color);
      if (hsl) {
        root.style.setProperty("--secondary", hsl);
        root.style.setProperty("--background", hsl);
      }
    }
  }, [orgData, darkMode]);

  const getDocTab = () => {
    if (isSuperAdmin || roles.includes("admin")) return "admin";
    if (roles.includes("tecnico")) return "tecnico";
    return "solicitante";
  };


  const isTech = roles.includes("tecnico") || roles.includes("desenvolvedor");
  const visibleNavItems = navItems.filter((item) => {
    if ((item as any).superAdminOnly) return isSuperAdmin;
    if ((item as any).auditorOnly) return isAdmin || roles.includes("auditor" as any);
    if ((item as any).techAllowed) return isAdmin || isTech;
    if ((item as any).adminOnly) return isAdmin;
    return true;
  });

  const toggleDark = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <div className="flex min-h-screen w-full">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen w-[240px] flex flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col items-center px-5 py-6 gap-1.5">
          {orgData?.logo_url ? (
            <img
              src={orgData.logo_url}
              alt={orgData.name}
              className="h-10 max-w-[140px] rounded-lg object-contain"
            />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
              <span className="text-sidebar-primary-foreground font-bold text-[10px]">
                {(orgData?.name || "IN").substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          {!orgData?.logo_url && (
            <span className="text-sidebar-primary font-semibold text-sm leading-tight text-center">
              {orgData?.name || "GRTI"}
            </span>
          )}
          <span className="text-sidebar-muted text-[11px] text-center truncate max-w-full">{profile?.full_name || "Carregando..."}</span>
        </div>

        <OrgSwitcher />

        <nav className="flex-1 px-3 mt-2 overflow-y-auto min-h-0 scrollbar-thin">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
            Menu
          </span>
          <ul className="mt-2 space-y-0.5">
            {visibleNavItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Tooltip delayDuration={400}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{item.label}</span>
                          {(item as any).subtitle && (
                            <span className="text-[10px] font-normal text-sidebar-muted leading-tight">
                              {(item as any).subtitle}
                            </span>
                          )}
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-[200px]">
                      {(item as any).tooltip}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-[12px] text-sidebar-muted truncate">{profile?.email || ""}</p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => {
                navigate(`/documentacao?tab=${getDocTab()}`);
                setSidebarOpen(false);
              }}
              title="Ajuda"
              className="p-1.5 rounded-md hover:bg-sidebar-accent/50 text-sidebar-muted transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              onClick={toggleDark}
              className="p-1.5 rounded-md hover:bg-sidebar-accent/50 text-sidebar-muted transition-colors"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={signOut}
              className="p-1.5 rounded-md hover:bg-sidebar-accent/50 text-sidebar-muted transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-12 flex items-center border-b border-border bg-background/80 backdrop-blur-sm px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
