import { useState } from "react";
import { Copy, Check, Bot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const mcpUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

export default function Connect() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(mcpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Conectar um assistente de IA</h1>
          <p className="text-sm text-muted-foreground">
            Use o ChatGPT ou o Claude para consultar e abrir chamados usando sua conta.
          </p>
        </div>
      </div>

      <Card className="p-5 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          URL do servidor MCP
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm bg-muted px-3 py-2 rounded-md break-all font-mono">
            {mcpUrl}
          </code>
          <Button onClick={copy} variant="outline" size="sm" className="shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="ml-2">{copied ? "Copiado" : "Copiar"}</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          O assistente vai pedir para você entrar com sua conta desta aplicação. Ele só enxerga os chamados que você já pode ver aqui.
        </p>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-semibold">ChatGPT</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/90">
          <li>
            Abra{" "}
            <a
              href="https://chatgpt.com/#settings/Connectors/Advanced"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              chatgpt.com/#settings/Connectors/Advanced
            </a>{" "}
            e ative o <strong>Developer mode</strong> (leia o aviso de risco exibido lá).
          </li>
          <li>No campo de mensagem, abra o menu <strong>"+"</strong> e ative o <strong>Developer mode</strong>.</li>
          <li>Clique em <strong>"Add sources"</strong> e depois em <strong>"Connect more"</strong>.</li>
          <li>Dê um nome ao conector e cole a URL do servidor MCP acima.</li>
          <li>Peça ao ChatGPT para usar o GRTI Helpdesk (ex.: "Liste meus chamados abertos").</li>
        </ol>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-semibold">Claude</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/90">
          <li>
            Abra{" "}
            <a
              href="https://claude.ai/customize/connectors?modal=add-custom-connector"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              claude.ai/customize/connectors
            </a>
            .
          </li>
          <li>Dê um nome ao conector e cole a URL do servidor MCP acima.</li>
          <li>Ative o conector no campo de mensagem e peça ao Claude para usar o GRTI Helpdesk.</li>
        </ol>
      </Card>
    </div>
  );
}
