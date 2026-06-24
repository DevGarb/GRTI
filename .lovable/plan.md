## Objetivo

Permitir que o **Admin** marque um projeto como concluído, definindo o **porte** (Pequeno/Médio/Grande) e o **valor (R$)** — com faixas sugeridas, mas editável. Projetos concluídos saem da listagem ativa e aparecem em uma nova sub-aba **"Concluídos"** dentro de `/projetos/lista`.

## Mudanças no banco

Migração na tabela `projects`:

- `size` text — valores: `pequeno` | `medio` | `grande` (nullable).
- `value_brl` numeric(12,2) — valor monetário (nullable).
- `completed_at` timestamptz — preenchido ao concluir.
- `completed_by` uuid — quem concluiu.

Faixas sugeridas (apenas como default no formulário, não restritivas):

- Pequeno → R$ 5.000
- Médio → R$ 15.000
- Grande → R$ 50.000

Status `"Concluído"` já existe — vamos usá-lo como filtro de "concluídos".

## Mudanças no frontend

### 1. `src/pages/projetos/ProjetosLista.tsx` (ou `Projetos.tsx` se for a página da rota `/projetos/lista`)

- Adicionar duas sub-abas (`Tabs` do shadcn) no topo: **Ativos** e **Concluídos**.
- "Ativos" mostra projetos com status ≠ `Concluído` (comportamento atual).
- "Concluídos" mostra projetos com status = `Concluído`, com badge do porte e valor formatado em R$.

### 2. `src/pages/ProjetoDetalhe.tsx`

- Adicionar botão **"Concluir projeto"** no cabeçalho, **visível somente para Admin** (`hasRole("admin")` ou super_admin).
- Botão abre um modal `CompleteProjectModal` com:
  - Select de porte (Pequeno/Médio/Grande) — ao escolher, preenche `value_brl` com a faixa sugerida.
  - Input numérico de valor (R$), editável.
  - Confirmar → grava `status='Concluído'`, `size`, `value_brl`, `completed_at=now()`, `completed_by=auth.uid()`.
- Se o projeto já estiver concluído, mostrar badge "Concluído em DD/MM/AAAA · Porte · R$ valor" e botão "Reabrir" (admin) que volta status para "Em Andamento" e limpa `completed_at`.

### 3. `src/components/projetos/CompleteProjectModal.tsx` (novo)

Modal simples com porte + valor + botões cancelar/confirmar. Usa `useUpdateProject`.

### 4. `src/components/projetos/ProjectCard.tsx`

- Na sub-aba "Concluídos", exibir porte como badge e valor formatado (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`).

### 5. `src/hooks/useProjects.ts`

- Expor `size`, `value_brl`, `completed_at`, `completed_by` na interface `Project`/`ProjectAggregate`.
- Nenhum filtro adicional — a página filtra pelo `status`.

## Detalhes técnicos

- Permissão para concluir: checada no frontend (`hasRole("admin")`) e reforçada por RLS existente de `UPDATE` em `projects` (já restringe a admin/staff).
- Faixas sugeridas como constante no modal, não no banco — admin pode editar livremente.
- Sub-abas usam `Tabs`/`TabsList`/`TabsTrigger` já presentes no projeto.