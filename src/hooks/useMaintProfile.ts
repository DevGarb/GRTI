import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MaintRole = "admin" | "tecnico" | "solicitante" | "other";

export interface MaintProfile {
  role: MaintRole;
  mechanicId?: string;
  mechanicName?: string;
  requesterId?: string;
  requesterName?: string;
  loading: boolean;
  /** True when the current org is the one that uses the profile split. */
  scoped: boolean;
}

const OPERACIONAL_SLUG = "cgps-operacional";

export function useMaintProfile(): MaintProfile {
  const { user, profile, hasRole } = useAuth();
  const [state, setState] = useState<Omit<MaintProfile, "loading" | "scoped">>({ role: "other" });
  const [loading, setLoading] = useState(true);

  const isOperacional = (profile as any)?.organization_slug === OPERACIONAL_SLUG;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user || !profile?.organization_id) { setLoading(false); return; }

      // Fallback: for non-operacional orgs, keep everyone as admin (current behavior).
      if (!isOperacional) {
        if (!cancelled) { setState({ role: "admin" }); setLoading(false); }
        return;
      }

      if (hasRole("admin")) {
        if (!cancelled) { setState({ role: "admin" }); setLoading(false); }
        return;
      }

      const [mech, req] = await Promise.all([
        supabase.from("op_mechanics").select("id,name").eq("organization_id", profile.organization_id).eq("user_id", user.id).maybeSingle(),
        supabase.from("op_delivery_requesters").select("id,name").eq("organization_id", profile.organization_id).eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      if (mech.data) {
        setState({ role: "tecnico", mechanicId: mech.data.id, mechanicName: mech.data.name });
      } else if (req.data) {
        setState({ role: "solicitante", requesterId: req.data.id, requesterName: req.data.name });
      } else {
        setState({ role: "other" });
      }
      setLoading(false);
    }
    run();
    return () => { cancelled = true; };
  }, [user?.id, profile?.organization_id, isOperacional, hasRole]);

  return { ...state, loading, scoped: isOperacional };
}
