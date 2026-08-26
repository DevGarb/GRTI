// Helpers para chamar modelos ✓ da Responses API via Lovable AI Gateway.
// Sempre streaming; consome o SSE e devolve o texto final acumulado.

export interface ResponseInput {
  role: "system" | "user" | "developer" | "assistant";
  content: string;
}

export interface TextFormatJsonObject {
  type: "json_object";
}

export interface TextFormatJsonSchema {
  type: "json_schema";
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
}

export type TextFormat = TextFormatJsonObject | TextFormatJsonSchema;

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";

async function readSseText(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let completedText: string | null = null;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const evt = JSON.parse(data);
          if (evt.type === "response.output_text.delta") {
            fullText += evt.delta || "";
          } else if (evt.type === "response.completed") {
            completedText = evt.response?.output_text ?? null;
          }
        } catch {
          // ignora eventos malformados
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  return completedText || fullText;
}

export async function streamLovableResponse(opts: {
  apiKey: string;
  model: string;
  input: ResponseInput[];
  textFormat?: TextFormat;
}): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string }> {
  const body: Record<string, unknown> = {
    model: opts.model,
    input: opts.input,
    stream: true,
    store: false,
  };
  if (opts.textFormat) {
    body.text = { format: opts.textFormat };
  }

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": opts.apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: txt };
  }

  const text = await readSseText(res);
  return { ok: true, text };
}
