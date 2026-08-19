## Detalhes técnicos

**Sidebar (`src/components/AppLayout.tsx`)**
- Novo estado `tiCollapsed` inicializado por função lazy lendo `localStorage["ti-sidebar-collapsed"]`; efeito grava a cada mudança. Só é usado quando `isTiOrg`.
- Largura da `<aside>` passa a ser `w-[240px]` ou `lg:w-[72px]` conforme o estado; rótulos, `OrgSwitcher` e o rodapé de e-mail ficam ocultos no modo rail (ícones mantêm o `Tooltip` já existente).
- Botão de colapso (chevron) no topo da sidebar, visível apenas em `lg:` e apenas na T.I, com `aria-label` e `aria-expanded`.
- Mobile: overlay já existe; adicionar listener de `Escape`, `overflow-hidden` no `body` enquanto aberta e fechamento automático em mudança de rota (`useEffect` em `location.pathname`).
- Estilos novos ficam em `src/pages/ti/ti.css` (`.ti-sidebar--rail`, transição de largura respeitando `prefers-reduced-motion`).

**Topbar e títulos**
- Novo `src/components/ti/TiPageHeader.tsx`: props `eyebrow?`, `title`, `description?`, `actions?`. Título usa `bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent` e `font-display`, sobretítulo usa `.ti-eyebrow` (já em `ti.css`), exatamente como em `Login.tsx` / `EscolherOrganizacao.tsx`.
- A `<header>` da T.I ganha o hambúrguer à esquerda com logo/nome da org, mantendo `NotificationBell` e o botão de alerta de teste à direita.
- Páginas ajustadas (títulos apenas, sem tocar em lógica): `Dashboard`, `ChamadosTI`, `ChamadosAbertos`, `Historico`, `Preventivas`, `PatrimonioTI`, `TodosTI`, `MetasTecnicos`/`MetasLayout`, `MetricasGerenciais`, `Projetos`/`ProjetosLayout`, `Auditoria`, `Usuarios`, `Configuracoes`.

**Validações**
- `src/components/__tests__/tiLayout.test.tsx` e `tiPageHeader.test.tsx` (Vitest + @testing-library/react, jsdom já configurado em `vitest.config.ts`). Se `@testing-library/react` ainda não estiver instalado, entra como devDependency.
- `scripts/ti-layout-check.mjs`: script Playwright executado sob demanda (não entra no `build`), que abre `/` em 1280×900 e 390×844, aplica o escopo T.I e falha se houver overflow horizontal, se a topbar não estiver visível, se a sidebar aparecer no mobile fechado ou se o título não estiver legível; grava capturas em `/tmp` para conferência.
- Fecho rodando `bun run test` e `bun run build`.

**Fora de escopo:** demais organizações, dados, permissões e qualquer alteração de comportamento das páginas.
