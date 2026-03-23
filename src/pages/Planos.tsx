import { useState, useEffect } from "react";
import { CreditCard, Plus, Pencil, Trash2, Building2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
}

function AdminPlanView() {
  const { profile } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!profile?.organization_id) { setLoading(false); return; }
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name, slug, plan_id")
        .eq("id", profile.organization_id)
        .single();
      if (orgData) {
        setOrg(orgData as Org);
        if (orgData.plan_id) {
          const { data: planData } = await supabase
            .from("subscription_plans")
            .select("*")
            .eq("id", orgData.plan_id)
            .single();
          if (planData) setPlan(planData as Plan);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [profile?.organization_id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plano da Empresa</h1>
          <p className="text-sm text-muted-foreground">Detalhes do plano de assinatura da sua organização</p>
        </div>
      </div>

      {!plan ? (
        <div className="p-8 rounded-xl border border-border bg-card text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum plano associado à sua organização.</p>
          <p className="text-xs text-muted-foreground mt-1">Entre em contato com o suporte para contratar um plano.</p>
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-border bg-card border-l-4 border-l-primary space-y-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
            {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
          </div>
          <div className="text-3xl font-bold text-primary">
            R$ {Number(plan.price_monthly).toFixed(2)}
            <span className="text-sm font-normal text-muted-foreground">/mês</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Check className="h-4 w-4 text-primary" /> Até {plan.max_users} usuários
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Check className="h-4 w-4 text-primary" /> Até {plan.max_tickets_month} chamados/mês
            </div>
          </div>
          {org && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Organização: <span className="font-medium text-foreground">{org.name}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Planos() {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso restrito ao super administrador.</p>
      </div>
    );
  }

  return <SuperAdminPlanos />;
}

function SuperAdminPlanos() {
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
      supabase.from("organizations").select("id, name, slug, plan_id"),
    ]);
    if (plansRes.data) setPlans(plansRes.data as Plan[]);
    if (orgsRes.data) setOrgs(orgsRes.data as Org[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setName(""); setDescription(""); setPrice("0"); setMaxUsers("5"); setMaxTickets("100"); setIsActive(true); setEditingPlan(null); setShowForm(false);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan); setName(plan.name); setDescription(plan.description || ""); setPrice(String(plan.price_monthly)); setMaxUsers(String(plan.max_users)); setMaxTickets(String(plan.max_tickets_month)); setIsActive(plan.is_active); setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome do plano é obrigatório."); return; }
    setSaving(true);
    const payload = { name: name.trim(), description: description.trim() || null, price_monthly: parseFloat(price) || 0, max_users: parseInt(maxUsers) || 5, max_tickets_month: parseInt(maxTickets) || 100, is_active: isActive };
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
    if (!confirm("Tem certeza que deseja excluir este plano?")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) toast.error("Erro: " + error.message); else { toast.success("Plano excluído!"); fetchData(); }
  };

  const handleAssignPlan = async (orgId: string, planId: string | null) => {
    const { error } = await supabase.from("organizations").update({ plan_id: planId }).eq("id", orgId);
    if (error) toast.error("Erro: " + error.message); else { toast.success("Plano associado!"); setAssigningOrg(null); fetchData(); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Planos</h1>
            <p className="text-sm text-muted-foreground">Gerencie os planos de assinatura e associe às organizações</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Novo Plano
          </button>
        )}
      </div>

      {showForm && (
        <div className="card-elevated p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">{editingPlan ? "Editar Plano" : "Novo Plano"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nome *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Básico" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Preço Mensal (R$)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" step="0.01" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Máx. Usuários</label>
              <input type="number" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} min="1" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Máx. Chamados/Mês</label>
              <input type="number" value={maxTickets} onChange={(e) => setMaxTickets(e.target.value)} min="1" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Descrição</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Descrição do plano..." className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-input" /> Plano ativo
          </label>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">{saving ? "Salvando..." : editingPlan ? "Salvar Alterações" : "Criar Plano"}</button>
            <button onClick={resetForm} className="px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : plans.length === 0 ? (
        <div className="card-elevated p-8 text-center"><CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Nenhum plano cadastrado.</p></div>
      ) : (
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
                <div className="text-2xl font-bold text-primary">R$ {Number(plan.price_monthly).toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-foreground"><Check className="h-3.5 w-3.5 text-primary" />Até {plan.max_users} usuários</div>
                  <div className="flex items-center gap-2 text-foreground"><Check className="h-3.5 w-3.5 text-primary" />Até {plan.max_tickets_month} chamados/mês</div>
                </div>
                {linkedOrgs.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Organizações:</p>
                    <div className="flex flex-wrap gap-1">{linkedOrgs.map((o) => (<span key={o.id} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{o.name}</span>))}</div>
                  </div>
                )}
                {!plan.is_active && <span className="text-xs text-muted-foreground italic">Inativo</span>}
              </div>
            );
          })}
        </div>
      )}

      {orgs.length > 0 && (
        <div className="card-elevated p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Associar Planos às Organizações</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Organização</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Slug</th>
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
                      <td className="py-2.5 px-3 text-muted-foreground">{org.slug}</td>
                      <td className="py-2.5 px-3">
                        {isAssigning ? (
                          <select defaultValue={org.plan_id || ""} onChange={(e) => handleAssignPlan(org.id, e.target.value || null)} className="px-2 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground">
                            <option value="">Sem plano</option>
                            {plans.filter((p) => p.is_active).map((p) => (<option key={p.id} value={p.id}>{p.name} — R$ {Number(p.price_monthly).toFixed(2)}</option>))}
                          </select>
                        ) : currentPlan ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{currentPlan.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem plano</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {!isAssigning && (<button onClick={() => setAssigningOrg(org)} className="text-xs px-3 py-1.5 rounded-lg border border-input hover:bg-muted transition-colors text-foreground">Alterar Plano</button>)}
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
