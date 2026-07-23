import { useMemo, useState } from "react";
import { X, Link2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  organizationId: string;
  onClose: () => void;
}

const ROLES = [
  { value: "solicitante", label: "Colaborador" },
  { value: "tecnico", label: "Técnico" },
  { value: "desenvolvedor", label: "Desenvolvedor" },
  { value: "admin", label: "Administrador" },
];

type Profile = {
  user_id: string;
  full_name: string;
  username: string | null;
  email: string | null;
  cpf: string | null;
  orgs: { name: string; slug: string }[];
};

export default function LinkExistingUserModal({ organizationId, onClose }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [defaultRole, setDefaultRole] = useState("solicitante");

  const { data, isLoading } = useQuery({
    queryKey: ["link-existing-users", organizationId],
    queryFn: async () => {
      // Users already in current org — exclude them.
      const { data: linked } = await supabase
        .from("user_organizations")
        .select("user_id")
        .eq("organization_id", organizationId);
      const linkedSet = new Set((linked || []).map((r: any) => r.user_id));

      // Paginate profiles.
      const pageSize = 1000;
      let from = 0;
      const profiles: any[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: page, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, username, email, cpf")
          .order("full_name")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const rows = page || [];
        profiles.push(...rows);
        if (rows.length < pageSize) break;
        from += pageSize;
      }
      const candidates = profiles.filter((p) => !linkedSet.has(p.user_id));
      const ids = candidates.map((p) => p.user_id);
      if (ids.length === 0) return [] as Profile[];

      // Fetch org memberships for candidates (for the chips).
      const { data: memberships } = await supabase
        .from("user_organizations")
        .select("user_id, organizations(name, slug)")
        .in("user_id", ids);
      const orgMap = new Map<string, { name: string; slug: string }[]>();
      (memberships || []).forEach((m: any) => {
        if (!m.organizations) return;
        const arr = orgMap.get(m.user_id) || [];
        arr.push({ name: m.organizations.name, slug: m.organizations.slug });
        orgMap.set(m.user_id, arr);
      });

      return candidates.map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        username: p.username,
        email: p.email,
        cpf: p.cpf,
        orgs: orgMap.get(p.user_id) || [],
      })) as Profile[];
    },
  });

  const filtered = useMemo(() => {
    const list = data || [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((p) =>
      [p.full_name, p.username, p.email, p.cpf].some((v) => (v || "").toLowerCase().includes(term))
    );
  }, [data, search]);

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const save = useMutation({
    mutationFn: async () => {
      for (const userId of selectedIds) {
        const { error: e1 } = await supabase
          .from("user_organizations")
          .insert({ user_id: userId, organization_id: organizationId });
        if (e1) throw e1;
        const { error: e2 } = await supabase
          .from("user_organization_roles")
          .insert({ user_id: userId, organization_id: organizationId, role: defaultRole as any });
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success(`${selectedIds.length} usuário(s) vinculado(s)`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      onClose();
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  return (
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Link2 className="h-5 w-5" /> Vincular Usuário Existente
            </h2>
            <p className="text-sm text-muted-foreground">
              Selecione usuários já cadastrados em outras organizações para adicioná-los aqui.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, login, e-mail ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
          </div>
          <select
            value={defaultRole}
            onChange={(e) => setDefaultRole(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            title="Papel aplicado aos usuários selecionados"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-10">
            {search ? "Nenhum usuário encontrado." : "Todos os usuários já estão vinculados a esta organização."}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto">
            {filtered.map((p) => {
              const checked = !!selected[p.user_id];
              return (
                <label
                  key={p.user_id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setSelected((s) => ({ ...s, [p.user_id]: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{p.full_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {p.username || "—"}{p.email ? ` · ${p.email}` : ""}
                    </div>
                    {p.orgs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.orgs.map((o) => (
                          <span key={o.slug} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {o.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <p className="text-[11px] text-muted-foreground">
            {selectedIds.length > 0
              ? `${selectedIds.length} selecionado(s) · papel: ${ROLES.find((r) => r.value === defaultRole)?.label}`
              : "Nenhum usuário selecionado."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-input text-sm text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || selectedIds.length === 0}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {save.isPending ? "Vinculando..." : `Vincular ${selectedIds.length || ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
