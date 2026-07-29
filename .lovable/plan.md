
## Contexto

Três pontos apontados em `Métricas Gerenciais` + Painel de TV:

1. **Filtro sem estado visual** — todos os botões (`Hoje`/`Ontem`/`7 dias`/`Mês`) usam `variant="outline"`, então nada destaca o período ativo.
2. **"Hoje" divergente entre Métricas Gerenciais e TV** — confirmado por consulta: chamados finalizados diretamente por fechamento de sprint (ex.: sprint do Danilo hoje) têm `status='Fechado'` e `closed_at=hoje`, mas **não** têm `aguardando_aprovacao_at`. A RPC `get_management_metrics` conta por `status='Fechado' AND closed_at`, então esses 7 tickets aparecem no "Finalizados = 34" da tela. Já a edge `tv-dashboard` conta `closed_today` só quando `aguardando_aprovacao_at >= startToday`, então ignora os fechados via sprint.
3. **Fechamento de sprint precisa contar no TV** — mesma causa raiz do item 2: qualquer contador do painel que hoje se baseia em `aguardando_aprovacao_at` (fechados/mês, TMA, ranking, técnicos ativos) precisa considerar também tickets fechados direto (Fechado/Aprovado com `closed_at` no período e sem `aguardando_aprovacao_at`).

## Mudanças

### `src/pages/MetricasGerenciais.tsx`
- Adicionar estado `activePreset: RangePreset | "custom" | null` (inicial `"today"`).
- Ao clicar num preset, setar `activePreset` junto com `range`. Ao aplicar intervalo pelo popover, setar `"custom"`.
- No `.map(...)` dos botões, passar `variant={activePreset === p ? "default" : "outline"}` para destacar o ativo.

### `supabase/functions/tv-dashboard/index.ts`
Definir, para cada ticket, um `finishedAtEffective`:
- se houver `aguardando_aprovacao_at`, usar ele (comportamento atual — preserva a semântica de "quando o técnico entregou");
- senão, se `status` ∈ (`Fechado`,`Aprovado`) e houver `closed_at`, usar `closed_at` (cobre fechamentos via sprint que pulam a aprovação).

Usar esse `finishedAtEffective` nos contadores existentes:
- `closed_today` / `closed_month`
- `activeTechsToday` (quando finaliza no dia)
- `ranking_today` (map de fechados por técnico)
- TMA hoje/mês/geral — quando não houver `aguardando_aprovacao_at`, cair para `closed_at` como fim do atendimento (mantendo o critério de exigir `started_at`).

Nenhuma outra métrica muda; o objetivo é apenas cobrir a via "sprint → Fechado direto" para que TV = Métricas Gerenciais.

### Validação
- `bun run build`.
- Conferir na UI: botão do preset selecionado fica destacado; ao trocar de preset o destaque muda.
- Não é necessário deploy real da edge — só garantir que o TypeScript da function compila (o build já valida via `tsgo`).

## Fora de escopo
- Não mexer na RPC `get_management_metrics` (já cobre sprints corretamente).
- Não alterar o fluxo de fechamento de sprint nem semântica de `closed_at`/`aguardando_aprovacao_at`.
