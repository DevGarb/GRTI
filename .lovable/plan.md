## Bug: datas das preventivas exibidas com D-1

### Causa
O campo `execution_date` é gravado como `date` ("YYYY-MM-DD"). No frontend, várias telas fazem `new Date("2026-06-26")`, que o JS interpreta como **meia-noite UTC**. Ao formatar no fuso de Brasília (UTC-3), a data renderiza como o dia anterior. Os dados no banco estão corretos — o bug é só na exibição.

### Correção
Trocar todo `new Date(execution_date)` por um parser que respeita o fuso local. Usar `parseISO` do `date-fns` (já é dependência) — para strings "YYYY-MM-DD" ele retorna meia-noite local, eliminando o shift.

### Arquivos a alterar
- `src/components/preventivas/PreventivasTable.tsx` (linha 51)
- `src/components/preventivas/PatrimonioTab.tsx` (linha 189)
- `src/components/preventivas/MonthlyReport.tsx` (linha 42, usar `.getDate()` do parseISO)
- `src/components/preventivas/EquipmentTable.tsx` (`lastDate` na grid)
- `src/pages/Preventivas.tsx` (linha 89, geração do CSV)
- `src/pages/Patrimonio.tsx` (linhas 388 e 472)
- `src/pages/AssetPublicView.tsx` (linhas 157 e 576)

Nada de banco, nada de schema. Só corrigir o parsing nas telas listadas.

### Validação
- Abrir `/preventivas`, verificar que a preventiva criada hoje aparece com a data de hoje.
- Conferir `/patrimonio` (histórico) e a view pública do ativo.
- Conferir o CSV exportado da aba Preventivas.