## Adicionar peças com Enter na OS (Oficina)

No modal de detalhes da OS (`OsDetailDialog` em `src/pages/OpOficina.tsx`), os 3 inputs da linha de cadastro de peça (nome, quantidade, valor) passam a aceitar **Enter** para adicionar a peça — sem precisar clicar no botão `+`.

### Mudança
- Extrair a lógica do `onClick` do botão para uma função local `handleAddPart()`.
- Adicionar `onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddPart(); } }}` nos três inputs (peça, qtd, valor).
- Botão `+` continua funcionando normalmente (chama o mesmo `handleAddPart`).
- Validação atual (`if (!partName) return;`) é mantida — Enter sem nome de peça não faz nada.
- Após adicionar, os campos são resetados como já acontece hoje (`setPartName("")`, `setQty("1")`, `setPrice("0")`) e o foco volta para o input de nome para agilizar cadastros em sequência.

### Fora do escopo
- Sem mudanças em RLS, schema, hooks ou outras telas.
