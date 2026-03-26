import { useState, useEffect } from "react";
import {
  Shield,
  Building2,
  Users,
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Check,
  Search,
  Globe,
  UserCheck,
  X,
  BarChart3,
  Ticket,
  TrendingUp,
  Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Tab = "dashboard" | "organizacoes" | "usuarios" | "planos";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  max_users: number;
  max_tickets_month: number;
  is_active: boolean;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  organization_id: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

const ROLES = ["admin", "tecnico", "solicitante"] as const;
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  tecnico: "Técnico",
  solicitante: "Solicitante",
};

export default function SuperAdmin() {
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso restrito ao super administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Super Admin</h1>
          <p className="text-sm text-muted-foreground">Gestão global de organizações, usuários e planos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit flex-wrap">
        {[
          { id: "dashboard" as Tab, label: "Dashboard", icon: BarChart3 },
          { id: "organizacoes" as Tab, label: "Organizações", icon: Building2 },
          { id: "usuarios" as Tab, label: "Usuários", icon: Users },
          { id: "planos" as Tab, label: "Planos", icon: CreditCard },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "organizacoes" && <OrganizacoesTab />}
      {tab === "usuarios" && <UsuariosTab />}
      {tab === "planos" && <PlanosTab />}
    </div>
  );
}

/* =========================================================
   DASHBOARD TAB
   ========================================================= */
