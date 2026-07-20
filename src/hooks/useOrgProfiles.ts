import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OrgProfile {
  user_id: string;
  full_name: string;
  email: string | null;
  username: string | null;
}

/** Lightweight list of users belonging to the current org, for linking to mechanics/requesters. */
export function useOrgProfiles() {
  const { profile } = useAuth();
  const [items, setItems] = useState<OrgProfile[]>([]);
  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from("profiles")
      .select("user_id, full_name, email, username")
      .eq("organization_id", profile.organization_id)
      .order("full_name")
      .then(({ data }) => setItems((data || []) as OrgProfile[]));
  }, [profile?.organization_id]);
  return items;
}
