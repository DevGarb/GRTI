## Objetivo

Na aba **Metas**, deixar explícito quantas preventivas precisam ser feitas no mês selecionado, agrupadas por tipo de equipamento (Notebook, Desktop, Impressora, Servidor), com sugestão automática de divisão entre os técnicos responsáveis. Assim o admin vê, por exemplo, "Julho: 8 notebooks → 4 por técnico" e já consegue definir as metas individuais.

## O que será feito

### 1. Novo componente `PreventivasMonthlyTarget.tsx` (em `src/components/metas/`)
Card destacado, exibido no topo da aba Metas (acima do `GoalsManager`), apenas para admin.

Para o mês/ano selecionados, calcula a demanda de preventivas a partir do `useOverdueEquipment()` (já existe) usando a lógica:
- **Vencidas** (`status === "overdue"`) → entram no mês atual (precisam ser feitas o quanto antes).
- **A vencer no mês selecionado** → equipamentos cuja próxima data prevista (`last_date + interval_days`) cai dentro do mês/ano selecionados.
- Quando o mês selecionado é futuro, soma o que já está vencido hoje + o que vencerá naquele mês.

Layout do card:

```text
┌──────────────────────────────────────────────────────────────┐
│ 🔧 Preventivas a executar — Julho/2026                       │
│                                                              │
│  Total: 8 equipamentos                                       │
│  ┌──────────┬──────────┬───────────┬───────────┐             │
│  │ Notebook │ Desktop  │ Impressora│ Servidor  │             │
│  │    6     │    1     │     1     │     0     │             │
│  │ 4 venc.  │ — venc.  │ 1 a venc. │           │             │
│  └──────────┴──────────┴───────────┴───────────┘             │
│                                                              │
│  Dividir entre: [ 2 ] técnicos  →  Meta sugerida:            │
│  Notebook 3/téc · Desktop 1/téc (1 sobrando) · Impressora …  │
│                                                              │
│  [Aplicar como meta "Preventivas Realizadas" dos técnicos]   │
└──────────────────────────────────────────────────────────────┘
```

- Campo numérico "Dividir entre N técnicos" (padrão 2). Mostra `Math.ceil(total/N)` por tipo + indicação de sobra (`ceil*N - total`).
- Botão **"Aplicar como meta"** abre um diálogo listando os técnicos com role `tecnico`/`desenvolvedor` para o admin marcar quem recebe e confirmar; ao confirmar, cria/atualiza a meta `preventivas_done` de cada técnico selecionado em `performance_goals` com o valor sugerido (ceil do total / nº de selecionados). Reutiliza o fluxo já existente de upsert do `GoalsManager`.
- Tipos com valor 0 aparecem em cinza claro.

### 2. Integração na página de Metas
- Localizar a página/aba que renderiza `GoalsManager` (provavelmente `src/pages/Configuracoes.tsx` ou `src/pages/Dashboard.tsx` — verificar antes de editar) e inserir `<PreventivasMonthlyTarget year={year} month={month} />` acima de `<GoalsManager />`, passando os mesmos `year`/`month` já controlados.
- Visível apenas quando `hasRole("admin")`.

### 3. Nenhuma mudança de schema
Os dados vêm de `preventive_maintenance` + `maintenance_intervals` via hooks já existentes. Sem migração.

## Detalhes técnicos

- Reutilizar `useOverdueEquipment()` e calcular `nextDue = last_date + interval_days`.
- Filtro do mês: `nextDue.getMonth() === month && nextDue.getFullYear() === year` **OU** (`status === "overdue"` e mês selecionado = mês atual/futuro).
- Equipamentos sem nenhum registro de preventiva (caso existam em `patrimonio` mas nunca tiveram PM) ficam fora deste card — fora do escopo agora; pode ser uma melhoria futura.
- Agrupamento por `equipment_type` usando os 4 tipos fixos da página de Preventivas (Desktop / Notebook / Impressora / Servidor).
- Botão "Aplicar como meta" usa upsert em `performance_goals` com `metric = "preventivas_done"`, `target_value = ceil(total/Nselecionados)`, `reference_month`/`reference_year` do filtro atual. Invalida `["performance-goals"]` para o `GoalsManager` recarregar.

## Fora do escopo

- Mudar a aba Preventivas em si.
- Criar tabela de "meta de preventivas" separada — usamos a métrica `preventivas_done` que já existe.
- Considerar equipamentos do `patrimonio` que nunca tiveram PM registrada.
