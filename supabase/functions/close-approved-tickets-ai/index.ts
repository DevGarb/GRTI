// Fecha chamados com status 'Aprovado' aplicando pontuação por IA.
// A IA escolhe, para cada chamado (título + descrição), a categoria de serviço
// (folha da árvore `categories`, com `score`) mais aderente ao conteúdo real do
// atendimento — não um score fixo por tipo/prioridade.
//
// action="preview": só classifica e retorna a proposta (não grava nada).
// action="apply": recebe os pares {ticket_id, category_id} (da preview, possivelmente
//   editados pelo admin) e fecha os chamados de fato: tickets.status='Fechado',
//   closed_at=now(), category_id=escolhido; insere evaluations{type:'meta', score},
//   evaluator_id = técnico responsável (fallback: admin que executou);
//   registra ticket_history (status_change + evaluated), igual ao fluxo manual.
//
// Só admin/super_admin pode chamar (checado via role do usuário autenticado).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { streamLovableResponse } from "../_shared/openaiResponses.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CategoryLeaf {
  id: string;
  path: string;
  score: number;
}

interface TicketRow {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  tratativa: string;
}

const RUBRIC = `Rubrica de pontuação por complexidade do atendimento (escolha a categoria cujo score melhor reflete o esforço REAL do chamado):
0 = chamado excluído/duplicado/improdutivo (raro; só use se for claramente isso)
1 = trivial: pedido de suprimento/peça simples (pilha, cabo, tinta), troca básica de periférico, suporte L1 rotineiro
2 = padrão: suporte a usuário, acesso/permissão, movimentação de item com defeito (headset/mouse/tela quebrado), erro simples em sistema (Kommo/Service/GoTo), onboarding/offboarding
3 = intermediário: criação/manutenção de relatório, correção de bug/fluxo em automação, formatação de máquina, verificação periódica
4 = avançado: criação de automação (Kommo/n8n), configuração de API/VPN/DNS, parametrização de sistema
5 = complexo: desenvolvimento/evolução de funcionalidade de software, integração crítica, refatoração de backend
6 a 10 = estrutural: projeto grande, reestruturação de setor, implantação de nova plataforma/IA

IMPORTANTE — como ponderar as fontes de informação de cada chamado:
- O TÍTULO e a DESCRIÇÃO DE ABERTURA refletem apenas a intenção de quem abriu o chamado, no momento da abertura.
- A TRATATIVA (comentários/notas registrados pelo técnico durante o atendimento) reflete o trabalho REALMENTE executado, e pode revelar complexidade maior (ou menor) do que a descrição de abertura sugeria — um chamado aberto como algo simples pode ter exigido diagnóstico, automação ou desenvolvimento para ser resolvido, e vice-versa.
- Dê PESO MAIOR à tratativa do que à descrição de abertura. Se a tratativa contradiz a descrição em complexidade, confie na tratativa.
- Se não houver tratativa registrada, classifique com base no título e na descrição de abertura.
Escolha sempre a categoria mais específica e semanticamente mais próxima do trabalho real do chamado — nunca a mais genérica só porque é mais fácil.`;

function corsJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function classifyBatch(
  tickets: TicketRow[],
  categories: CategoryLeaf[],
  techNames: Map<string, string>,
  apiKey: string
): Promise<Map<string, string>> {
  const catList = categories.map((c) => `${c.id} :: ${c.path} (score ${c.score})`).join("\n");
  const ticketList = tickets
    .map((t) =>
      `ID: ${t.id}\nTítulo: ${t.title}\nDescrição de abertura: ${(t.description || "(sem descrição)").slice(0, 200)}\nTratativa do atendimento (peso maior): ${t.tratativa}`
    )
    .join("\n---\n");

  const prompt = `${RUBRIC}

CATEGORIAS DISPONÍVEIS (use SOMENTE os IDs desta lista, escolha 1 por chamado):
${catList}

CHAMADOS A CLASSIFICAR:
${ticketList}

Responda APENAS um JSON no formato: {"assignments":[{"ticket_id":"...","category_id":"..."}]}
Um item por chamado, na mesma ordem. category_id deve ser exatamente um dos IDs listados acima.`;

  let aiRes;
  try {
    aiRes = await streamLovableResponse({
      apiKey,
      model: "openai/gpt-5.6-terra",
      input: [
        { role: "system", content: "Você é um classificador de chamados de helpdesk de TI. Responda apenas com o JSON pedido, sem texto extra." },
        { role: "user", content: prompt },
      ],
      textFormat: { type: "json_object" },
    });
  } catch (e) {
    console.error("Lovable AI gateway fetch failed (timeout/network)", e);
    return new Map();
  }

  if (!aiRes.ok) {
    console.error("Lovable AI gateway error", aiRes.status, aiRes.body);
    return new Map();
  }
  const content = aiRes.text;
  if (!content) return new Map();
  try {
    const parsed = JSON.parse(content);
    const arr = Array.isArray(parsed?.assignments) ? parsed.assignments : [];
    const validIds = new Set(categories.map((c) => c.id));
    const map = new Map<string, string>();
    arr.forEach((a: any) => {
      if (a?.ticket_id && a?.category_id && validIds.has(a.category_id)) {
        map.set(a.ticket_id, a.category_id);
      }
    });
    return map;
  } catch (e) {
    console.error("Failed to parse AI response", e, content);
    return new Map();
  }
}

