import { useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ManutencaoProfileCtx } from "@/contexts/ManutencaoProfileContext";

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
  const pinCtx = useContext(ManutencaoProfileCtx);
  const [state, setState] = useState<Omit<MaintProfile, "loading" | "scoped">>({ role: "other" });
  const [loading, setLoading] = useState(true);
  const [isOperacional, setIsOperacional] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user || !profile?.organization_id) { setLoading(false); return; }
      const { data: org } = await supabase.from("organizations").select("slug").eq("id", profile.organization_id).maybeSingle();
      const isOp = org?.slug === OPERACIONAL_SLUG;
      if (cancelled) return;
      setIsOperacional(isOp);

      // Fallback: for non-operacional orgs, keep everyone as admin (current behavior).
      if (!isOp) {
        if (!cancelled) { setState({ role: "admin" }); setLoading(false); }
        return;
      }

      // Prefer PIN-selected profile (Manutenção kiosk-style login).
      const pin = pinCtx?.profile;
      if (pin) {
        if (pin.type === "admin") setState({ role: "admin" });
        else if (pin.type === "tecnico") setState({ role: "tecnico", mechanicId: pin.id, mechanicName: pin.name });
        else setState({ role: "solicitante", requesterId: pin.id, requesterName: pin.name });
        setLoading(false);
        return;
      }

      if (hasRole("admin")) {
        if (!cancelled) { setState({ role: "admin" }); setLoading(false); }
        return;
      }

      const [mech, req] = await Promise.all([
        (supabase as any).from("op_maint_technicians").select("id,name").eq("organization_id", profile.organization_id).eq("user_id", user.id).maybeSingle(),
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
  }, [user?.id, profile?.organization_id, hasRole, pinCtx?.profile?.type, pinCtx?.profile?.id]);

  return { ...state, loading, scoped: isOperacional };
}
