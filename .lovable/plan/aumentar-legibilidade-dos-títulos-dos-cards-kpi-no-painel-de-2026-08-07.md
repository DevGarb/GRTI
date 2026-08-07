# Aumentar legibilidade dos títulos dos cards KPI no Painel de TV

## Problema
No painel de TV (que é renderizado numa TV de grande formato, vista à distância), os títulos dos cards do topo — **Abertos Hoje, Fechados Hoje, Top Técnico, TMA Hoje** — aparecem em fonte minúscula (`text-[10px]` uppercase), ficando praticamente ilegíveis.

## Causa
Em `src/components/tv/DailyKpiTile.tsx` (linha 37), o rótulo (`label`) é renderizado com `text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--tv-text-dim))] font-medium`. Essa classe é aplicada a todos os 4 cards do topo do `TvDashboard.tsx`.

## Correção
Aumentar o tamanho e o contraste do título no `DailyKpiTile`:

- Trocar `text-[10px]` → `text-sm md:text-base`
- Trocar cor `--tv-text-dim` → `--tv-text` (claro, legível)
- Trocar `font-medium` → `font-semibold`
- Reduzir o tracking de `0.22em` → `0.18em` para não esticar as letras demais no tamanho maior

Nenhuma outra mudança de layout, funcionalidade ou dados é necessária — os 4 títulos vêm do mesmo componente, então todos ficam legíveis de uma vez.

## Verificação
- `bun run build` para validar.
- Conferir visualmente no preview do painel de TV que os títulos ficam legíveis à distância.

## Escopo
Alteração restrita ao componente `src/components/tv/DailyKpiTile.tsx`. Sem mudanças em `TvDashboard.tsx` nem em qualquer outro módulo.