/** Concatena os comentários mais recentes de um chamado (limite de caracteres),
 * priorizando o fim da conversa — é onde normalmente está o desfecho real do atendimento. */
function buildTratativa(comments: { content: string; is_public: boolean }[]): string {
  if (comments.length === 0) return "(sem comentários registrados durante o atendimento)";
  const CHAR_BUDGET = 400;
  const picked: string[] = [];
  let total = 0;
  for (let i = comments.length - 1; i >= 0 && total < CHAR_BUDGET; i--) {
    const c = comments[i];
    const line = `${c.is_public ? "[Público]" : "[Nota interna]"} ${c.content}`.slice(0, 300);
    picked.unshift(line);
    total += line.length;
  }
  return picked.join(" | ");
}

async function fetchTratativas(supabase: any, ticketIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ticketIds.length === 0) return map;
  const { data, error } = await supabase
    .from("ticket_comments")
    .select("ticket_id, content, is_public, created_at")
    .in("ticket_id", ticketIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const byTicket = new Map<string, { content: string; is_public: boolean }[]>();
  (data || []).forEach((c: any) => {
    const list = byTicket.get(c.ticket_id) || [];
    list.push({ content: c.content, is_public: c.is_public });
    byTicket.set(c.ticket_id, list);
  });
  ticketIds.forEach((id) => map.set(id, buildTratativa(byTicket.get(id) || [])));
  return map;
}

