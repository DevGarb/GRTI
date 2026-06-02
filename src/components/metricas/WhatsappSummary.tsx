import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  message: string;
  onSendNow?: () => void | Promise<void>;
  sending?: boolean;
  webhookConfigured?: boolean;
}

export function WhatsappSummary({ message, onSendNow, sending, webhookConfigured }: Props) {
  const [text, setText] = useState(message);

  // Sync when message changes upstream
  if (text !== message && !text) setText(message);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text || message);
      toast.success("Resumo copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Resumo Executivo (WhatsApp)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text || message}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          className="font-mono text-xs"
          placeholder="Clique em Gerar Resumo para criar o texto…"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={copy} variant="outline" disabled={!message}>
            <Copy className="h-4 w-4 mr-1" /> Copiar Resumo
          </Button>
          {onSendNow && (
            <Button onClick={() => onSendNow()} disabled={sending || !webhookConfigured}>
              <Send className="h-4 w-4 mr-1" />
              {sending ? "Enviando…" : "Enviar para Webhook"}
            </Button>
          )}
          {!webhookConfigured && (
            <p className="text-xs text-muted-foreground self-center">Configure o webhook abaixo para envio.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
