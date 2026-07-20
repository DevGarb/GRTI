import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TicketModalProvider } from "@/contexts/TicketModalContext";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import AppLayout from "@/components/AppLayout";
import MetricasGerenciais from "@/pages/MetricasGerenciais";
import Dashboard from "@/pages/Dashboard";
import Chamados from "@/pages/Chamados";
import ChamadosAbertos from "@/pages/ChamadosAbertos";
import Preventivas from "@/pages/Preventivas";
import Patrimonio from "@/pages/Patrimonio";
import Projetos from "@/pages/Projetos";
import ProjetoDetalhe from "@/pages/ProjetoDetalhe";
import ProjetosLayout from "@/pages/projetos/ProjetosLayout";
import ProjetosDashboard from "@/pages/projetos/ProjetosDashboard";
import ProjetosBacklog from "@/pages/projetos/ProjetosBacklog";
import ProjetosSprints from "@/pages/projetos/ProjetosSprints";
import ProjetosCalendario from "@/pages/projetos/ProjetosCalendario";
import ProjetosMVP from "@/pages/projetos/ProjetosMVP";
import ProjetosMeuMVP from "@/pages/projetos/ProjetosMeuMVP";
import ProjetosPenalidades from "@/pages/projetos/ProjetosPenalidades";
import ChamadosCalendario from "@/pages/chamados/ChamadosCalendario";
import Configuracoes from "@/pages/Configuracoes";
import Login from "@/pages/Login";
import WhiteLabel from "@/pages/WhiteLabel";
import Usuarios from "@/pages/Usuarios";
import Categorias from "@/pages/Categorias";
import Historico from "@/pages/Historico";
import Auditoria from "@/pages/Auditoria";

import Avaliacoes from "@/pages/Avaliacoes";
import MetasLayout from "@/pages/metas/MetasLayout";
import MetasTecnicos from "@/pages/MetasTecnicos";
import MetasRevisaoTMA from "@/pages/metas/MetasRevisaoTMA";
import WebhookLogs from "@/pages/WebhookLogs";
import Planos from "@/pages/Planos";
import Integracoes from "@/pages/Integracoes";
import SuperAdmin from "@/pages/SuperAdmin";
import Migracao from "@/pages/Migracao";
import Documentacao from "@/pages/Documentacao";
import Setores from "@/pages/Setores";
import AssetPublicView from "@/pages/AssetPublicView";
import TvDashboard from "@/pages/TvDashboard";
import Todos from "@/pages/Todos";
import EscolherOrganizacao from "@/pages/EscolherOrganizacao";
import OpCadastros from "@/pages/OpCadastros";
import OpEntregas from "@/pages/OpEntregas";
import OpEntregasMotoristas from "@/pages/op/OpEntregasMotoristas";
import OpEntregasCategorias from "@/pages/op/OpEntregasCategorias";
import OpEntregasSolicitantes from "@/pages/op/OpEntregasSolicitantes";
import OpEntregasSolicitar from "@/pages/op/OpEntregasSolicitar";
import OpEntregasMinhas from "@/pages/op/OpEntregasMinhas";
import EntregasPin from "@/pages/op/EntregasPin";
import EntregasGuard from "@/pages/op/EntregasGuard";
import { EntregasProfileProvider, useEntregasProfile } from "@/contexts/EntregasProfileContext";
import OpOficina from "@/pages/OpOficina";
import OpManutencao from "@/pages/OpManutencao";
import ManutencaoPin from "@/pages/op/ManutencaoPin";
import ManutencaoGuard from "@/pages/op/ManutencaoGuard";
import OpManutencaoMinhas from "@/pages/op/OpManutencaoMinhas";
import OpManutencaoSolicitar from "@/pages/op/OpManutencaoSolicitar";
import OpAvaliacoes from "@/pages/op/OpAvaliacoes";
import { ManutencaoProfileProvider, useManutencaoProfile } from "@/contexts/ManutencaoProfileContext";
import NotFound from "./pages/NotFound";
import OAuthConsent from "@/pages/OAuthConsent";
import Connect from "@/pages/Connect";
import ChkDashboard from "@/pages/checklists/ChkDashboard";
import ChkSetores from "@/pages/checklists/ChkSetores";
import ChkEmpresas from "@/pages/checklists/ChkEmpresas";
import ChkModelos from "@/pages/checklists/ChkModelos";
import ChkAtribuicoes from "@/pages/checklists/ChkAtribuicoes";
import ChkExecucoes from "@/pages/checklists/ChkExecucoes";
import ChkMinhas from "@/pages/checklists/ChkMinhas";
import ChkExecutar from "@/pages/checklists/ChkExecutar";
import ChkRelatorios from "@/pages/checklists/ChkRelatorios";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Evita refetch/re-render ao voltar para a aba (atrapalhava modais abertos)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { hasRole, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!hasRole("admin")) return <Navigate to="/chamados" replace />;
  return <>{children}</>;
}

