import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useManutencaoProfile } from "@/contexts/ManutencaoProfileContext";
import { useAuth } from "@/contexts/AuthContext";

export default function ManutencaoGuard({ children }: { children: ReactNode }) {
  const { profile } = useManutencaoProfile();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (!profile) return <Navigate to="/op/manutencao/pin" replace />;
  return <>{children}</>;
}
