import { useState } from "react";
import { Users, Shield, Search, UserPlus, ChevronDown, ChevronRight, Pencil, X, User, Crown, FileUp, Download, Code } from "lucide-react";
import ImportUsersModal from "@/components/usuarios/ImportUsersModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProfileWithRoles {
  user_id: string;
  full_name: string;
  email: string | null;
  username: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  tecnico: "Técnico (Hardware)",
  desenvolvedor: "Desenvolvedor (Software)",
  solicitante: "Colaborador",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-amber-500 text-white",
  admin: "bg-red-500 text-white",
  tecnico: "bg-primary text-primary-foreground",
  desenvolvedor: "bg-blue-500 text-white",
  solicitante: "text-muted-foreground",
};

const roleGroupOrder = ["super_admin", "admin", "tecnico", "desenvolvedor", "solicitante"];
const roleGroupLabels: Record<string, string> = {
  super_admin: "Super Administrador",
  admin: "Administradores",
  tecnico: "Técnicos (Hardware)",
  desenvolvedor: "Desenvolvedores (Software)",
  solicitante: "Colaboradores",
};
const roleGroupIcons: Record<string, typeof Users> = {
  super_admin: Crown,
  admin: Shield,
  tecnico: Users,
  desenvolvedor: Code,
  solicitante: User,
};

