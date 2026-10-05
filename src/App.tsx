import { lazy, useState, useEffect } from "react";
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
import { FullScreenLoader, RouteBoundary } from "@/components/PageLoader";

import EntregasGuard from "@/pages/op/EntregasGuard";
import { EntregasProfileProvider, useEntregasProfile } from "@/contexts/EntregasProfileContext";
import OficinaGuard from "@/pages/op/OficinaGuard";
import { OficinaProfileProvider } from "@/contexts/OficinaProfileContext";
import ManutencaoGuard from "@/pages/op/ManutencaoGuard";
import { ManutencaoProfileProvider, useManutencaoProfile } from "@/contexts/ManutencaoProfileContext";

// Páginas carregadas sob demanda (um chunk por rota).
const MetricasGerenciais = lazy(() => import("@/pages/MetricasGerenciais"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Chamados = lazy(() => import("@/pages/Chamados"));
const ChamadosAbertos = lazy(() => import("@/pages/ChamadosAbertos"));
const Preventivas = lazy(() => import("@/pages/Preventivas"));
const Patrimonio = lazy(() => import("@/pages/Patrimonio"));
const Projetos = lazy(() => import("@/pages/Projetos"));
const ProjetoDetalhe = lazy(() => import("@/pages/ProjetoDetalhe"));
const ProjetosLayout = lazy(() => import("@/pages/projetos/ProjetosLayout"));
const ProjetosDashboard = lazy(() => import("@/pages/projetos/ProjetosDashboard"));
const ProjetosBacklog = lazy(() => import("@/pages/projetos/ProjetosBacklog"));
const ProjetosSprints = lazy(() => import("@/pages/projetos/ProjetosSprints"));
const ProjetosCalendario = lazy(() => import("@/pages/projetos/ProjetosCalendario"));
const ProjetosMVP = lazy(() => import("@/pages/projetos/ProjetosMVP"));
const ProjetosMeuMVP = lazy(() => import("@/pages/projetos/ProjetosMeuMVP"));
const ProjetosPenalidades = lazy(() => import("@/pages/projetos/ProjetosPenalidades"));
const ProjetosCategoriasEncerramento = lazy(() => import("@/pages/projetos/ProjetosCategoriasEncerramento"));
const ChamadosCalendario = lazy(() => import("@/pages/chamados/ChamadosCalendario"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const Login = lazy(() => import("@/pages/Login"));
const WhiteLabel = lazy(() => import("@/pages/WhiteLabel"));
const Usuarios = lazy(() => import("@/pages/Usuarios"));
const Categorias = lazy(() => import("@/pages/Categorias"));
const Historico = lazy(() => import("@/pages/Historico"));
const Auditoria = lazy(() => import("@/pages/Auditoria"));
const Avaliacoes = lazy(() => import("@/pages/Avaliacoes"));
const MetasLayout = lazy(() => import("@/pages/metas/MetasLayout"));
const MetasTecnicos = lazy(() => import("@/pages/MetasTecnicos"));
const MetasRevisaoTMA = lazy(() => import("@/pages/metas/MetasRevisaoTMA"));
const WebhookLogs = lazy(() => import("@/pages/WebhookLogs"));
const Planos = lazy(() => import("@/pages/Planos"));
const Integracoes = lazy(() => import("@/pages/Integracoes"));
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin"));
const Migracao = lazy(() => import("@/pages/Migracao"));
const Documentacao = lazy(() => import("@/pages/Documentacao"));
const Setores = lazy(() => import("@/pages/Setores"));
const AssetPublicView = lazy(() => import("@/pages/AssetPublicView"));
const TvDashboard = lazy(() => import("@/pages/TvDashboard"));
const Todos = lazy(() => import("@/pages/Todos"));
const EscolherOrganizacao = lazy(() => import("@/pages/EscolherOrganizacao"));
const OpCadastros = lazy(() => import("@/pages/OpCadastros"));
const OpEntregas = lazy(() => import("@/pages/OpEntregas"));
const OpEntregasMotoristas = lazy(() => import("@/pages/op/OpEntregasMotoristas"));
const OpEntregasCategorias = lazy(() => import("@/pages/op/OpEntregasCategorias"));
const OpEntregasSolicitantes = lazy(() => import("@/pages/op/OpEntregasSolicitantes"));
const OpEntregasSolicitar = lazy(() => import("@/pages/op/OpEntregasSolicitar"));
const OpEntregasMinhas = lazy(() => import("@/pages/op/OpEntregasMinhas"));
const EntregasPin = lazy(() => import("@/pages/op/EntregasPin"));
const OpOficina = lazy(() => import("@/pages/OpOficina"));
const OficinaPin = lazy(() => import("@/pages/op/OficinaPin"));
const OpOficinaMinhas = lazy(() => import("@/pages/op/OpOficinaMinhas"));
const OpOficinaAgenda = lazy(() => import("@/pages/op/OpOficinaAgenda"));
const OpOficinaAgendar = lazy(() => import("@/pages/op/OpOficinaAgendar"));
const OpOficinaFinalizadas = lazy(() => import("@/pages/op/OpOficinaFinalizadas"));
const OpOficinaCompras = lazy(() => import("@/pages/op/OpOficinaCompras"));
const OpOficinaPremiacoes = lazy(() => import("@/pages/op/OpOficinaPremiacoes"));
const OpOficinaAlertas = lazy(() => import("@/pages/op/OpOficinaAlertas"));
const OpOficinaPontuacao = lazy(() => import("@/pages/op/OpOficinaPontuacao"));
const OpOficinaMeusPontos = lazy(() => import("@/pages/op/OpOficinaMeusPontos"));
const OpManutencao = lazy(() => import("@/pages/OpManutencao"));
const ManutencaoPin = lazy(() => import("@/pages/op/ManutencaoPin"));
const OpManutencaoMinhas = lazy(() => import("@/pages/op/OpManutencaoMinhas"));
const OpManutencaoSolicitar = lazy(() => import("@/pages/op/OpManutencaoSolicitar"));
const OpAvaliacoes = lazy(() => import("@/pages/op/OpAvaliacoes"));
const OpEntregasRelatorios = lazy(() => import("@/pages/op/OpEntregasRelatorios"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OAuthConsent = lazy(() => import("@/pages/OAuthConsent"));
const Connect = lazy(() => import("@/pages/Connect"));
const ChkDashboard = lazy(() => import("@/pages/checklists/ChkDashboard"));
const ChkSetores = lazy(() => import("@/pages/checklists/ChkSetores"));
const ChkEmpresas = lazy(() => import("@/pages/checklists/ChkEmpresas"));
const ChkModelos = lazy(() => import("@/pages/checklists/ChkModelos"));
const ChkAtribuicoes = lazy(() => import("@/pages/checklists/ChkAtribuicoes"));
const ChkExecucoes = lazy(() => import("@/pages/checklists/ChkExecucoes"));
const ChkMinhas = lazy(() => import("@/pages/checklists/ChkMinhas"));
const ChkExecutar = lazy(() => import("@/pages/checklists/ChkExecutar"));
const ChkRelatorios = lazy(() => import("@/pages/checklists/ChkRelatorios"));
const ChkImportar = lazy(() => import("@/pages/checklists/ChkImportar"));
const ChkComoFunciona = lazy(() => import("@/pages/checklists/ChkComoFunciona"));

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
    return <FullScreenLoader />;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { hasRole, loading } = useAuth();
  if (loading) {
    return <FullScreenLoader />;
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
          <RouteBoundary fallback={<FullScreenLoader />}>
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
                    <RouteBoundary>
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
                        <Route path="categorias-encerramento" element={<AdminRoute><ProjetosCategoriasEncerramento /></AdminRoute>} />
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
                      <Route path="/op/entregas/relatorios" element={<MenuGuard menuKey="op-entregas"><EntregasProfileProvider><EntregasGuard allow={["admin"]}><OpEntregasRelatorios /></EntregasGuard></EntregasProfileProvider></MenuGuard>} />
                      <Route path="/op/entregas/categorias" element={<MenuGuard menuKey="op-entregas"><EntregasProfileProvider><EntregasGuard allow={["admin"]}><OpEntregasCategorias /></EntregasGuard></EntregasProfileProvider></MenuGuard>} />
                      <Route path="/op/entregas/solicitantes" element={<MenuGuard menuKey="op-entregas"><EntregasProfileProvider><EntregasGuard allow={["admin"]}><OpEntregasSolicitantes /></EntregasGuard></EntregasProfileProvider></MenuGuard>} />
                      <Route path="/op/entregas/solicitar" element={<MenuGuard menuKey="op-entregas"><EntregasProfileProvider><EntregasGuard allow={["solicitante"]}><OpEntregasSolicitar /></EntregasGuard></EntregasProfileProvider></MenuGuard>} />
                      <Route path="/op/entregas/minhas" element={<MenuGuard menuKey="op-entregas"><EntregasProfileProvider><EntregasGuard allow={["motorista","solicitante"]}><OpEntregasMinhas /></EntregasGuard></EntregasProfileProvider></MenuGuard>} />


                      <Route path="/op/oficina/pin" element={<MenuGuard menuKey="op-oficina"><OficinaProfileProvider><OficinaPin /></OficinaProfileProvider></MenuGuard>} />
                      <Route path="/op/oficina/minhas" element={<MenuGuard menuKey="op-oficina"><OficinaProfileProvider><OficinaGuard allow={["mecanico"]}><OpOficinaMinhas /></OficinaGuard></OficinaProfileProvider></MenuGuard>} />
                      <Route path="/op/oficina/compras" element={<MenuGuard menuKey="op-oficina"><OficinaProfileProvider><OficinaGuard allow={["compras","admin"]}><OpOficinaCompras /></OficinaGuard></OficinaProfileProvider></MenuGuard>} />
                      <Route path="/op/oficina/premiacoes" element={<MenuGuard menuKey="op-oficina"><OficinaProfileProvider><OficinaGuard allow={["admin"]}><OpOficinaPremiacoes /></OficinaGuard></OficinaProfileProvider></MenuGuard>} />
                      <Route path="/op/oficina/alertas" element={<MenuGuard menuKey="op-oficina"><OficinaProfileProvider><OficinaGuard allow={["admin"]}><OpOficinaAlertas /></OficinaGuard></OficinaProfileProvider></MenuGuard>} />
                      <Route path="/op/oficina/agenda" element={<MenuGuard menuKey="op-oficina"><OficinaProfileProvider><OficinaGuard allow={["admin","mecanico"]}><OpOficinaAgenda /></OficinaGuard></OficinaProfileProvider></MenuGuard>} />
                      <Route path="/op/oficina/agendar" element={<MenuGuard menuKey="op-oficina"><OficinaProfileProvider><OficinaGuard allow={["admin","motoloc"]}><OpOficinaAgendar /></OficinaGuard></OficinaProfileProvider></MenuGuard>} />
                      <Route path="/op/oficina/finalizadas" element={<MenuGuard menuKey="op-oficina"><OficinaProfileProvider><OficinaGuard allow={["admin","motoloc"]}><OpOficinaFinalizadas /></OficinaGuard></OficinaProfileProvider></MenuGuard>} />
                      <Route path="/op/oficina/pontuacao" element={<MenuGuard menuKey="op-oficina"><OficinaProfileProvider><OficinaGuard allow={["admin"]}><OpOficinaPontuacao /></OficinaGuard></OficinaProfileProvider></MenuGuard>} />
                      <Route path="/op/oficina/meus-pontos" element={<MenuGuard menuKey="op-oficina"><OficinaProfileProvider><OficinaGuard allow={["mecanico"]}><OpOficinaMeusPontos /></OficinaGuard></OficinaProfileProvider></MenuGuard>} />
                      <Route path="/op/oficina" element={<MenuGuard menuKey="op-oficina"><OficinaProfileProvider><OficinaGuard allow={["admin"]}><OpOficina /></OficinaGuard></OficinaProfileProvider></MenuGuard>} />
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
                      <Route path="/checklists/importar" element={<MenuGuard menuKey="chk-importar"><AdminRoute><ChkImportar /></AdminRoute></MenuGuard>} />
                      <Route path="/checklists/como-funciona" element={<MenuGuard menuKey="chk-como-funciona"><ChkComoFunciona /></MenuGuard>} />
                      <Route path="/connect" element={<Connect />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    </RouteBoundary>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
          </RouteBoundary>
          </TicketModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
