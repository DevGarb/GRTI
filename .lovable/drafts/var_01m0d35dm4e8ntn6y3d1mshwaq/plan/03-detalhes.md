## Como será feito

1. **`src/pages/ti/ti.css`** — nova camada escopada `.ti-scope`, no mesmo padrão do `grcheck.css`:
   - tokens: superfícies translúcidas (`rgba` sobre `hsl(220 45% 4%)`), borda `white/10`, texto slate, acentos `cyan-300`/`sky-400`/`violet-400`, sombras profundas e raio 16px;
   - classes utilitárias: `.ti-card`, `.ti-card-interactive`, `.ti-kpi`, `.ti-table`, `.ti-tab`, `.ti-chip`, `.ti-input`, `.ti-btn-primary`, `.ti-btn-ghost`;
   - override de superfícies do shadcn dentro do escopo (dialog, popover, select, tabs, badge) para o vidro escuro, sem tocar nos componentes base.

2. **`src/components/AppLayout.tsx`** — quando `orgSlug === "grupo-ramos"`:
   - aplica `ti-scope` no wrapper e monta `<AuroraBackground />` fixo atrás do conteúdo (com `ParticleField` sutil, desligado em telas pequenas);
   - sidebar vira painel de vidro com hairline ciano no item ativo e cabeçalho com o logo em branco;
   - header translúcido com blur, no mesmo tom do login;
   - o white-label por cores continua valendo para as demais orgs — no escopo T.I as variáveis do tema escuro prevalecem.

3. **Páginas do módulo T.I** — aplicar as classes do novo tema (apenas marcação/estilo):
   Dashboard, Chamados / Chamados T.I / Chamados em Aberto / Calendário, Todos, Patrimônio T.I, Preventivas, Métricas Gerenciais, Metas (todas as abas), Projetos (todas as abas), Avaliações, Histórico, Auditoria, Usuários, Setores, Categorias, Integrações, Configurações, Documentação e os modais compartilhados (novo chamado / wizard, detalhe do chamado, atribuição).

4. **Microanimações** — os mesmos `stagger`/`rise` do login em cabeçalhos de página e grids de cartões, respeitando `prefers-reduced-motion`.

## Escopo e riscos

- Nenhuma mudança de query, RPC, permissão ou rota.
- O painel de TV mantém o visual atual (já é escuro e dedicado).
- Ajuste de contraste conferido em textos secundários e badges de status para não perder legibilidade sobre o vidro.
- Validação final com `bun run build` e captura de tela das principais páginas.