function generateUsername(fullName: string): string {
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return parts[0] || "";
  const first = parts[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const last = parts[parts.length - 1].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return `${first}.${last}`;
}

export default function Usuarios() {
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(roleGroupOrder));
  const [editingUser, setEditingUser] = useState<ProfileWithRoles | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "solicitante", password: "", phone: "" });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: "", username: "", password: "", role: "solicitante", phone: "" });
  const { hasRole, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = hasRole("admin");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone, avatar_url, created_at, username")
        .order("full_name");
      if (error) throw error;

      const userIds = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map<string, string[]>();
      (roles || []).forEach((r) => {
        const arr = roleMap.get(r.user_id) || [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });

      return profiles.map((p) => ({
        ...p,
        roles: roleMap.get(p.user_id) || ["solicitante"],
      })) as ProfileWithRoles[];
    },
  });

  const createUser = useMutation({
    mutationFn: async (form: typeof createForm) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      
      const res = await supabase.functions.invoke("create-user", {
        body: { username: form.username, password: form.password, full_name: form.full_name, role: form.role, phone: form.phone },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreateModal(false);
      setCreateForm({ full_name: "", username: "", password: "", role: "solicitante", phone: "" });
      toast.success("Usuário criado com sucesso!");
    },
    onError: (e: Error) => toast.error("Erro ao criar: " + e.message),
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role, fullName, password, phone }: { userId: string; role: string; fullName: string; password?: string; phone?: string }) => {
      await supabase.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("user_id", userId);
      await supabase.from("user_roles").delete().eq("user_id", userId).neq("role", "super_admin");
      if (role !== "super_admin") {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
      toast.success("Usuário atualizado!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.username || "").toLowerCase().includes(search.toLowerCase())
  );

  const grouped = roleGroupOrder.reduce<Record<string, ProfileWithRoles[]>>((acc, role) => {
    acc[role] = filtered.filter((u) => u.roles.includes(role));
    return acc;
  }, {});
  const assignedIds = new Set(Object.values(grouped).flat().map((u) => u.user_id));
  const unassigned = filtered.filter((u) => !assignedIds.has(u.user_id));
  grouped.solicitante = [...(grouped.solicitante || []), ...unassigned];

  const toggleGroup = (role: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });
  };

  const isSuperAdminUser = (user: ProfileWithRoles) => user.roles.includes("super_admin");

  const exportCSV = () => {
    const header = "Nome,Login,Tipo,Criado em\n";
    const rows = users.map((u) => {
      const role = roleLabels[u.roles[0]] || u.roles[0] || "Colaborador";
      const date = new Date(u.created_at).toLocaleDateString("pt-BR");
      return `"${u.full_name}","${u.username || "—"}","${role}","${date}"`;
    });
    const csv = header + rows.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "usuarios.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lista exportada com sucesso!");
  };

  const openEdit = (user: ProfileWithRoles) => {
    if (isSuperAdminUser(user) && !isSuperAdmin) {
      toast.error("Apenas o Super Admin pode editar este usuário.");
      return;
    }
    setEditingUser(user);
    setEditForm({ full_name: user.full_name, role: user.roles[0] || "solicitante", password: "" });
  };

  const handleFullNameChange = (name: string) => {
    setCreateForm((prev) => ({
      ...prev,
      full_name: name,
      username: generateUsername(name),
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <FileUp className="h-4 w-4" />
              Importar
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <UserPlus className="h-4 w-4" />
              Novo Usuário
            </button>
          </div>
        )}
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome ou login..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {isLoading ? (
        <div className="card-elevated p-12 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {roleGroupOrder.map((role) => {
            const groupUsers = grouped[role] || [];
            if (groupUsers.length === 0) return null;
            const isExpanded = expandedGroups.has(role);
            const GroupIcon = roleGroupIcons[role];

            return (
              <div key={role} className="card-elevated overflow-hidden">
                <button
                  onClick={() => toggleGroup(role)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                >
                  <GroupIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{roleGroupLabels[role]}</span>
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                    {groupUsers.length}
                  </span>
                  <div className="ml-auto">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {groupUsers.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${isSuperAdminUser(user) ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"}`}>
                          {isSuperAdminUser(user) ? (
                            <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-foreground block">
                            {user.full_name.toUpperCase()}
                            {isSuperAdminUser(user) && (
                              <span className="ml-2 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                (Protegido)
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {user.username ? user.username.toUpperCase() : "—"}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${roleColors[role]}`}>
                          {roleLabels[role]}
                        </span>
                        <span className="text-[11px] text-muted-foreground hidden sm:block">
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </span>
                        {isAdmin && !isSuperAdminUser(user) && (
                          <button
                            onClick={() => openEdit(user)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isSuperAdmin && isSuperAdminUser(user) && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            Não editável
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Editar Usuário</h2>
                <p className="text-sm text-muted-foreground">Atualize as informações.</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Nome completo</label>
                <input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Tipo de acesso</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
                >
                  <option value="solicitante">Colaborador</option>
                  <option value="tecnico">Técnico (Hardware)</option>
                  <option value="desenvolvedor">Desenvolvedor (Software)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Nova Senha (deixe vazio para manter)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Login</label>
                <div className="mt-1.5 px-3 py-2.5 rounded-lg border border-input bg-muted text-sm text-muted-foreground uppercase">
                  {editingUser.username || "—"}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  updateRole.mutate({
                    userId: editingUser.user_id,
                    role: editForm.role,
                    fullName: editForm.full_name,
                    password: editForm.password || undefined,
                  })
                }
                disabled={updateRole.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {updateRole.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Novo Usuário</h2>
                <p className="text-sm text-muted-foreground">Preencha os dados para criar um novo usuário.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Nome completo *</label>
                <input
                  value={createForm.full_name}
                  onChange={(e) => handleFullNameChange(e.target.value)}
                  placeholder="Gabriel Porto da Silva"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Login *</label>
                <input
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.toLowerCase().replace(/[^a-z.]/g, "") })}
                  placeholder="gabriel.porto"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Formato: nome.sobrenome (gerado automaticamente)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Senha *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Tipo de acesso *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
                >
                  <option value="solicitante">Colaborador</option>
                  <option value="tecnico">Técnico (Hardware)</option>
                  <option value="desenvolvedor">Desenvolvedor (Software)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => createUser.mutate(createForm)}
                disabled={createUser.isPending || !createForm.username || !createForm.password || !createForm.full_name}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {createUser.isPending ? "Criando..." : "Criar Usuário"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportUsersModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
      />
    </div>
  );
}