async function buildCategoryLeaves(supabase: any, organizationId: string): Promise<CategoryLeaf[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_id, score, is_active, organization_id")
    .or(`organization_id.eq.${organizationId},organization_id.is.null`);
  if (error) throw error;
  const all = (data || []) as { id: string; name: string; parent_id: string | null; score: number | null; is_active: boolean }[];
  const byId = new Map(all.map((c) => [c.id, c]));
  const pathOf = (c: (typeof all)[number]): string => {
    const parts = [c.name];
    let cur = c;
    while (cur.parent_id) {
      const p = byId.get(cur.parent_id);
      if (!p) break;
      parts.unshift(p.name);
      cur = p;
    }
    return parts.join(" → ");
  };
  // Só folhas de verdade: alguns nós intermediários (ex: "GoTo", "Service ERP") têm
  // score=0 preenchido por engano no cadastro mesmo tendo filhos reais — sem esse filtro
  // a IA às vezes escolhe o nó genérico em vez da categoria específica.
  const parentIds = new Set(all.map((c) => c.parent_id).filter(Boolean));
  return all
    .filter((c) => c.is_active && c.score != null && !parentIds.has(c.id))
    .map((c) => ({ id: c.id, path: pathOf(c), score: c.score! }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return corsJson({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return corsJson({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: globalRoles }, { data: orgRoles }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", caller.id),
      admin.from("user_organization_roles").select("role").eq("user_id", caller.id),
    ]);
    const allRoles = [
      ...(globalRoles || []).map((r: any) => r.role),
      ...(orgRoles || []).map((r: any) => r.role),
    ];
    if (!allRoles.some((r) => r === "admin" || r === "super_admin")) {
      return corsJson({ error: "Forbidden: admin role required" }, 403);
    }

    const body = await req.json();
    const organizationId: string = body.organization_id;
    const action: string = body.action;
    if (!organizationId || !action) {
      return corsJson({ error: "organization_id e action são obrigatórios" }, 400);
    }

    const apiKey = Deno.env.get("OPEN_AI") ?? Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return corsJson({ error: "IA não configurada (OPEN_AI secret ausente)." }, 500);

    if (action === "preview") {
      // Se ticket_ids for enviado, classifica exatamente esses chamados (qualquer status —
      // usado para reavaliar chamados já fechados com o critério atualizado). Sem ticket_ids,
      // mantém o comportamento padrão: todos os 'Aprovado' da organização.
      const ticketIdsFilter: string[] | undefined =
        Array.isArray(body.ticket_ids) && body.ticket_ids.length > 0 ? body.ticket_ids : undefined;

      let ticketsQuery = admin
        .from("tickets")
        .select("id, title, description, assigned_to")
        .eq("organization_id", organizationId);
      ticketsQuery = ticketIdsFilter ? ticketsQuery.in("id", ticketIdsFilter) : ticketsQuery.eq("status", "Aprovado");
      const { data: tickets, error: tErr } = await ticketsQuery;
      if (tErr) throw tErr;

      const rawList = (tickets || []) as Omit<TicketRow, "tratativa">[];
      if (rawList.length === 0) {
        return corsJson({ proposals: [], totalTickets: 0, totalPoints: 0, byTechnician: [] });
      }

      const tratativaMap = await fetchTratativas(admin, rawList.map((t) => t.id));
      const list: TicketRow[] = rawList.map((t) => ({ ...t, tratativa: tratativaMap.get(t.id) || "(sem comentários registrados durante o atendimento)" }));

      const categories = await buildCategoryLeaves(admin, organizationId);
      if (categories.length === 0) {
        return corsJson({ error: "Nenhuma categoria com pontuação cadastrada para esta organização." }, 400);
      }



      const techIds = [...new Set(list.map((t) => t.assigned_to).filter(Boolean))] as string[];
      const techNames = new Map<string, string>();
      if (techIds.length > 0) {
        const { data: profs } = await admin.from("profiles").select("user_id, full_name").in("user_id", techIds);
        (profs || []).forEach((p: any) => techNames.set(p.user_id, p.full_name));
      }

      const BATCH = 8;
      const CONCURRENCY = 5;
      const chunks: TicketRow[][] = [];
      for (let i = 0; i < list.length; i += BATCH) chunks.push(list.slice(i, i + BATCH));

      const assignmentMap = new Map<string, string>();
      for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const round = chunks.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          round.map((chunk) => classifyBatch(chunk, categories, techNames, apiKey))
        );
        results.forEach((chunkMap) => chunkMap.forEach((v, k) => assignmentMap.set(k, v)));
      }

      const catById = new Map(categories.map((c) => [c.id, c]));
      const fallback = categories.find((c) => c.score === 2) || categories[0];

      const proposals = list.map((t) => {
        const catId = assignmentMap.get(t.id) || fallback.id;
        const cat = catById.get(catId) || fallback;
        return {
          ticket_id: t.id,
          title: t.title,
          category_id: cat.id,
          category_path: cat.path,
          score: cat.score,
          technician_name: t.assigned_to ? techNames.get(t.assigned_to) || null : null,
        };
      });

      const totalPoints = proposals.reduce((s, p) => s + p.score, 0);
      const byTechMap = new Map<string, { count: number; points: number }>();
      proposals.forEach((p) => {
        const name = p.technician_name || "Sem técnico";
        const cur = byTechMap.get(name) || { count: 0, points: 0 };
        cur.count += 1;
        cur.points += p.score;
        byTechMap.set(name, cur);
      });
      const byTechnician = Array.from(byTechMap.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.points - a.points);

      return corsJson({ proposals, totalTickets: proposals.length, totalPoints, byTechnician });

    }

    if (action === "apply") {
      const assignments = (body.assignments || []) as { ticket_id: string; category_id: string }[];
      if (!Array.isArray(assignments) || assignments.length === 0) {
        return corsJson({ error: "assignments é obrigatório" }, 400);
      }
      // reevaluate=true: re-pontua chamados JÁ FECHADOS (não mexe em status/closed_at,
      // não exige 'Aprovado', atualiza a evaluation 'meta' existente em vez de inserir outra).
      const reevaluate = body.reevaluate === true;

      const ticketIds = assignments.map((a) => a.ticket_id);
      let liveQuery = admin
        .from("tickets")
        .select("id, assigned_to")
        .in("id", ticketIds)
        .eq("organization_id", organizationId);
      if (!reevaluate) liveQuery = liveQuery.eq("status", "Aprovado"); // evita duplo processamento no fluxo normal
      const { data: liveTickets, error: liveErr } = await liveQuery;
      if (liveErr) throw liveErr;
      const liveMap = new Map((liveTickets || []).map((t: any) => [t.id, t.assigned_to as string | null]));

      const categoryIds = [...new Set(assignments.map((a) => a.category_id))];
      const { data: cats, error: catErr } = await admin
        .from("categories")
        .select("id, score")
        .in("id", categoryIds);
      if (catErr) throw catErr;
      const scoreById = new Map((cats || []).map((c: any) => [c.id, c.score as number]));

      let closedCount = 0;
      let totalPoints = 0;
      const byTechMap = new Map<string, { count: number; points: number }>();
      const techIds = new Set<string>();

      for (const a of assignments) {
        const assignedTo = liveMap.get(a.ticket_id);
        if (assignedTo === undefined) continue; // fora do escopo (não pertence à org, ou não está mais 'Aprovado')
        const score = scoreById.get(a.category_id);
        if (score == null) continue;

        if (reevaluate) {
          const { error: updErr } = await admin.from("tickets").update({ category_id: a.category_id }).eq("id", a.ticket_id);
          if (updErr) { console.error("update ticket (reevaluate) failed", a.ticket_id, updErr); continue; }

          const { data: existingEval } = await admin
            .from("evaluations")
            .select("id, score")
            .eq("ticket_id", a.ticket_id)
            .eq("type", "meta")
            .maybeSingle();

          if (existingEval) {
            const { error: evalErr } = await admin.from("evaluations").update({ score }).eq("id", existingEval.id);
            if (evalErr) { console.error("update evaluation (reevaluate) failed", a.ticket_id, evalErr); continue; }
          } else {
            const { error: evalErr } = await admin.from("evaluations").insert({
              ticket_id: a.ticket_id,
              evaluator_id: assignedTo || caller.id,
              score,
              comment: "Pontuação atribuída por reavaliação de IA (título + descrição + tratativa).",
              type: "meta",
            });
            if (evalErr) { console.error("insert evaluation (reevaluate) failed", a.ticket_id, evalErr); continue; }
          }

          await admin.from("ticket_history").insert({
            ticket_id: a.ticket_id,
            user_id: caller.id,
            action: "evaluated",
            old_value: existingEval ? `${existingEval.score} pts` : null,
            new_value: `${score} pts (IA — reavaliação com tratativa)`,
          });
        } else {
          const { error: updErr } = await admin
            .from("tickets")
            .update({ status: "Fechado", closed_at: new Date().toISOString(), category_id: a.category_id })
            .eq("id", a.ticket_id);
          if (updErr) { console.error("update ticket failed", a.ticket_id, updErr); continue; }

          const evaluatorId = assignedTo || caller.id;
          const { error: evalErr } = await admin.from("evaluations").insert({
            ticket_id: a.ticket_id,
            evaluator_id: evaluatorId,
            score,
            comment: "Fechamento e pontuação automáticos por IA (revisão do administrador).",
            type: "meta",
          });
          if (evalErr) { console.error("insert evaluation failed", a.ticket_id, evalErr); continue; }

          await admin.from("ticket_history").insert([
            { ticket_id: a.ticket_id, user_id: caller.id, action: "status_change", old_value: "Aprovado", new_value: "Fechado" },
            { ticket_id: a.ticket_id, user_id: caller.id, action: "evaluated", old_value: null, new_value: `Pontuação: ${score} pts (IA)` },
          ]);
        }

        closedCount += 1;
        totalPoints += score;
        if (assignedTo) {
          techIds.add(assignedTo);
          const key = assignedTo;
          const cur = byTechMap.get(key) || { count: 0, points: 0 };
          cur.count += 1;
          cur.points += score;
          byTechMap.set(key, cur);
        }
      }

      const techNames = new Map<string, string>();
      if (techIds.size > 0) {
        const { data: profs } = await admin.from("profiles").select("user_id, full_name").in("user_id", [...techIds]);
        (profs || []).forEach((p: any) => techNames.set(p.user_id, p.full_name));
      }
      const byTechnician = Array.from(byTechMap.entries())
        .map(([id, v]) => ({ name: techNames.get(id) || "—", ...v }))
        .sort((a, b) => b.points - a.points);

      return corsJson({ closedCount, totalPoints, byTechnician });
    }

    return corsJson({ error: "action inválida" }, 400);
  } catch (e: any) {
    console.error("close-approved-tickets-ai error", e);
    return corsJson({ error: String(e?.message ?? e) }, 500);
  }
});
