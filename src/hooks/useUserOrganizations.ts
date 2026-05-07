import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserOrg {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export function useUserOrganizations() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<UserOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setOrgs([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: links } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id);
      const ids = (links || []).map((l: any) => l.organization_id);
      if (ids.length === 0) {
        if (!cancelled) { setOrgs([]); setLoading(false); }
        return;
      }
      const { data: orgsData } = await supabase
        .from("organizations")
        .select("id, name, slug, logo_url")
        .in("id", ids)
        .order("name");
      if (!cancelled) {
        setOrgs((orgsData || []) as UserOrg[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const switchToOrg = async (orgId: string) => {
    if (!user) return { error: new Error("not authenticated") };
    const { error } = await supabase
      .from("profiles")
      .update({ organization_id: orgId })
      .eq("user_id", user.id);
    return { error };
  };

  return { orgs, loading, switchToOrg };
}
