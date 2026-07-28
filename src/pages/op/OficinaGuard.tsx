import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useOficinaProfile } from "@/contexts/OficinaProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import type { OficinaRole } from "@/lib/oficinaRoles";

export default function OficinaGuard({ children, allow }: { children: ReactNode; allow?: OficinaRole[] }) {
  const { profile } = useOficinaProfile();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (!profile) return <Navigate to="/op/oficina/pin" replace />;
  if (allow && !allow.includes(profile.type)) return <Navigate to="/op/oficina/pin" replace />;
  return <>{children}</>;
}
