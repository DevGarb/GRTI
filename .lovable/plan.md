## Ajustes em Oficina (OS)

### 1. Data de cadastro editável
No modal de detalhes da OS (`OsDetailDialog` em `src/pages/OpOficina.tsx`):
- Adicionar campo `Data de abertura` (input `type="date"`) ao lado do campo `Prazo`, com estado `openedAt` inicializado por `os.opened_at`.
- Incluir `opened_at: openedAt` no `saveHeader()` para persistir via `update`.
- Atualizar o cabeçalho do PDF para usar a data editada.

### 2. Badge com quantidade de peças
No mesmo modal, na seção `Peças / Itens`:
- Trocar o `<h3>Peças / Itens</h3>` por um cabeçalho com `<Badge>` exibindo `parts.length` (ex.: "Peças / Itens · 3"), usando o componente `Badge` já importado.
- Mostrar o badge mesmo quando `0`, em variante `secondary` para não poluir.

### Fora do escopo
- Não altera permissões, RLS, schema ou outras telas.
- Não toca em `NewOsDialog` (já permite escolher data na criação).