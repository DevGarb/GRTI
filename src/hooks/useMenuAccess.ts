import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { menuItems, defaultAccess, type Roles } from "@/config/menuItems";

export function useMenuAccess() {
  const { user, profile, roles, isSuperAdmin, loading: authLoading } = useAuth();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setOverrides({});
      setLoading(false);
      return;
    }
    if (!profile) {
      setLoading(true);
      return;
    }
    if (!profile?.organization_id) {
      setOverrides({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("user_menu_overrides")
      .select("menu_key, granted")
      .eq("user_id", user.id)
      .eq("organization_id", profile.organization_id)
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<string, boolean> = {};
        (data || []).forEach((r: any) => { map[r.menu_key] = r.granted; });
        setOverrides(map);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [authLoading, user?.id, profile?.organization_id]);

  const r: Roles = {
    isSuperAdmin,
    isAdmin: isSuperAdmin || roles.includes("admin"),
    isTech: roles.includes("tecnico") || roles.includes("desenvolvedor"),
    isAuditor: roles.includes("auditor" as any),
  };

  const canAccess = (key: string): boolean => {
    if (r.isSuperAdmin) return true;
    if (key in overrides) return overrides[key];
    const item = menuItems.find((m) => m.key === key);
    if (!item) return true;
    return defaultAccess(item, r);
  };

  const canAccessPath = (path: string): boolean => {
    const item = menuItems.find((m) => m.path === path);
    if (!item) return true;
    return canAccess(item.key);
  };

  return { canAccess, canAccessPath, loading, overrides, roles: r };
}
