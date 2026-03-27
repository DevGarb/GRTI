import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Key,
  Plus,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Code,
  Globe,
  Shield,
} from "lucide-react";

interface ApiToken {
  id: string;
  name: string;
  token: string;
  created_by: string;
  organization_id: string | null;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface Org {
  id: string;
  name: string;
}

export default function ApiTokensTab() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [showExample, setShowExample] = useState<"curl" | "js" | null>(null);

  const baseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/api-gateway`;

  const fetchData = async () => {
    setLoading(true);
    const [tokensRes, orgsRes] = await Promise.all([
      supabase.from("api_tokens").select("*").order("created_at", { ascending: false }),
      supabase.from("organizations").select("id, name").order("name"),
    ]);
    if (tokensRes.data) setTokens(tokensRes.data as unknown as ApiToken[]);
    if (orgsRes.data) setOrgs(orgsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Informe um nome para o token.");
      return;
    }
    if (!orgId) {
      toast.error("Selecione uma organização. O token deve ser vinculado a uma organização.");
      return;
    }
    setSaving(true);
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("api_tokens").insert({
      name: name.trim(),
      token,
      created_by: user!.id,
      organization_id: orgId || null,
      expires_at: expiresAt || null,
    } as any);

    if (error) {
      toast.error("Erro ao criar token: " + error.message);
    } else {
      toast.success("Token criado com sucesso!");
      setNewlyCreatedToken(token);
      setName("");
      setOrgId("");
      setExpiresAt("");
      setShowForm(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleToggle = async (t: ApiToken) => {
    const { error } = await supabase
      .from("api_tokens")
      .update({ is_active: !t.is_active } as any)
      .eq("id", t.id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success(t.is_active ? "Token desativado" : "Token ativado");
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este token?")) return;
    const { error } = await supabase.from("api_tokens").delete().eq("id", id);
    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Token excluído");
      fetchData();
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const maskToken = (token: string) => token.substring(0, 8) + "••••••••••••••••";

  return (
    <div className="space-y-6">
      {/* Connection Info */}
      <div className="card-elevated p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Informações de Conexão</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Base URL</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm font-mono text-foreground break-all">
                {baseUrl}
              </code>
              <button
                onClick={() => copyToClipboard(baseUrl, "URL")}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Headers Obrigatórios</label>
            <div className="mt-1 px-3 py-2 rounded-lg bg-muted text-sm font-mono text-foreground space-y-1">
              <p>X-API-Token: &lt;seu_token&gt;</p>
              <p>Content-Type: application/json</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Recursos Disponíveis</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[
                "tickets", "profiles", "categories", "patrimonio",
                "preventive_maintenance", "sectors", "projects",
                "evaluations", "ticket_comments", "ticket_history", "organizations",
              ].map((r) => (
                <span key={r} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Parâmetros de Query</label>
            <div className="mt-1 px-3 py-2 rounded-lg bg-muted text-sm font-mono text-foreground space-y-1">
              <p>?resource=tickets — Recurso a acessar</p>
              <p>?id=uuid — Buscar registro específico</p>
              <p>?limit=50&offset=0 — Paginação</p>
              <p className="text-muted-foreground italic text-xs mt-1">* A organização é definida automaticamente pelo token</p>
            </div>
          </div>
        </div>

        {/* Example toggles */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowExample(showExample === "curl" ? null : "curl")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showExample === "curl" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            <Code className="h-3.5 w-3.5" /> cURL
          </button>
          <button
            onClick={() => setShowExample(showExample === "js" ? null : "js")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showExample === "js" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            <Code className="h-3.5 w-3.5" /> JavaScript
          </button>
        </div>

        {showExample === "curl" && (
          <pre className="px-3 py-2 rounded-lg bg-muted text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
{`# Listar chamados
curl -X GET "${baseUrl}?resource=tickets&limit=10" \\
  -H "X-API-Token: SEU_TOKEN"

# Criar chamado
curl -X POST "${baseUrl}?resource=tickets" \\
  -H "X-API-Token: SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Novo chamado","description":"Descrição","created_by":"user-uuid","priority":"Alta"}'

# Atualizar chamado
curl -X PATCH "${baseUrl}?resource=tickets&id=TICKET_UUID" \\
  -H "X-API-Token: SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"Em Andamento"}'`}
          </pre>
        )}

        {showExample === "js" && (
          <pre className="px-3 py-2 rounded-lg bg-muted text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
{`const API_URL = "${baseUrl}";
const API_TOKEN = "SEU_TOKEN";

// Listar chamados
const res = await fetch(\`\${API_URL}?resource=tickets&limit=10\`, {
  headers: { "X-API-Token": API_TOKEN }
});
const { data } = await res.json();

// Criar chamado
const created = await fetch(\`\${API_URL}?resource=tickets\`, {
  method: "POST",
  headers: {
    "X-API-Token": API_TOKEN,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    title: "Novo chamado",
    description: "Descrição",
    created_by: "user-uuid",
    priority: "Alta"
  })
});`}
          </pre>
        )}
      </div>

      {/* Newly created token alert */}
      {newlyCreatedToken && (
        <div className="card-elevated p-4 border-l-4 border-l-chart-2 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-chart-2" />
            <p className="text-sm font-semibold text-foreground">Token criado! Copie agora — ele não será exibido novamente.</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-sm font-mono text-foreground break-all">
              {newlyCreatedToken}
            </code>
            <button
              onClick={() => copyToClipboard(newlyCreatedToken, "Token")}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setNewlyCreatedToken(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Já copiei, fechar
          </button>
        </div>
      )}

      {/* Create token */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Tokens de API</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Novo Token
          </button>
        )}
      </div>

      {showForm && (
        <div className="card-elevated p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Criar Token</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nome *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Integração ERP"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Organização *</label>
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Selecione uma organização</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Expira em (opcional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Criando..." : "Gerar Token"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tokens list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <Key className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum token criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((t) => {
            const orgName = orgs.find((o) => o.id === t.organization_id)?.name;
            const isExpired = t.expires_at && new Date(t.expires_at) < new Date();
            return (
              <div key={t.id} className="card-elevated p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    {!t.is_active && (
                      <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-medium">
                        Inativo
                      </span>
                    )}
                    {isExpired && (
                      <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-medium">
                        Expirado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{maskToken(t.token)}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    {orgName && <span>Org: {orgName}</span>}
                    <span>Criado: {new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
                    {t.last_used_at && (
                      <span>Último uso: {new Date(t.last_used_at).toLocaleDateString("pt-BR")}</span>
                    )}
                    {t.expires_at && (
                      <span>Expira: {new Date(t.expires_at).toLocaleDateString("pt-BR")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggle(t)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                    title={t.is_active ? "Desativar" : "Ativar"}
                  >
                    {t.is_active ? <ToggleRight className="h-4 w-4 text-chart-3" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
