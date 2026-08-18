# Histórico de manutenção por placa (Oficina)

Nova aba no módulo Oficina para consultar todo o histórico de serviços de uma moto pela placa, com exportação.

## O que o usuário vê

Nova aba "Histórico" na navegação da Oficina (visível para o perfil admin), com:

- Campo de busca por placa (busca parcial, ignora maiúsculas/minúsculas e traço) + filtro de período (data inicial/final, padrão 01/01/1990 até hoje).
- Lista de placas encontradas; ao selecionar uma placa aparece o painel da moto:
  - Resumo: modelo/cor/ano, empresa, total de OS, OS em aberto, tempo médio na oficina (dias), data do último serviço, custo total acumulado, nº de retornos (OS abertas em até 30 dias após a anterior).
  - Linha do tempo das OS (mais recente primeiro), cada item mostrando: nº da OS, datas de abertura/finalização, dias na oficina, empresa, mecânico, etapa/status, problema relatado, diagnóstico, resumo de encerramento, peças usadas (nome, qtd, valor) e valor total.
  - Ao clicar numa OS, expande os detalhes e mostra as fotos (antes/depois) em miniatura.
- Botão "Exportar CSV" com o histórico da placa (UTF-8 com BOM, delimitador `;`).

## Detalhes técnicos

- Nova rota `/op/oficina/historico` em `src/App.tsx`, dentro de `MenuGuard menuKey="op-oficina"` + `OficinaGuard allow={["admin"]}`, apontando para a nova página `src/pages/op/OpOficinaHistorico.tsx`.
- Nova aba em `src/pages/op/OficinaNav.tsx` na lista de tabs do perfil admin (ícone `History`).
- Novo hook `src/hooks/useOficinaHistorico.ts`:
  - Consulta `op_service_orders` filtrando por `organization_id` e `vehicle_plate ilike %placa%`, ordenado por `opened_at desc`.
  - Carrega `op_service_order_parts` e `op_service_order_photos` das OS retornadas (consulta única com `in`).
  - Reaproveita `useMechanics` e `useCompanies` para nomes, e `daysInWorkshop` de `src/lib/oficinaStages.ts` para os cálculos de dias.
- Sem alteração de schema: todos os campos necessários já existem em `op_service_orders`.
- Estilo seguindo o padrão atual das telas da Oficina (`cearagps.css`, cards `bg-card border rounded-xl`).
