## Objetivo

Substituir toda a árvore de categorias (Macro → Sistema → Item) pela nova estrutura fornecida, **sem afetar chamados já fechados/contabilizados**.

## Por que é seguro para o histórico

- A pontuação de cada chamado já fechado fica gravada em `evaluations.score` no momento do fechamento — não é recalculada a partir de `categories.score`.
- O vínculo `tickets.category_id` continuará apontando para a categoria antiga (mantida no banco como inativa), então telas de detalhe/auditoria/relatórios continuam mostrando o nome correto.
- Hoje há 1.288 chamados (1.158 fechados), 97 categorias em uso, 53 delas já inativas — ou seja, manter categorias antigas como inativas é o padrão já adotado.

## O que será feito

### 1. Migração SQL (uma única migration)

1. **Desativar todas as categorias atuais** com `UPDATE categories SET is_active = false` (mantém IDs, nomes e scores antigos intactos para histórico).
2. **Inserir a nova árvore** na organização `Grupo Ramos` (`a543a17b-…`):
   - 8 macros: Chamados Excluídos, Suporte & Operação, Hardware & CFTV, Redes & Infraestrutura, Sistemas & Desenvolvimento, Dados, Relatórios & Documentação, Gestão & Estratégico, Avulso.
   - ~30 sistemas (Usuário, Acessos & Identidade, CFTV, n8n, API, SQL, …).
   - ~110 itens com `score` conforme lista enviada (ex.: Suporte Trivial N1 = 1, Reinstalação serviço crítico = 9, Implantação de nova IA = 10).
   - Todas marcadas `is_active = true`, `level` apropriado (`macro` / `sistema` / `item`), `parent_id` ligado corretamente.

### 2. Nenhum código alterado

- A tela `src/pages/Categorias.tsx` já lida com a hierarquia atual e continua funcionando.
- Hooks de tickets, metas e métricas não precisam mudar — a pontuação vem de `evaluations.score` (histórico) e do `score` da categoria nova (chamados futuros).

## Fora de escopo

- Migrar chamados antigos para as novas categorias (não solicitado e quebraria histórico).
- Remover fisicamente categorias antigas (ficariam órfãs nos tickets).
- Mudanças em telas, métricas ou regras de pontuação.

## Detalhes técnicos

- `categories(level, parent_id, score, organization_id, is_active)` já suporta a estrutura. `score` só é preenchido em `level='item'`.
- A migration usa CTEs com `INSERT … RETURNING` para encadear macro → sistema → item sem precisar gerar UUIDs no cliente.
- Idempotência: a migration verifica se já existe macro com mesmo nome **ativo** antes de inserir, evitando duplicação caso seja executada novamente.
