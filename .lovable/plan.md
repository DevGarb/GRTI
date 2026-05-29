# Histórico de Responsáveis do Patrimônio

## Contexto

A infraestrutura já existe:
- Tabela `patrimonio_history` registra mudanças de `responsible`, `sector`, `location`, `status` via trigger `trg_log_patrimonio_changes` (com `changed_by = auth.uid()`)
- A página pública (`/asset/:id`, aberta pelo QR Code) já exibe uma "Linha do tempo do equipamento" misturando todos os tipos de alteração

O que falta: dar destaque à **cadeia de responsáveis** — quem usou aquele equipamento, em que período, e quem fez a transferência.

## O que mudar

### 1. Edge function `supabase/functions/get-public-asset/index.ts`

- Aumentar `limit(10)` → `limit(50)` para o histórico (cobrir vida útil maior).
- Resolver os nomes de quem alterou: adicionar `changed_by` ao SELECT, coletar os UUIDs únicos e fazer um SELECT em `profiles (user_id, full_name)` para mapear nome do autor.
- Retornar dois blocos:
  - `relocation_history` (mantido, agora com `changed_by_name`)
  - `responsible_history`: derivado filtrando `field='responsible'` em ordem cronológica ascendente, com `{ from, to, started_at, ended_at, changed_by_name }` (o `ended_at` de cada item é o `started_at` do próximo; o atual fica em aberto).

### 2. Página pública `src/pages/AssetPublicView.tsx`

- Nova seção colapsável **"Histórico de Responsáveis"** acima da linha do tempo existente, com ícone de usuário:
  - Lista vertical (timeline) com cada responsável, data de início, data de fim ("atual" se for o vigente), e "transferido por {nome}" quando disponível.
  - Se a lista vier vazia mas `asset.responsible` existir, mostra o responsável atual como item único ("Responsável desde o cadastro").
- Na linha do tempo geral existente, exibir o `changed_by_name` ao lado da data (ex.: "12/05/2026 14:30 · por João Silva").

### 3. Garantir que mudanças sejam capturadas no cadastro inicial

O trigger atual só dispara em `UPDATE`. Para incluir o responsável definido no `INSERT` (cadastro), adicionar um trigger `AFTER INSERT` que registra `responsible`, `sector`, `location` iniciais como entradas no histórico (`old_value = NULL`). Isso garante que o "primeiro responsável" apareça na timeline.

## Fora de escopo

- Não muda o formulário de edição do patrimônio (a captura do responsável já funciona).
- Não muda o QR Code em si — apenas o conteúdo da página que ele abre.
- Não cria modal novo dentro do app; o "modal do QRCode" referido pelo usuário é a tela pública aberta pelo scan.

## Detalhes técnicos

- Migração SQL nova: trigger `AFTER INSERT ON public.patrimonio` chamando uma função `log_patrimonio_insert()` (SECURITY DEFINER) que insere linhas iniciais em `patrimonio_history`.
- Edge function: usar service role (já usa) para ler `profiles`, sem expor dados sensíveis (apenas `full_name`).
- Tipos: estender a interface `Asset` em `AssetPublicView.tsx` com `responsible_history` e `changed_by_name` nos itens.