function DashboardTab() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalOrgs: 0,
    totalTickets: 0,
    totalPlans: 0,
    ticketsByStatus: {} as Record<string, number>,
    ticketsByPriority: {} as Record<string, number>,
    roleBreakdown: {} as Record<string, number>,
    recentTickets: [] as { id: string; title: string; status: string; created_at: string }[],
    orgsWithoutPlan: 0,
    usersWithoutOrg: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      const [profilesRes, orgsRes, ticketsRes, plansRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, organization_id"),
        supabase.from("organizations").select("id, plan_id"),
        supabase.from("tickets").select("id, title, status, priority, created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("subscription_plans").select("id, is_active"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const profiles = profilesRes.data || [];
      const orgs = orgsRes.data || [];
      const tickets = ticketsRes.data || [];
      const plans = plansRes.data || [];
      const roles = rolesRes.data || [];

      const ticketsByStatus: Record<string, number> = {};
      const ticketsByPriority: Record<string, number> = {};
      tickets.forEach((t) => {
        ticketsByStatus[t.status] = (ticketsByStatus[t.status] || 0) + 1;
        ticketsByPriority[t.priority] = (ticketsByPriority[t.priority] || 0) + 1;
      });

      const roleBreakdown: Record<string, number> = {};
      roles.forEach((r) => {
        roleBreakdown[r.role] = (roleBreakdown[r.role] || 0) + 1;
      });

      setMetrics({
        totalUsers: profiles.length,
        totalOrgs: orgs.length,
        totalTickets: tickets.length,
        totalPlans: plans.filter((p) => p.is_active).length,
        ticketsByStatus,
        ticketsByPriority,
        roleBreakdown,
        recentTickets: tickets.slice(0, 5),
        orgsWithoutPlan: orgs.filter((o) => !o.plan_id).length,
        usersWithoutOrg: profiles.filter((p) => !p.organization_id).length,
      });
      setLoading(false);
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    Aberto: "bg-chart-1/10 text-chart-1",
    "Em Andamento": "bg-chart-2/10 text-chart-2",
    Resolvido: "bg-chart-3/10 text-chart-3",
    Fechado: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Usuários", value: metrics.totalUsers, icon: Users, color: "text-primary" },
          { label: "Organizações", value: metrics.totalOrgs, icon: Building2, color: "text-chart-2" },
          { label: "Chamados", value: metrics.totalTickets, icon: Ticket, color: "text-chart-1" },
          { label: "Planos Ativos", value: metrics.totalPlans, icon: CreditCard, color: "text-chart-3" },
        ].map((kpi) => (
          <div key={kpi.label} className="card-elevated p-5">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(metrics.orgsWithoutPlan > 0 || metrics.usersWithoutOrg > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.orgsWithoutPlan > 0 && (
            <div className="card-elevated p-4 border-l-4 border-l-destructive">
              <p className="text-sm font-medium text-foreground">
                {metrics.orgsWithoutPlan} organização(ões) sem plano associado
              </p>
              <p className="text-xs text-muted-foreground mt-1">Associe planos na aba "Planos"</p>
            </div>
          )}
          {metrics.usersWithoutOrg > 0 && (
            <div className="card-elevated p-4 border-l-4 border-l-chart-2">
              <p className="text-sm font-medium text-foreground">
                {metrics.usersWithoutOrg} usuário(s) sem organização
              </p>
              <p className="text-xs text-muted-foreground mt-1">Atribua organizações na aba "Usuários"</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tickets by Status */}
        <div className="card-elevated p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Chamados por Status</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(metrics.ticketsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[status] || "bg-muted text-muted-foreground"}`}>
                  {status}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${metrics.totalTickets ? (count / metrics.totalTickets) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(metrics.ticketsByStatus).length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nenhum chamado registrado</p>
            )}
          </div>
        </div>

        {/* Roles Breakdown */}
        <div className="card-elevated p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Usuários por Perfil</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(metrics.roleBreakdown).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{ROLE_LABELS[role] || role}</span>
                <span className="text-sm font-bold text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="card-elevated p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Chamados Recentes</h3>
        {metrics.recentTickets.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum chamado</p>
        ) : (
          <div className="space-y-2">
            {metrics.recentTickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[t.status] || "bg-muted text-muted-foreground"}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   ORGANIZAÇÕES TAB
   ========================================================= */
function OrganizacoesTab() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Org | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [orgsRes, plansRes] = await Promise.all([
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
      supabase.from("subscription_plans").select("*").order("name"),
    ]);
    if (orgsRes.data) setOrgs(orgsRes.data as Org[]);
    if (plansRes.data) setPlans(plansRes.data as Plan[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setName(""); setSlug(""); setPlanId(""); setEditing(null); setShowForm(false);
  };

  const openEdit = (org: Org) => {
    setEditing(org); setName(org.name); setSlug(org.slug); setPlanId(org.plan_id || ""); setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) { toast.error("Nome e slug são obrigatórios."); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      plan_id: planId || null,
    };
    if (editing) {
      const { error } = await supabase.from("organizations").update(payload).eq("id", editing.id);
      if (error) toast.error("Erro: " + error.message); else toast.success("Organização atualizada!");
    } else {
      const { error } = await supabase.from("organizations").insert(payload);
      if (error) toast.error("Erro: " + error.message); else toast.success("Organização criada!");
    }
    setSaving(false); resetForm(); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta organização?")) return;
    const { error } = await supabase.from("organizations").delete().eq("id", id);
    if (error) toast.error("Erro: " + error.message); else { toast.success("Organização excluída!"); fetchData(); }
  };

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar organização..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Nova Organização
          </button>
        )}
      </div>

      {showForm && (
        <div className="card-elevated p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">{editing ? "Editar Organização" : "Nova Organização"}</h2>
            <button onClick={resetForm} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nome *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da empresa"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Slug *</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="minha-empresa"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Plano</label>
              <select value={planId} onChange={(e) => setPlanId(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20">
                <option value="">Sem plano</option>
                {plans.filter((p) => p.is_active).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — R$ {Number(p.price_monthly).toFixed(2)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
            </button>
            <button onClick={resetForm}
              className="px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma organização encontrada.</p>
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Slug</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plano</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Criado em</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((org) => {
                  const plan = plans.find((p) => p.id === org.plan_id);
                  return (
                    <tr key={org.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: org.primary_color || "hsl(var(--primary))", color: "#fff" }}>
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          {org.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{org.slug}</td>
                      <td className="py-3 px-4">
                        {plan ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{plan.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{new Date(org.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(org)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDelete(org.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   USUÁRIOS TAB
   ========================================================= */
function UsuariosTab() {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterOrg, setFilterOrg] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [newOrgId, setNewOrgId] = useState("");
  const [newRole, setNewRole] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createRole, setCreateRole] = useState<string>("admin");
  const [createOrgId, setCreateOrgId] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, orgsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("organizations").select("id, name, slug, plan_id, logo_url, primary_color, created_at"),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    if (rolesRes.data) setRoles(rolesRes.data as UserRole[]);
    if (orgsRes.data) setOrgs(orgsRes.data as Org[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getUserRoles = (userId: string) => roles.filter((r) => r.user_id === userId).map((r) => r.role);

  const handleChangeOrg = async (userId: string, orgId: string | null) => {
    const { error } = await supabase.from("profiles").update({ organization_id: orgId }).eq("user_id", userId);
    if (error) toast.error("Erro: " + error.message);
    else { toast.success("Organização do usuário atualizada!"); setEditingUser(null); fetchData(); }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    const profile = profiles.find((p) => p.user_id === userId);
    const roleName = ROLE_LABELS[role] || role;
    if (!confirm(`Tem certeza que deseja alterar o perfil de "${profile?.full_name || "usuário"}" para ${roleName}?`)) {
      return;
    }

    const userCurrentRoles = roles.filter((r) => r.user_id === userId && r.role !== "super_admin");

    for (const r of userCurrentRoles) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", r.role as any);
    }

    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) toast.error("Erro: " + error.message);
    else { toast.success("Role do usuário atualizada!"); setEditingRole(null); fetchData(); }
  };

  const openEditProfile = (p: Profile) => {
    setEditingProfile(p.user_id);
    setEditName(p.full_name || "");
    setEditEmail(p.email || "");
    setEditPhone(p.phone || "");
  };

  const handleSaveProfile = async (userId: string) => {
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();
    if (!trimmedName) { toast.error("Nome é obrigatório."); return; }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { toast.error("Email inválido."); return; }

    const { error } = await supabase.from("profiles").update({
      full_name: trimmedName,
      email: trimmedEmail || null,
      phone: editPhone.trim() || null,
    }).eq("user_id", userId);

    if (error) toast.error("Erro: " + error.message);
    else { toast.success("Dados do usuário atualizados!"); setEditingProfile(null); fetchData(); }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação é irreversível.`)) return;

    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: userId },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao excluir usuário.");
    } else {
      toast.success("Usuário excluído com sucesso!");
      fetchData();
    }
  };

  const filtered = profiles.filter((p) => {
    const matchSearch = !search ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(search.toLowerCase());
    const matchOrg = !filterOrg || (filterOrg === "__none" ? !p.organization_id : p.organization_id === filterOrg);
    return matchSearch && matchOrg;
  });

  const generateUsername = (fullName: string): string => {
    const parts = fullName.trim().toLowerCase().split(/\s+/);
    if (parts.length < 2) return parts[0] || "";
    const first = parts[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const last = parts[parts.length - 1].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return `${first}.${last}`;
  };

  const handleFullNameChange = (name: string) => {
    setCreateName(name);
    setCreateUsername(generateUsername(name));
  };

  const handleCreateUser = async () => {
    if (!createName.trim() || !createUsername.trim() || !createPassword.trim()) {
      toast.error("Nome, login e senha são obrigatórios."); return;
    }
    if (createPassword.length < 6) { toast.error("Senha deve ter ao menos 6 caracteres."); return; }

    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        username: createUsername.trim(),
        password: createPassword,
        full_name: createName.trim(),
        role: createRole,
        phone: createPhone.trim() || null,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao criar usuário.");
    } else {
      if (createOrgId && data?.user?.id) {
        await supabase.from("profiles").update({ organization_id: createOrgId }).eq("user_id", data.user.id);
      }
      toast.success("Usuário criado com sucesso!");
      setShowCreateForm(false);
      setCreateName(""); setCreateUsername(""); setCreatePassword(""); setCreatePhone(""); setCreateRole("admin"); setCreateOrgId("");
      fetchData();
    }
    setCreating(false);
  };

  const resetCreateForm = () => {
    setShowCreateForm(false);
    setCreateName(""); setCreateUsername(""); setCreatePassword(""); setCreatePhone(""); setCreateRole("admin"); setCreateOrgId("");
  };

  const roleColors: Record<string, string> = {
    super_admin: "bg-destructive/10 text-destructive",
    admin: "bg-primary/10 text-primary",
    tecnico: "bg-accent text-accent-foreground",
    solicitante: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou email..."
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
          </div>
          <select value={filterOrg} onChange={(e) => setFilterOrg(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20">
            <option value="">Todas organizações</option>
            <option value="__none">Sem organização</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        {!showCreateForm && (
          <button onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Novo Usuário
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="card-elevated p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Criar Novo Usuário</h2>
            <button onClick={resetCreateForm} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nome completo *</label>
              <input value={createName} onChange={(e) => handleFullNameChange(e.target.value)} placeholder="Gabriel Porto da Silva" maxLength={100}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Login *</label>
              <input value={createUsername} onChange={(e) => setCreateUsername(e.target.value.toLowerCase().replace(/[^a-z.]/g, ""))} placeholder="gabriel.porto"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-ring/20" />
              <p className="text-[11px] text-muted-foreground mt-1">Formato: nome.sobrenome (gerado automaticamente)</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Senha *</label>
              <input value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Mínimo 6 caracteres" type="password"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Telefone</label>
              <input value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} placeholder="5585999999999"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
              <p className="text-[11px] text-muted-foreground mt-1">Formato: DDI+DDD+Número (ex: 5585999999999)</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Tipo de acesso *</label>
              <select value={createRole} onChange={(e) => setCreateRole(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20">
                <option value="solicitante">Colaborador</option>
                <option value="tecnico">Técnico (Hardware)</option>
                <option value="desenvolvedor">Desenvolvedor (Software)</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Organização</label>
              <select value={createOrgId} onChange={(e) => setCreateOrgId(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20">
                <option value="">Sem organização</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreateUser} disabled={creating}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {creating ? "Criando..." : "Criar Usuário"}
            </button>
            <button onClick={resetCreateForm}
              className="px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancelar</button>
          </div>
        </div>
      )}
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{profiles.length}</p>
          <p className="text-xs text-muted-foreground">Total Usuários</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-primary">{roles.filter((r) => r.role === "admin").length}</p>
          <p className="text-xs text-muted-foreground">Admins</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{roles.filter((r) => r.role === "tecnico").length}</p>
          <p className="text-xs text-muted-foreground">Técnicos</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{profiles.filter((p) => !p.organization_id).length}</p>
          <p className="text-xs text-muted-foreground">Sem Organização</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Usuário</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Roles</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Organização</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Telefone</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Criado em</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const userRoles = getUserRoles(p.user_id);
                  const org = orgs.find((o) => o.id === p.organization_id);
                  const isEditingOrg = editingUser === p.user_id;
                  const isEditingRoleUser = editingRole === p.user_id;
                  const isEditingProf = editingProfile === p.user_id;
                  const isSuperAdmin = userRoles.includes("super_admin");
                  const primaryRole = userRoles.find((r) => r !== "super_admin") || "solicitante";

                  return (
                    <>
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{p.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isEditingRoleUser ? (
                          <div className="flex items-center gap-2">
                            <select
                              defaultValue={primaryRole}
                              onChange={(e) => setNewRole(e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleChangeRole(p.user_id, newRole || primaryRole)}
                              className="p-1 rounded-md bg-primary text-primary-foreground"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setEditingRole(null)} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {userRoles.map((r) => (
                              <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[r] || "bg-muted text-muted-foreground"}`}>
                                {ROLE_LABELS[r] || r}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isEditingOrg ? (
                          <div className="flex items-center gap-2">
                            <select
                              defaultValue={p.organization_id || ""}
                              onChange={(e) => setNewOrgId(e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground"
                            >
                              <option value="">Sem organização</option>
                              {orgs.map((o) => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                              ))}
                            </select>
                            <button onClick={() => handleChangeOrg(p.user_id, newOrgId || null)}
                              className="p-1 rounded-md bg-primary text-primary-foreground">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setEditingUser(null)} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : org ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{org.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{p.phone || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-1">
                          {!isEditingOrg && !isEditingRoleUser && !isEditingProf && (
                            <>
                              <button
                                onClick={() => openEditProfile(p)}
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                                title="Editar dados"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {!isSuperAdmin && (
                                <>
                                  <button
                                    onClick={() => { setEditingRole(p.user_id); setNewRole(primaryRole); }}
                                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                                    title="Alterar role"
                                  >
                                    <Shield className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(p.user_id, p.full_name)}
                                    className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                                    title="Excluir usuário"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => { setEditingUser(p.user_id); setNewOrgId(p.organization_id || ""); }}
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                                title="Alterar organização"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isEditingProf && (
                      <tr key={`${p.id}-edit`} className="border-b border-border/50 bg-muted/10">
                        <td colSpan={6} className="py-3 px-4">
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="flex-1 min-w-[150px]">
                              <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                              <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100}
                                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
                            </div>
                            <div className="flex-1 min-w-[150px]">
                              <label className="text-xs font-medium text-muted-foreground">Email</label>
                              <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} maxLength={255}
                                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
                            </div>
                            <div className="min-w-[120px]">
                              <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} maxLength={20}
                                className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => handleSaveProfile(p.user_id)}
                                className="p-1.5 rounded-md bg-primary text-primary-foreground"><Check className="h-3.5 w-3.5" /></button>
                              <button onClick={() => setEditingProfile(null)}
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PLANOS TAB
   ========================================================= */
function PlanosTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [assigningOrg, setAssigningOrg] = useState<Org | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [maxUsers, setMaxUsers] = useState("5");
  const [maxTickets, setMaxTickets] = useState("100");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [plansRes, orgsRes] = await Promise.all([
      supabase.from("subscription_plans").select("*").order("price_monthly"),
      supabase.from("organizations").select("id, name, slug, plan_id, logo_url, primary_color, created_at"),
    ]);
    if (plansRes.data) setPlans(plansRes.data as Plan[]);
    if (orgsRes.data) setOrgs(orgsRes.data as Org[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setName(""); setDescription(""); setPrice("0"); setMaxUsers("5"); setMaxTickets("100");
    setIsActive(true); setEditingPlan(null); setShowForm(false);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan); setName(plan.name); setDescription(plan.description || "");
    setPrice(String(plan.price_monthly)); setMaxUsers(String(plan.max_users));
    setMaxTickets(String(plan.max_tickets_month)); setIsActive(plan.is_active); setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome do plano é obrigatório."); return; }
    setSaving(true);
    const payload = {
      name: name.trim(), description: description.trim() || null,
      price_monthly: parseFloat(price) || 0, max_users: parseInt(maxUsers) || 5,
      max_tickets_month: parseInt(maxTickets) || 100, is_active: isActive,
    };
    if (editingPlan) {
      const { error } = await supabase.from("subscription_plans").update(payload).eq("id", editingPlan.id);
      if (error) toast.error("Erro: " + error.message); else toast.success("Plano atualizado!");
    } else {
      const { error } = await supabase.from("subscription_plans").insert(payload);
      if (error) toast.error("Erro: " + error.message); else toast.success("Plano criado!");
    }
    setSaving(false); resetForm(); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) toast.error("Erro: " + error.message); else { toast.success("Plano excluído!"); fetchData(); }
  };

  const handleAssignPlan = async (orgId: string, planId: string | null) => {
    const { error } = await supabase.from("organizations").update({ plan_id: planId }).eq("id", orgId);
    if (error) toast.error("Erro: " + error.message);
    else { toast.success("Plano associado!"); setAssigningOrg(null); fetchData(); }
  };

  return (
    <div className="space-y-4">
      {!showForm && (
        <div className="flex justify-end">
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Novo Plano
          </button>
        </div>
      )}

      {showForm && (
        <div className="card-elevated p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">{editingPlan ? "Editar Plano" : "Novo Plano"}</h2>
            <button onClick={resetForm} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nome *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Básico"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Preço Mensal (R$)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="0.01"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Máx. Usuários</label>
              <input type="number" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} min="1"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Máx. Chamados/Mês</label>
              <input type="number" value={maxTickets} onChange={(e) => setMaxTickets(e.target.value)} min="1"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Descrição..."
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-input" />
            Plano ativo
          </label>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Salvando..." : editingPlan ? "Salvar" : "Criar"}
            </button>
            <button onClick={resetForm} className="px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const linkedOrgs = orgs.filter((o) => o.plan_id === plan.id);
              return (
                <div key={plan.id} className={`card-elevated p-5 space-y-3 border-l-4 ${plan.is_active ? "border-l-primary" : "border-l-muted-foreground/30 opacity-60"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(plan)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(plan.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    R$ {Number(plan.price_monthly).toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/mês</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-foreground"><Check className="h-3.5 w-3.5 text-primary" /> Até {plan.max_users} usuários</div>
                    <div className="flex items-center gap-2 text-foreground"><Check className="h-3.5 w-3.5 text-primary" /> Até {plan.max_tickets_month} chamados/mês</div>
                  </div>
                  {linkedOrgs.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Organizações:</p>
                      <div className="flex flex-wrap gap-1">
                        {linkedOrgs.map((o) => (
                          <span key={o.id} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{o.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {orgs.length > 0 && (
            <div className="card-elevated p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">Associar Planos</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Organização</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Plano Atual</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((org) => {
                      const currentPlan = plans.find((p) => p.id === org.plan_id);
                      const isAssigning = assigningOrg?.id === org.id;
                      return (
                        <tr key={org.id} className="border-b border-border/50">
                          <td className="py-2.5 px-3 font-medium text-foreground">{org.name}</td>
                          <td className="py-2.5 px-3">
                            {isAssigning ? (
                              <select defaultValue={org.plan_id || ""} onChange={(e) => handleAssignPlan(org.id, e.target.value || null)}
                                className="px-2 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground">
                                <option value="">Sem plano</option>
                                {plans.filter((p) => p.is_active).map((p) => (
                                  <option key={p.id} value={p.id}>{p.name} — R$ {Number(p.price_monthly).toFixed(2)}</option>
                                ))}
                              </select>
                            ) : currentPlan ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{currentPlan.name}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {!isAssigning && (
                              <button onClick={() => setAssigningOrg(org)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-input hover:bg-muted transition-colors text-foreground">
                                Alterar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
