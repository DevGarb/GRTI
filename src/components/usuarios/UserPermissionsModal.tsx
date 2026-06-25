import { useEffect, useMemo, useState } from "react";
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
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);
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
      const [overridesRes, rolesRes, orgRes, appliedRes] = await Promise.all([
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
        (supabase as any)
          .from("user_applied_presets")
          .select("preset_id")
          .eq("user_id", user.user_id)
          .eq("organization_id", orgId)
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
      setAppliedPresetId(appliedRes?.data?.preset_id || null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user.user_id, orgId]);

  const setState = (key: string, s: State) => {
    setStates((prev) => ({ ...prev, [key]: s }));
  };

  const { presets } = usePermissionPresets();

  const appliedPreset = useMemo(
    () => presets.find((p) => p.id === appliedPresetId) || null,
    [presets, appliedPresetId]
  );

  const overridesEqual = (
    a: Record<string, State>,
    b: Record<string, State | "grant" | "block">
  ) => {
    const cleanA = Object.fromEntries(Object.entries(a).filter(([, v]) => v !== "default"));
    const keys = new Set([...Object.keys(cleanA), ...Object.keys(b)]);
    for (const k of keys) {
      if ((cleanA as any)[k] !== (b as any)[k]) return false;
    }
    return true;
  };

  const isCustomized = useMemo(() => {
    if (!appliedPreset) return false;
    return !overridesEqual(states, appliedPreset.overrides as any);
  }, [states, appliedPreset]);

  const statusBadge = () => {
    if (loading) return null;
    if (appliedPreset && !isCustomized) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          Padrão atual: {appliedPreset.name}
        </span>
      );
    }
    if (appliedPreset && isCustomized) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
          Personalizado (baseado em {appliedPreset.name})
        </span>
      );
    }
    const hasAny = Object.values(states).some((s) => s !== "default");
    if (hasAny) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
          Personalizado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        Padrão do sistema
      </span>
    );
  };

  const save = async () => {
    if (!orgId) {
      toast.error("Selecione uma organização ativa primeiro");
      return;
    }
    setSaving(true);
    try {
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

      // Persist applied preset relationship
      if (appliedPresetId) {
        const { error: upErr } = await (supabase as any)
          .from("user_applied_presets")
          .upsert(
            {
              user_id: user.user_id,
              organization_id: orgId,
              preset_id: appliedPresetId,
              applied_by: profile?.user_id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,organization_id" }
          );
        if (upErr) throw upErr;
      } else {
        await (supabase as any)
          .from("user_applied_presets")
          .delete()
          .eq("user_id", user.user_id)
          .eq("organization_id", orgId);
      }

      toast.success("Permissões salvas");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (id: string) => {
    if (id === "__reset__") {
      setStates({});
      setAppliedPresetId(null);
      toast.success("Permissões resetadas ao padrão do sistema. Clique em Salvar para confirmar.");
      return;
    }
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    const next: Record<string, State> = {};
    Object.entries(preset.overrides || {}).forEach(([k, v]) => {
      next[k] = v as State;
    });
    setStates(next);
    setAppliedPresetId(preset.id);
    toast.success(`Padrão "${preset.name}" aplicado. Clique em Salvar para confirmar.`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col shadow-lg">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Permissões de Menu</h2>
            <p className="text-xs text-muted-foreground truncate">
              {user.full_name}
              {orgName && <> · <span className="font-medium">{orgName}</span></>}
            </p>
            <div className="mt-1.5">{statusBadge()}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Sparkles className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    applyPreset(e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                className="pl-7 pr-2 py-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="" disabled>Aplicar padrão…</option>
                {presets.length > 0 && (
                  <optgroup label="Padrões da organização">
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                )}
                <option value="__reset__">Padrão do sistema (resetar)</option>
              </select>
            </div>
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
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
                    {(["grant", "block"] as State[]).map((s) => {
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
