## Mudança
Adicionar botão de "Fotos" (ícone) nos cards do Kanban da Manutenção Predial, igual ao que já existe na visão Lista.

## Arquivo
`src/pages/OpManutencao.tsx` — função `renderCard` (linhas ~141–162).

## Detalhe
- Incluir um `<Button size="icon" variant="ghost">` com `<ImageIcon />` ao lado do `OpQuickActions`, no rodapé do card.
- `onClick` chama `setPhotoOmId(om.id)` (estado já existente que abre o `PhotosModal`).
- `e.stopPropagation()` no clique para não disparar a abertura do modal de edição (o card inteiro tem `onClick` que abre `setEditing`).

Sem mudanças de banco, hook ou no `PhotosModal`.
