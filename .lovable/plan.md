## Objetivo
Tornar o texto do "nome do equipamento" editável na etiqueta gerada em `PatrimonioQRCodeModal.tsx`, sem alterar o cadastro do patrimônio.

## Mudanças

**Arquivo:** `src/components/PatrimonioQRCodeModal.tsx`

1. Adicionar um state local `labelText` inicializado com `patrimonio.equipment_type` (reinicializa via `useEffect` quando o patrimônio mudar).
2. Na aba "Etiqueta Niimbot D110", acima do preview, adicionar um `<input>` com label "Nome do equipamento (etiqueta)" ligado ao `labelText`.
3. No preview da etiqueta (tamanhos 12x40 e 15x30) e no download PNG, renderizar `labelText` no lugar de `patrimonio.equipment_type`. O tamanho 12x22 continua não exibindo esse texto (comportamento atual).
4. O valor é apenas visual/impressão — não persiste no banco (nenhuma alteração de dados ou de outras telas).

## Detalhes técnicos
- Sem migrations, sem alterações em hooks/queries.
- Sem mudanças nos exports em massa de `src/lib/patrimonioExports.ts` (fora do escopo — usuário mencionou apenas "a etiqueta" do modal).
