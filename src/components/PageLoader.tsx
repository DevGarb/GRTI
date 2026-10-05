import { Component, Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";

const Spinner = () => (
  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
);

export function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner />
    </div>
  );
}

class RouteErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error) {
    console.error("[RouteErrorBoundary]", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <p className="text-sm font-semibold text-foreground">Não foi possível carregar esta página</p>
          <p className="text-xs text-muted-foreground mt-1">
            Pode ser uma versão nova do sistema ou falha de conexão.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-3 w-3" /> Recarregar
        </button>
      </div>
    );
  }
}

/**
 * Fronteira para rotas carregadas com React.lazy: mostra o loader enquanto o
 * chunk baixa e captura falhas de carregamento. O erro é limpo ao navegar para
 * outra rota (sem remontar a árvore, para não perder estado de layouts).
 */
export function RouteBoundary({
  children,
  fallback = <PageLoader />,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { pathname } = useLocation();
  return (
    <RouteErrorBoundary resetKey={pathname}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </RouteErrorBoundary>
  );
}
