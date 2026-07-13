import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { menuItems, defaultAccess, type Roles } from "@/config/menuItems";

export function useMenuAccess() {
  const { user, profile, roles, isSuperAdmin, loading: authLoading } = useAuth();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [orgConfig, setOrgConfig] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setOverrides({});
      setOrgConfig(null);
      setLoading(false);
      return;
    }
    if (!profile) {
      setLoading(true);
      return;
    }
    if (!profile?.organization_id) {
      setOverrides({});
      setOrgConfig(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase
        .from("user_menu_overrides")
        .select("menu_key, granted")
        .eq("user_id", user.id)
        .eq("organization_id", profile.organization_id),
      supabase
        .from("organization_menu_config" as any)
        .select("menu_key, enabled")
        .eq("organization_id", profile.organization_id),
    ]).then(([overridesRes, configRes]) => {
      if (cancelled) return;
      const oMap: Record<string, boolean> = {};
      (overridesRes.data || []).forEach((r: any) => { oMap[r.menu_key] = r.granted; });
      setOverrides(oMap);
      const cfgRows = (configRes.data || []) as any[];
      if (cfgRows.length === 0) {
        setOrgConfig(null);
      } else {
        const cMap: Record<string, boolean> = {};
        cfgRows.forEach((r) => { cMap[r.menu_key] = r.enabled; });
        setOrgConfig(cMap);
      }
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
    // Super admin bypasses everything EXCEPT explicit org whitelist restriction,
    // so navigating into an org that disabled a module still blocks it.
    if (orgConfig !== null && orgConfig[key] !== true) return false;
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

  const firstAccessiblePath = (): string => {
    for (const item of menuItems) {
      if (canAccess(item.key)) return item.path;
    }
    return "/configuracoes";
  };

  return { canAccess, canAccessPath, firstAccessiblePath, loading, overrides, orgConfig, roles: r };
}
