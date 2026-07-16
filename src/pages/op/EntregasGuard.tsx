import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useEntregasProfile } from "@/contexts/EntregasProfileContext";
import { useAuth } from "@/contexts/AuthContext";

type Allowed = "admin" | "motorista" | "solicitante";

export default function EntregasGuard({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: Allowed[]; // if omitted, any authenticated profile is allowed
}) {
  const { profile } = useEntregasProfile();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  if (!profile) {
    return <Navigate to="/op/entregas/pin" replace />;
  }
  if (allow && !allow.includes(profile.type)) {
    return <Navigate to="/op/entregas/pin" replace />;
  }
  return <>{children}</>;
}
