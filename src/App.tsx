import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Chamados from "@/pages/Chamados";
import Preventivas from "@/pages/Preventivas";
import Patrimonio from "@/pages/Patrimonio";
import Projetos from "@/pages/Projetos";
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
            <Route path="/asset/:id" element={<AssetPublicView />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/chamados" element={<Chamados />} />
                      <Route path="/usuarios" element={<Usuarios />} />
                      <Route path="/avaliacoes" element={<Avaliacoes />} />
                      <Route path="/metas" element={<MetasTecnicos />} />
                      <Route path="/historico" element={<Historico />} />
                      <Route path="/auditoria" element={<Auditoria />} />
                      <Route path="/categorias" element={<Categorias />} />
                      <Route path="/webhook-logs" element={<WebhookLogs />} />
                      <Route path="/preventivas" element={<Preventivas />} />
                      <Route path="/patrimonio" element={<Patrimonio />} />
                      <Route path="/projetos" element={<Projetos />} />
                      <Route path="/configuracoes" element={<Configuracoes />} />
                      <Route path="/white-label" element={<WhiteLabel />} />
                      <Route path="/integracoes" element={<Integracoes />} />
                      <Route path="/planos" element={<Planos />} />
                      <Route path="/super-admin" element={<SuperAdmin />} />
                      <Route path="/migracao" element={<Migracao />} />
                      <Route path="/documentacao" element={<Documentacao />} />
                      <Route path="/setores" element={<Setores />} />
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
