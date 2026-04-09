import { useState, useEffect } from "react";
import { MessageSquare, Save, TestTube, Wifi, WifiOff, Webhook, Plus, Trash2, Eye, EyeOff, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useWebhooks, useCreateWebhook, useUpdateWebhook, useDeleteWebhook, WEBHOOK_EVENTS } from "@/hooks/useWebhooks";

export default function Integracoes() {
  const { profile, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const orgId = profile?.organization_id;

  // UAZAPI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [notifyOnAssign, setNotifyOnAssign] = useState(true);
  const [notifyOnResolve, setNotifyOnResolve] = useState(true);

  // Webhooks state
  const { data: webhooks = [], isLoading: webhooksLoading } = useWebhooks();
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [whName, setWhName] = useState("");
  const [whUrl, setWhUrl] = useState("");
  const [whSecret, setWhSecret] = useState("");
  const [whEvents, setWhEvents] = useState<string[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    supabase
      .from("organization_integrations")
      .select("*")
      .eq("organization_id", orgId)
      .eq("integration_type", "uazapi")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setIntegrationId(data.id);
          setApiUrl(data.api_url || "");
          setApiToken(data.api_token || "");
          setInstanceId(data.instance_id || "");
          setIsActive(data.is_active);
          setNotifyOnAssign(data.notify_on_assign);
          setNotifyOnResolve(data.notify_on_resolve);
        }
        setLoading(false);
      });
  }, [orgId]);

  const handleSave = async () => {
    if (!orgId) { toast.error("Você precisa estar vinculado a uma organização."); return; }
    
    setSaving(true);
    const payload = {
      organization_id: orgId,
      integration_type: "uazapi",
      api_url: apiUrl.trim().replace(/\/$/, ""),
      api_token: apiToken.trim(),
      instance_id: instanceId.trim(),
      is_active: isActive,
      notify_on_assign: notifyOnAssign,
      notify_on_resolve: notifyOnResolve,
    };
    let error;
    if (integrationId) {
      ({ error } = await supabase.from("organization_integrations").update(payload).eq("id", integrationId));
    } else {
      const res = await supabase.from("organization_integrations").insert(payload).select().single();
      error = res.error;
      if (res.data) setIntegrationId(res.data.id);
    }
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configuração salva com sucesso!");
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke("send-whatsapp", { body: { ticket_id: "test", event_type: "assigned" } });
      if (error) throw error;
      toast.info("Teste enviado. Verifique os logs de webhook.");
    } catch (err: any) { toast.error("Erro no teste: " + (err.message || "Erro desconhecido")); }
    setTesting(false);
  };

  const handleCreateWebhook = () => {
    if (!whUrl.trim()) { toast.error("Informe a URL do webhook."); return; }
    if (whEvents.length === 0) { toast.error("Selecione ao menos um evento."); return; }
    createWebhook.mutate(
      { name: whName.trim() || "Webhook", url: whUrl.trim(), secret: whSecret.trim() || undefined, events: whEvents },
      { onSuccess: () => { setShowNewWebhook(false); setWhName(""); setWhUrl(""); setWhSecret(""); setWhEvents([]); } }
    );
  };

  const toggleWebhookEvent = (evt: string) => {
    setWhEvents((prev) => prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]);
  };

  const handleTestWebhook = async (webhookId: string) => {
    setTestingWebhookId(webhookId);
    try {
      const { data, error } = await supabase.functions.invoke("test-webhook", {
        body: { webhook_id: webhookId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Teste enviado com sucesso! Status: ${data.status_code}`);
      } else {
        toast.error(`Webhook respondeu com status ${data?.status_code || "desconhecido"}`);
      }
    } catch (err: any) {
      toast.error("Erro ao testar webhook: " + (err.message || "Erro desconhecido"));
    }
    setTestingWebhookId(null);
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
        <p className="text-sm text-muted-foreground">Apenas administradores podem configurar integrações.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
        <div className="card-elevated p-6">
          <p className="text-sm text-muted-foreground">
            Você precisa estar vinculado a uma organização para configurar integrações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* ===== WEBHOOKS SECTION ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Webhook className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
            <p className="text-sm text-muted-foreground">Cadastre URLs para receber notificações em JSON (ex: n8n)</p>
          </div>
        </div>

        {/* Webhook list */}
        {webhooksLoading ? (
          <div className="card-elevated p-6 flex items-center justify-center">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : webhooks.length === 0 && !showNewWebhook ? (
          <div className="card-elevated p-6 text-center text-sm text-muted-foreground">
            Nenhum webhook cadastrado.
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh) => (
              <div key={wh.id} className="card-elevated p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${wh.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                    <span className="text-sm font-semibold text-foreground">{wh.name || "Webhook"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestWebhook(wh.id)}
                      disabled={testingWebhookId === wh.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:opacity-80 transition-opacity disabled:opacity-50"
                      title="Enviar payload de teste"
                    >
                      {testingWebhookId === wh.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Testar
                    </button>
                    <button
                      onClick={() => updateWebhook.mutate({ id: wh.id, is_active: !wh.is_active })}
                      className={`relative w-9 h-5 rounded-full transition-colors ${wh.is_active ? "bg-primary" : "bg-muted"}`}
                    >
                      <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${wh.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <button
                      onClick={() => { if (confirm("Remover este webhook?")) deleteWebhook.mutate(wh.id); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate">{wh.url}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(wh.events || []).map((evt: string) => {
                    const label = WEBHOOK_EVENTS.find((e) => e.value === evt)?.label || evt;
                    return (
                      <span key={evt} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New webhook form */}
        {showNewWebhook ? (
          <div className="card-elevated p-5 space-y-4 border-2 border-primary/20">
            <h3 className="text-sm font-semibold text-foreground">Novo Webhook</h3>

            <div>
              <label className="text-sm font-medium text-foreground">Nome</label>
              <input
                value={whName}
                onChange={(e) => setWhName(e.target.value)}
                placeholder="Ex: n8n Produção"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">URL do Webhook *</label>
              <input
                value={whUrl}
                onChange={(e) => setWhUrl(e.target.value)}
                placeholder="https://n8n.exemplo.com/webhook/abc123"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                Secret (opcional)
                <button type="button" onClick={() => setShowSecret(!showSecret)} className="text-muted-foreground hover:text-foreground">
                  {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </label>
              <input
                type={showSecret ? "text" : "password"}
                value={whSecret}
                onChange={(e) => setWhSecret(e.target.value)}
                placeholder="Chave secreta para validação"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Eventos *</label>
              <p className="text-xs text-muted-foreground mb-2">Selecione quais eventos disparam o webhook.</p>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map((evt) => (
                  <label key={evt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whEvents.includes(evt.value)}
                      onChange={() => toggleWebhookEvent(evt.value)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">{evt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreateWebhook}
                disabled={createWebhook.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {createWebhook.isPending ? "Salvando..." : "Salvar Webhook"}
              </button>
              <button
                onClick={() => { setShowNewWebhook(false); setWhName(""); setWhUrl(""); setWhSecret(""); setWhEvents([]); }}
                className="px-5 py-2.5 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewWebhook(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Adicionar Webhook
          </button>
        )}

        {/* Webhook Info */}
        <div className="card-elevated p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Payload de exemplo</h3>
          <pre className="text-[11px] text-muted-foreground bg-muted/50 p-3 rounded-lg overflow-x-auto">
{JSON.stringify({
  event_type: "ticket_created",
  timestamp: "2026-03-15T12:00:00.000Z",
  ticket: {
    id: "uuid",
    title: "Computador não liga",
    description: "Descrição do problema...",
    status: "Aberto",
    priority: "Urgente",
    type: "Hardware",
    sector: "TI",
    rework_count: 0,
  },
  requester: { name: "João Silva", email: "joao@email.com", phone: "11999999999" },
  technician: { name: "Maria Santos", email: "maria@email.com", phone: "11988888888" },
}, null, 2)}
          </pre>
        </div>
      </div>

      {/* ===== DIVIDER ===== */}
      <div className="border-t border-border" />

      {/* ===== WHATSAPP SECTION ===== */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">WhatsApp (UAZAPI)</h2>
            <p className="text-sm text-muted-foreground">Notificações via WhatsApp para técnicos</p>
          </div>
        </div>

        {/* Status */}
        <div className="card-elevated p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isActive ? <Wifi className="h-5 w-5 text-emerald-500" /> : <WifiOff className="h-5 w-5 text-muted-foreground" />}
            <div>
              <p className="text-sm font-semibold text-foreground">{isActive ? "Integração Ativa" : "Integração Inativa"}</p>
              <p className="text-xs text-muted-foreground">{isActive ? "Notificações WhatsApp estão sendo enviadas" : "Ative para começar a enviar notificações"}</p>
            </div>
          </div>
          <button onClick={() => setIsActive(!isActive)} className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-muted"}`}>
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${isActive ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Credentials */}
        <div className="card-elevated p-5 space-y-4">
          <h3 className="text-base font-semibold text-foreground">Credenciais UAZAPI</h3>
          <div>
            <label className="text-sm font-medium text-foreground">URL da API</label>
            <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.uazapi.com" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Token de Autenticação</label>
            <input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder="Seu token UAZAPI" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">ID da Instância</label>
            <input value={instanceId} onChange={(e) => setInstanceId(e.target.value)} placeholder="ID da sua instância UAZAPI" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
          </div>
        </div>

        {/* Notification Settings */}
        <div className="card-elevated p-5 space-y-4">
          <h3 className="text-base font-semibold text-foreground">Notificações</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-foreground">Técnico atribuído</p>
                <p className="text-xs text-muted-foreground">Quando um técnico é atribuído a um chamado</p>
              </div>
              <button onClick={() => setNotifyOnAssign(!notifyOnAssign)} className={`relative w-11 h-6 rounded-full transition-colors ${notifyOnAssign ? "bg-primary" : "bg-muted"}`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${notifyOnAssign ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-foreground">Chamado resolvido</p>
                <p className="text-xs text-muted-foreground">Quando um chamado é marcado como resolvido</p>
              </div>
              <button onClick={() => setNotifyOnResolve(!notifyOnResolve)} className={`relative w-11 h-6 rounded-full transition-colors ${notifyOnResolve ? "bg-primary" : "bg-muted"}`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${notifyOnResolve ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Configuração"}
          </button>
          {integrationId && (
            <button onClick={handleTest} disabled={testing || !isActive} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50">
              <TestTube className="h-4 w-4" />
              {testing ? "Testando..." : "Testar Conexão"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
