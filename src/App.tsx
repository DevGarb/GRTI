import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Chamados from "@/pages/Chamados";
import ChamadosAbertos from "@/pages/ChamadosAbertos";
import Preventivas from "@/pages/Preventivas";
import Patrimonio from "@/pages/Patrimonio";
import Projetos from "@/pages/Projetos";
import ProjetoDetalhe from "@/pages/ProjetoDetalhe";
import Configuracoes from "@/pages/Configuracoes";
import Login from "@/pages/Login";
import WhiteLabel from "@/pages/WhiteLabel";
import Usuarios from "@/pages/Usuarios";
import Categorias from "@/pages/Categorias";
import Historico from "@/pages/Historico";
import Auditoria from "@/pages/Auditoria";

import Avaliacoes from "@/pages/Avaliacoes";
import MetasTecnicos from "@/pages/MetasTecnicos";
import WebhookLogs from "@/pages/WebhookLogs";
import Planos from "@/pages/Planos";
import Integracoes from "@/pages/Integracoes";
import SuperAdmin from "@/pages/SuperAdmin";
import Migracao from "@/pages/Migracao";
import Documentacao from "@/pages/Documentacao";
import Setores from "@/pages/Setores";
import AssetPublicView from "@/pages/AssetPublicView";
import Todos from "@/pages/Todos";
import EscolherOrganizacao from "@/pages/EscolherOrganizacao";
import OpCadastros from "@/pages/OpCadastros";
import OpEntregas from "@/pages/OpEntregas";
import OpOficina from "@/pages/OpOficina";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
  const { canAccess, loading } = useMenuAccess();
  if (loading) return null;
  if (!canAccess(menuKey)) return <Navigate to="/chamados" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/escolher-organizacao" element={<ProtectedRoute><EscolherOrganizacao /></ProtectedRoute>} />
            <Route path="/asset/:id" element={<AssetPublicView />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<MenuGuard menuKey="dashboard"><AdminRoute><Dashboard /></AdminRoute></MenuGuard>} />
                      <Route path="/chamados" element={<MenuGuard menuKey="chamados"><Chamados /></MenuGuard>} />
                      <Route path="/chamados-abertos" element={<MenuGuard menuKey="chamados-abertos"><ChamadosAbertos /></MenuGuard>} />
                      <Route path="/todos" element={<MenuGuard menuKey="todos"><Todos /></MenuGuard>} />
                      <Route path="/usuarios" element={<MenuGuard menuKey="usuarios"><AdminRoute><Usuarios /></AdminRoute></MenuGuard>} />
                      <Route path="/avaliacoes" element={<MenuGuard menuKey="avaliacoes"><AdminRoute><Avaliacoes /></AdminRoute></MenuGuard>} />
                      <Route path="/metas" element={<MenuGuard menuKey="metas"><MetasTecnicos /></MenuGuard>} />
                      <Route path="/historico" element={<MenuGuard menuKey="historico"><AdminRoute><Historico /></AdminRoute></MenuGuard>} />
                      <Route path="/auditoria" element={<MenuGuard menuKey="auditoria"><AdminRoute><Auditoria /></AdminRoute></MenuGuard>} />

                      <Route path="/categorias" element={<MenuGuard menuKey="categorias"><AdminRoute><Categorias /></AdminRoute></MenuGuard>} />
                      <Route path="/webhook-logs" element={<MenuGuard menuKey="webhook-logs"><AdminRoute><WebhookLogs /></AdminRoute></MenuGuard>} />
                      <Route path="/preventivas" element={<MenuGuard menuKey="preventivas"><Preventivas /></MenuGuard>} />
                      <Route path="/patrimonio" element={<MenuGuard menuKey="patrimonio"><AdminRoute><Patrimonio /></AdminRoute></MenuGuard>} />
                      <Route path="/projetos" element={<MenuGuard menuKey="projetos"><AdminRoute><Projetos /></AdminRoute></MenuGuard>} />
                      <Route path="/projetos/:id" element={<MenuGuard menuKey="projetos"><AdminRoute><ProjetoDetalhe /></AdminRoute></MenuGuard>} />
                      <Route path="/configuracoes" element={<MenuGuard menuKey="configuracoes"><Configuracoes /></MenuGuard>} />
                      <Route path="/white-label" element={<MenuGuard menuKey="white-label"><AdminRoute><WhiteLabel /></AdminRoute></MenuGuard>} />
                      <Route path="/integracoes" element={<MenuGuard menuKey="integracoes"><AdminRoute><Integracoes /></AdminRoute></MenuGuard>} />
                      <Route path="/planos" element={<MenuGuard menuKey="planos"><AdminRoute><Planos /></AdminRoute></MenuGuard>} />
                      <Route path="/super-admin" element={<MenuGuard menuKey="super-admin"><AdminRoute><SuperAdmin /></AdminRoute></MenuGuard>} />
                      <Route path="/migracao" element={<MenuGuard menuKey="migracao"><AdminRoute><Migracao /></AdminRoute></MenuGuard>} />
                      <Route path="/documentacao" element={<MenuGuard menuKey="documentacao"><AdminRoute><Documentacao /></AdminRoute></MenuGuard>} />
                      <Route path="/setores" element={<MenuGuard menuKey="setores"><AdminRoute><Setores /></AdminRoute></MenuGuard>} />
                      <Route path="/op/cadastros" element={<MenuGuard menuKey="op-cadastros"><OpCadastros /></MenuGuard>} />
                      <Route path="/op/entregas" element={<MenuGuard menuKey="op-entregas"><OpEntregas /></MenuGuard>} />
                      <Route path="/op/oficina" element={<MenuGuard menuKey="op-oficina"><OpOficina /></MenuGuard>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