function MenuGuard({ menuKey, children }: { menuKey: string; children: React.ReactNode }) {
  const { canAccess, firstAccessiblePath, loading } = useMenuAccess();
  if (loading) return null;
  if (!canAccess(menuKey)) {
    const fallback = firstAccessiblePath();
    console.warn(`[MenuGuard] acesso negado a "${menuKey}" → redirecionando para ${fallback}`);
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}

function OpAvaliacoesRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, hasRole, isSuperAdmin } = useAuth();
  const { profile: entregasProfile } = useEntregasProfile();
  const { profile: manutencaoProfile } = useManutencaoProfile();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  const isSystemAdmin = isSuperAdmin || hasRole("admin");
  const isOperationalAdmin = entregasProfile?.type === "admin" || manutencaoProfile?.type === "admin";
  if (isSystemAdmin || isOperationalAdmin) return <>{children}</>;

  const pinPath = manutencaoProfile ? "/op/manutencao/pin" : "/op/entregas/pin";
  return <Navigate to={pinPath} replace />;
}

function HomeRedirect({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [slug, setSlug] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!profile?.organization_id) { setSlug(null); return; }
    supabase.from("organizations").select("slug").eq("id", profile.organization_id).maybeSingle()
      .then(({ data }) => setSlug((data as any)?.slug ?? null));
  }, [profile?.organization_id]);
  if (slug === undefined) return null;
  if (slug === "grcheck") return <Navigate to="/checklists" replace />;
  if (slug === "cgps-operacional") return <Navigate to="/op/entregas" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    // Honor ?next=/path (used by MCP OAuth consent flow) so sign-in returns
    // the user to the pending consent screen instead of the app root.
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    return <Navigate to={safeNext} replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TicketModalProvider>
          <Routes>
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/escolher-organizacao" element={<ProtectedRoute><EscolherOrganizacao /></ProtectedRoute>} />
            <Route path="/asset/:id" element={<AssetPublicView />} />
            <Route path="/tv/:orgSlug" element={<TvDashboard />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<HomeRedirect><MenuGuard menuKey="dashboard"><AdminRoute><Dashboard /></AdminRoute></MenuGuard></HomeRedirect>} />
                      <Route path="/metricas-gerenciais" element={<MenuGuard menuKey="metricas-gerenciais"><AdminRoute><MetricasGerenciais /></AdminRoute></MenuGuard>} />
                      <Route path="/chamados" element={<MenuGuard menuKey="chamados"><Chamados /></MenuGuard>} />
                      <Route path="/chamados/calendario" element={<MenuGuard menuKey="chamados"><ChamadosCalendario /></MenuGuard>} />
                      <Route path="/chamados-abertos" element={<MenuGuard menuKey="chamados-abertos"><ChamadosAbertos /></MenuGuard>} />
                      <Route path="/todos" element={<MenuGuard menuKey="todos"><Todos /></MenuGuard>} />
                      <Route path="/usuarios" element={<MenuGuard menuKey="usuarios"><AdminRoute><Usuarios /></AdminRoute></MenuGuard>} />
                      <Route path="/avaliacoes" element={<MenuGuard menuKey="avaliacoes"><AdminRoute><Avaliacoes /></AdminRoute></MenuGuard>} />
                      <Route path="/metas" element={<MenuGuard menuKey="metas"><MetasLayout /></MenuGuard>}>
                        <Route index element={<MetasTecnicos />} />
                        <Route path="meu-mvp" element={<ProjetosMeuMVP />} />
                        <Route path="mvp" element={<AdminRoute><ProjetosMVP /></AdminRoute>} />
                        <Route path="penalidades" element={<AdminRoute><ProjetosPenalidades /></AdminRoute>} />
                        <Route path="revisao-tma" element={<AdminRoute><MetasRevisaoTMA /></AdminRoute>} />
                      </Route>
                      <Route path="/historico" element={<MenuGuard menuKey="historico"><AdminRoute><Historico /></AdminRoute></MenuGuard>} />
                      <Route path="/auditoria" element={<MenuGuard menuKey="auditoria"><AdminRoute><Auditoria /></AdminRoute></MenuGuard>} />

                      <Route path="/categorias" element={<MenuGuard menuKey="categorias"><AdminRoute><Categorias /></AdminRoute></MenuGuard>} />
                      <Route path="/webhook-logs" element={<MenuGuard menuKey="webhook-logs"><AdminRoute><WebhookLogs /></AdminRoute></MenuGuard>} />
                      <Route path="/preventivas" element={<MenuGuard menuKey="preventivas"><Preventivas /></MenuGuard>} />
                      <Route path="/patrimonio" element={<MenuGuard menuKey="patrimonio"><Patrimonio /></MenuGuard>} />
                      <Route path="/projetos" element={<MenuGuard menuKey="projetos"><ProjetosLayout /></MenuGuard>}>
                        <Route index element={<ProjetosDashboard />} />
                        <Route path="lista" element={<Projetos />} />
                        <Route path="backlog" element={<ProjetosBacklog />} />
                        <Route path="sprints" element={<ProjetosSprints />} />
                        <Route path="calendario" element={<ProjetosCalendario />} />
                      </Route>
                      <Route path="/projetos/:id" element={<MenuGuard menuKey="projetos"><ProjetoDetalhe /></MenuGuard>} />
                      <Route path="/configuracoes" element={<MenuGuard menuKey="configuracoes"><Configuracoes /></MenuGuard>} />
                      <Route path="/white-label" element={<MenuGuard menuKey="white-label"><AdminRoute><WhiteLabel /></AdminRoute></MenuGuard>} />
                      <Route path="/integracoes" element={<MenuGuard menuKey="integracoes"><AdminRoute><Integracoes /></AdminRoute></MenuGuard>} />
                      <Route path="/planos" element={<MenuGuard menuKey="planos"><AdminRoute><Planos /></AdminRoute></MenuGuard>} />
                      <Route path="/super-admin" element={<MenuGuard menuKey="super-admin"><AdminRoute><SuperAdmin /></AdminRoute></MenuGuard>} />
                      <Route path="/migracao" element={<MenuGuard menuKey="migracao"><AdminRoute><Migracao /></AdminRoute></MenuGuard>} />
                      <Route path="/documentacao" element={<MenuGuard menuKey="documentacao"><AdminRoute><Documentacao /></AdminRoute></MenuGuard>} />
                      <Route path="/setores" element={<MenuGuard menuKey="setores"><AdminRoute><Setores /></AdminRoute></MenuGuard>} />
                      <Route path="/op/cadastros" element={<MenuGuard menuKey="op-cadastros"><OpCadastros /></MenuGuard>} />
                      <Route path="/op/entregas/pin" element={<MenuGuard menuKey="op-entregas"><EntregasProfileProvider><EntregasPin /></EntregasProfileProvider></MenuGuard>} />
                      <Route path="/op/entregas" element={<MenuGuard menuKey="op-entregas"><EntregasProfileProvider><EntregasGuard allow={["admin"]}><OpEntregas /></EntregasGuard></EntregasProfileProvider></MenuGuard>} />
                      <Route path="/op/entregas/motoristas" element={<MenuGuard menuKey="op-entregas"><EntregasProfileProvider><EntregasGuard allow={["admin"]}><OpEntregasMotoristas /></EntregasGuard></EntregasProfileProvider></MenuGuard>} />
                      <Route path="/op/entregas/categorias" element={<MenuGuard menuKey="op-entregas"><EntregasProfileProvider><EntregasGuard allow={["admin"]}><OpEntregasCategorias /></EntregasGuard></EntregasProfileProvider></MenuGuard>} />
                      <Route path="/op/entregas/solicitantes" element={<MenuGuard menuKey="op-entregas"><EntregasProfileProvider><EntregasGuard allow={["admin"]}><OpEntregasSolicitantes /></EntregasGuard></EntregasProfileProvider></MenuGuard>} />
                      <Route path="/op/entregas/solicitar" element={<MenuGuard menuKey="op-entregas"><EntregasProfileProvider><EntregasGuard allow={["solicitante"]}><OpEntregasSolicitar /></EntregasGuard></EntregasProfileProvider></MenuGuard>} />
                      <Route path="/op/entregas/minhas" element={<MenuGuard menuKey="op-entregas"><EntregasProfileProvider><EntregasGuard allow={["motorista","solicitante"]}><OpEntregasMinhas /></EntregasGuard></EntregasProfileProvider></MenuGuard>} />


                      <Route path="/op/oficina" element={<MenuGuard menuKey="op-oficina"><OpOficina /></MenuGuard>} />
                      <Route path="/op/manutencao/pin" element={<MenuGuard menuKey="op-manutencao"><ManutencaoProfileProvider><ManutencaoPin /></ManutencaoProfileProvider></MenuGuard>} />
                      <Route path="/op/manutencao/minhas" element={<MenuGuard menuKey="op-manutencao"><ManutencaoProfileProvider><ManutencaoGuard><OpManutencaoMinhas /></ManutencaoGuard></ManutencaoProfileProvider></MenuGuard>} />
                      <Route path="/op/manutencao/solicitar" element={<MenuGuard menuKey="op-manutencao"><ManutencaoProfileProvider><ManutencaoGuard><OpManutencaoSolicitar /></ManutencaoGuard></ManutencaoProfileProvider></MenuGuard>} />
                      <Route path="/op/manutencao" element={<MenuGuard menuKey="op-manutencao"><ManutencaoProfileProvider><ManutencaoGuard><OpManutencao /></ManutencaoGuard></ManutencaoProfileProvider></MenuGuard>} />
                      <Route path="/op/avaliacoes" element={<MenuGuard menuKey="op-avaliacoes"><EntregasProfileProvider><ManutencaoProfileProvider><OpAvaliacoesRouteGuard><OpAvaliacoes /></OpAvaliacoesRouteGuard></ManutencaoProfileProvider></EntregasProfileProvider></MenuGuard>} />
                      <Route path="/checklists" element={<MenuGuard menuKey="chk-dashboard"><ChkDashboard /></MenuGuard>} />
                      <Route path="/checklists/setores" element={<MenuGuard menuKey="chk-setores"><AdminRoute><ChkSetores /></AdminRoute></MenuGuard>} />
                      <Route path="/checklists/empresas" element={<MenuGuard menuKey="chk-empresas"><AdminRoute><ChkEmpresas /></AdminRoute></MenuGuard>} />
                      <Route path="/checklists/modelos" element={<MenuGuard menuKey="chk-modelos"><AdminRoute><ChkModelos /></AdminRoute></MenuGuard>} />
                      <Route path="/checklists/atribuicoes" element={<MenuGuard menuKey="chk-atribuicoes"><AdminRoute><ChkAtribuicoes /></AdminRoute></MenuGuard>} />
                      <Route path="/checklists/execucoes" element={<MenuGuard menuKey="chk-execucoes"><AdminRoute><ChkExecucoes /></AdminRoute></MenuGuard>} />
                      <Route path="/checklists/minhas" element={<MenuGuard menuKey="chk-minhas"><ChkMinhas /></MenuGuard>} />
                      <Route path="/checklists/executar/:id" element={<MenuGuard menuKey="chk-dashboard"><ChkExecutar /></MenuGuard>} />
                      <Route path="/checklists/relatorios" element={<MenuGuard menuKey="chk-relatorios"><AdminRoute><ChkRelatorios /></AdminRoute></MenuGuard>} />
                      <Route path="/connect" element={<Connect />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
          </TicketModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
