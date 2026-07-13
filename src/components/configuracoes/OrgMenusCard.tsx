import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { menuItems } from "@/config/menuItems";
import { toast } from "sonner";
import { LayoutGrid, RotateCcw, CheckCheck } from "lucide-react";

type ConfigRow = { menu_key: string; enabled: boolean };

const GROUPS: { title: string; test: (key: string) => boolean }[] = [
  { title: "Checklists (GRCHECK)", test: (k) => k.startsWith("chk-") },
  { title: "Operacional (CGPS)", test: (k) => k.startsWith("op-") },
  { title: "Super Admin", test: (k) => ["super-admin", "planos", "migracao"].includes(k) },
  { title: "Geral", test: (k) => !k.startsWith("chk-") && !k.startsWith("op-") && !["super-admin", "planos", "migracao"].includes(k) },
];

export default function OrgMenusCard() {
  const { profile, isSuperAdmin, roles } = useAuth();
  const isAdmin = isSuperAdmin || roles.includes("admin");
  const orgId = profile?.organization_id;
  const [rows, setRows] = useState<Record<string, boolean>>({});
  const [hasConfig, setHasConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    supabase
      .from("organization_menu_config" as any)
      .select("menu_key, enabled")
      .eq("organization_id", orgId)
      .then(({ data, error }) => {
        if (error) { toast.error("Erro ao carregar configuração de menus"); setLoading(false); return; }
        const map: Record<string, boolean> = {};
        (data as ConfigRow[] | null)?.forEach((r) => { map[r.menu_key] = r.enabled; });
        setRows(map);
        setHasConfig((data?.length ?? 0) > 0);
        setLoading(false);
      });
  }, [orgId]);

  const grouped = useMemo(() => GROUPS.map((g) => ({
    title: g.title,
    items: menuItems.filter((m) => g.test(m.key)),
  })), []);

  if (!isAdmin || !orgId) return null;

  const isEnabled = (key: string) => hasConfig ? !!rows[key] : true;

  const setEnabled = (key: string, enabled: boolean) => {
    setRows((prev) => ({ ...prev, [key]: enabled }));
    if (!hasConfig) setHasConfig(true);
  };

  const applySave = async (nextRows: Record<string, boolean>, replaceAll: boolean) => {
    setSaving(true);
    try {
      if (replaceAll) {
        await supabase.from("organization_menu_config" as any).delete().eq("organization_id", orgId);
      }
      const payload = Object.entries(nextRows).map(([menu_key, enabled]) => ({
        organization_id: orgId, menu_key, enabled,
      }));
      if (payload.length > 0) {
        const { error } = await supabase
          .from("organization_menu_config" as any)
          .upsert(payload, { onConflict: "organization_id,menu_key" });
        if (error) throw error;
      }
      toast.success("Configuração salva. Recarregando...");
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || e));
      setSaving(false);
    }
  };

  const handleSave = () => applySave(rows, false);

  const handleReset = async () => {
    if (!confirm("Remover a configuração de menus? A organização voltará ao padrão baseado em perfis.")) return;
    setSaving(true);
    try {
      await supabase.from("organization_menu_config" as any).delete().eq("organization_id", orgId);
      toast.success("Configuração removida. Recarregando...");
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || e));
      setSaving(false);
    }
  };

  const applyPreset = (predicate: (key: string) => boolean, extras: string[] = []) => {
    const next: Record<string, boolean> = {};
    menuItems.forEach((m) => { next[m.key] = predicate(m.key) || extras.includes(m.key); });
    setRows(next);
    setHasConfig(true);
  };

  return (
    <div className="card-elevated p-5 space-y-4">
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-base font-semibold text-foreground">Menus da Organização</h2>
          <p className="text-[12px] text-muted-foreground">
            Selecione quais módulos ficam disponíveis para esta organização. Se nenhum for configurado, todos aparecem conforme o perfil do usuário.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <button onClick={() => applyPreset((k) => k.startsWith("chk-"), ["configuracoes"])} className="px-2.5 py-1.5 rounded-md border border-input hover:bg-muted">Somente Checklists</button>
        <button onClick={() => applyPreset((k) => k.startsWith("op-"), ["configuracoes","todos","usuarios","white-label","integracoes","documentacao"])} className="px-2.5 py-1.5 rounded-md border border-input hover:bg-muted">Somente Operacional</button>
        <button onClick={() => applyPreset(() => true)} className="px-2.5 py-1.5 rounded-md border border-input hover:bg-muted flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5"/>Tudo</button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => g.items.length === 0 ? null : (
            <div key={g.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{g.title}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {g.items.map((item) => {
                  const enabled = isEnabled(item.key);
                  return (
                    <label key={item.key} className="flex items-center justify-between px-3 py-2 rounded-md border border-input hover:bg-muted/40 cursor-pointer">
                      <span className="text-sm text-foreground">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setEnabled(item.key, e.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar configuração"}
        </button>
        {hasConfig && (
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted disabled:opacity-50 flex items-center gap-1.5"
          >
            <RotateCcw className="h-4 w-4"/> Restaurar padrão
          </button>
        )}
      </div>
    </div>
  );
}
