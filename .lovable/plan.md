# Ajustes Entregas + Oficina

## 1. Entregas — Kanban por motorista
Arquivo: `src/pages/OpEntregas.tsx`

- Remover as colunas **Em rota** e **Cancelado** do kanban (manter apenas no filtro de status, conforme combinado).
- Gerar `KANBAN_COLUMNS` dinamicamente a partir dos motoristas ativos:
  ```
  Pendente | <Motorista A> | <Motorista B> | ... | Finalizado
  ```
- Distribuição (apenas agrupamento visual, sem alterar status):
  - `Finalizado` → coluna Finalizado.
  - Sem `driver_id` → coluna Pendente.
  - Com `driver_id` (e não finalizado) → coluna do motorista.
- `onMove`:
  - Soltar em coluna de motorista → `update({ driver_id: <id> })` (status preservado).
  - Soltar em **Pendente** → `update({ driver_id: null })`.
  - Soltar em **Finalizado** → fluxo de fechamento atual (`setClosing`).
- Manter o toggle "Ocultando finalizadas" e os filtros existentes (status/tipo/data) inalterados.

## 2. Oficina — Cliente, Veículo e Mecânico editáveis na OS
Arquivo: `src/pages/OpOficina.tsx` (`OsDetailDialog`)

- Substituir o bloco somente-leitura (linhas ~493-497) por:
  - Select de **Cliente** (companies).
  - Select de **Veículo** (vehicles) + inputs de **Placa** e **Modelo** (preenchem automático ao escolher um veículo da frota, igual ao `NewOsDialog`).
  - Select de **Mecânico** (mechanics).
- Adicionar estado local para `company_id`, `vehicle_id`, `vehicle_plate`, `vehicle_model`, `mechanic_id` e incluir esses campos no `saveHeader`/`onUpdate`.

## 3. Oficina — Badge com quantidade de peças no card do kanban
Arquivos: `src/hooks/useOficina.ts` e `src/pages/OpOficina.tsx`

- No hook `useServiceOrders`, após buscar as OS, fazer uma query agregada em `op_service_order_parts` (`select service_order_id, quantity`) e expor um mapa `partsCountByOs: Record<string, number>` (contagem de linhas por OS).
- Em `renderCard` (e na linha da view "Lista"), exibir um `<Badge>` com o número de peças (ex.: "🔧 3 peças") quando > 0, ao lado do número da OS.

## 4. Oficina — Data de criação editável
Arquivo: `src/pages/OpOficina.tsx` (`OsDetailDialog`)

- O campo já existe como "Data de abertura" e é salvo, mas está pouco visível. Renomear o label para **"Data de criação"** e garantir que ele apareça acima do campo "Prazo".
- Garantir que `saveHeader` envie `opened_at` mesmo quando vazio cai para o valor original (já implementado — só validar).

## Notas técnicas
- Manter tipos existentes (`Delivery`, `ServiceOrder`).
- Sem mudanças de schema/RLS.
- `partsCountByOs` deve ser atualizado em `refetch()` para refletir adição/remoção de peças após editar uma OS.
