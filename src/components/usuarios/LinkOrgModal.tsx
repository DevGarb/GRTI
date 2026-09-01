import { useEffect, useState } from "react";
import { X, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
}

type Row = {
  organization_id: string;
  name: string;
  slug: string;
  linked: boolean;
  role: string;
  external: boolean;
};

const ROLES = [
  { value: "solicitante", label: "Colaborador" },
  { value: "tecnico", label: "Técnico" },
  { value: "desenvolvedor", label: "Desenvolvedor" },
  { value: "admin", label: "Administrador" },
];

export default function LinkOrgModal({ userId, userName, onClose }: Props) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["link-org-modal", userId],
    queryFn: async () => {
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("id, name, slug, external_url")
        .order("name");
      if (error) throw error;
      const { data: links } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", userId);
      const { data: roles } = await supabase
        .from("user_organization_roles")
        .select("organization_id, role")
        .eq("user_id", userId);
      const linkedSet = new Set((links || []).map((l: any) => l.organization_id));
      const roleMap = new Map<string, string>();
      (roles || []).forEach((r: any) => roleMap.set(r.organization_id, r.role));
      return (orgs || []).map((o: any) => ({
        organization_id: o.id,
        name: o.name,
        slug: o.slug,
        linked: linkedSet.has(o.id),
        role: roleMap.get(o.id) || "solicitante",
        external: Boolean(o.external_url),
      })) as Row[];
    },
  });

  useEffect(() => { if (data) setRows(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const original = data || [];
      for (const r of rows) {
        const orig = original.find((o) => o.organization_id === r.organization_id)!;
        if (r.linked && !orig.linked) {
          const { error: e1 } = await supabase
            .from("user_organizations")
            .insert({ user_id: userId, organization_id: r.organization_id });
          if (e1) throw e1;
          if (!r.external) {
            const { error: e2 } = await supabase
              .from("user_organization_roles")
              .insert({ user_id: userId, organization_id: r.organization_id, role: r.role as any });
            if (e2) throw e2;
          }
        } else if (!r.linked && orig.linked) {
          await supabase
            .from("user_organization_roles")
            .delete()
            .eq("user_id", userId)
            .eq("organization_id", r.organization_id)
            .neq("role", "super_admin");
          const { error } = await supabase
            .from("user_organizations")
            .delete()
            .eq("user_id", userId)
            .eq("organization_id", r.organization_id);
          if (error) throw error;
        } else if (r.linked && orig.linked && r.role !== orig.role) {
          await supabase
            .from("user_organization_roles")
            .delete()
            .eq("user_id", userId)
            .eq("organization_id", r.organization_id)
            .neq("role", "super_admin");
          const { error } = await supabase
            .from("user_organization_roles")
            .insert({ user_id: userId, organization_id: r.organization_id, role: r.role as any });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("Vínculos atualizados");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      onClose();
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  return (
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Vincular a Organizações
            </h2>
            <p className="text-sm text-muted-foreground">{userName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto">
            {rows.map((r, idx) => (
              <div key={r.organization_id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <input
                  type="checkbox"
                  checked={r.linked}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...r, linked: e.target.checked };
                    setRows(next);
                  }}
                  className="h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.slug}{r.external ? " · link externo" : ""}
                  </div>
                </div>
                {r.external ? (
                  <span className="text-[11px] text-muted-foreground">Somente visualização</span>
                ) : (
                <select
                  disabled={!r.linked}
                  value={r.role}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...r, role: e.target.value };
                    setRows(next);
                  }}
                  className="px-2 py-1.5 rounded-md border border-input bg-background text-xs disabled:opacity-50"
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-input text-sm text-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || isLoading}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {save.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Somente Super Admin pode vincular usuários a organizações diferentes da atual.
        </p>
      </div>
    </div>
  );
}
