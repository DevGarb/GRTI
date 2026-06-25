import { useEffect, useState } from "react";
import { X, Check, Ban, Minus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { menuItems, defaultAccess, type Roles } from "@/config/menuItems";
import { toast } from "sonner";
import { usePermissionPresets } from "@/hooks/usePermissionPresets";

type State = "default" | "grant" | "block";

interface Props {
  user: { user_id: string; full_name: string; roles: string[] };
  onClose: () => void;
}

export default function UserPermissionsModal({ user, onClose }: Props) {
  const { profile, isSuperAdmin } = useAuth();
  const [states, setStates] = useState<Record<string, State>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState<string>("");
  const [orgRoles, setOrgRoles] = useState<string[]>([]);
  const orgId = profile?.organization_id || null;

  const userRoles: Roles = {
    isSuperAdmin: user.roles.includes("super_admin"),
    isAdmin: orgRoles.includes("admin"),
    isTech: orgRoles.includes("tecnico") || orgRoles.includes("desenvolvedor"),
    isAuditor: orgRoles.includes("auditor"),
  };

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [overridesRes, rolesRes, orgRes] = await Promise.all([
        supabase
          .from("user_menu_overrides")
          .select("menu_key, granted")
          .eq("user_id", user.user_id)
          .eq("organization_id", orgId),
        supabase
          .from("user_organization_roles")
          .select("role")
          .eq("user_id", user.user_id)
          .eq("organization_id", orgId),
        supabase
          .from("organizations")
          .select("name")
          .eq("id", orgId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const map: Record<string, State> = {};
      (overridesRes.data || []).forEach((r: any) => {
        map[r.menu_key] = r.granted ? "grant" : "block";
      });
      setStates(map);
      setOrgRoles((rolesRes.data || []).map((r: any) => r.role));
      setOrgName(orgRes.data?.name || "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user.user_id, orgId]);

  const setState = (key: string, s: State) => {
    setStates((prev) => ({ ...prev, [key]: s }));
  };

  const save = async () => {
    if (!orgId) {
      toast.error("Selecione uma organização ativa primeiro");
      return;
    }
    setSaving(true);
    try {
      // Delete only this org's overrides for this user, then re-insert non-default
      const { error: delErr } = await supabase
        .from("user_menu_overrides")
        .delete()
        .eq("user_id", user.user_id)
        .eq("organization_id", orgId);
      if (delErr) throw delErr;

      const rows = Object.entries(states)
        .filter(([, s]) => s !== "default")
        .map(([menu_key, s]) => ({
          user_id: user.user_id,
          menu_key,
          granted: s === "grant",
          organization_id: orgId,
          created_by: profile?.user_id,
        }));

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("user_menu_overrides").insert(rows);
        if (insErr) throw insErr;
      }
      toast.success("Permissões salvas");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">Permissões de Menu</h2>
            <p className="text-xs text-muted-foreground">
              {user.full_name}
              {orgName && <> · <span className="font-medium">{orgName}</span></>}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-1">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : (
            menuItems.map((item) => {
              const def = defaultAccess(item, userRoles);
              const current: State = states[item.key] || "default";
              const disabled = item.superAdminOnly && !isSuperAdmin;
              return (
                <div key={item.key} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Padrão: {def ? "Liberado" : "Bloqueado"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {(["default", "grant", "block"] as State[]).map((s) => {
                      const labels = { default: "Padrão", grant: "Liberar", block: "Bloquear" };
                      const Icons = { default: Minus, grant: Check, block: Ban };
                      const Icon = Icons[s];
                      const active = current === s;
                      const reflectsDefault =
                        current === "default" && ((s === "grant" && def) || (s === "block" && !def));
                      const colors = {
                        default: active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
                        grant: active
                          ? "bg-emerald-500 text-white"
                          : reflectsDefault
                          ? "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30"
                          : "text-muted-foreground hover:bg-emerald-500/10",
                        block: active
                          ? "bg-red-500 text-white"
                          : reflectsDefault
                          ? "bg-red-500/15 text-red-600 ring-1 ring-red-500/30"
                          : "text-muted-foreground hover:bg-red-500/10",
                      };
                      return (
                        <button
                          key={s}
                          disabled={disabled}
                          onClick={() => setState(item.key, s)}
                          className={`text-[11px] px-2 py-1 rounded-md flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${colors[s]}`}
                        >
                          <Icon className="h-3 w-3" />
                          {labels[s]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
