# Evolução do módulo Entregas — 3 fases

Auth Supabase atual preservada (sem PIN). Identidade CearaGPS (teal `#0d4a56` + laranja `#e8531f`) aplicada apenas nas telas `/op/entregas` e derivadas, sem tocar tokens globais.

Motoristas atuais (Carlos Daniel, Luis Gustavo, Rodrigo Cordeiro) migrados para a nova tabela na primeira migration.

---

## Fase 1 — Cadastros e campos novos

**Banco (migration única):**
- `op_delivery_categories` (nome, cor, ícone lucide, ativo, ordem, org_id) — seed com Entrega, Buscar Mercadoria, Vistoria Resolve
- `op_deliveries`: colunas novas `category_id` (FK opcional; mantém `type` legado por compat), `vehicle_required` (`carro`/`moto`/`qualquer`), `receiver_phone`, `requester_name`
- `op_drivers`: garantir colunas `vehicle_type`, `phone`, `active` (já existem parcialmente — verificar)
- RLS + GRANTs padrão multi-tenant por `organization_id`

**Frontend `/op/entregas`:**
- Header/botões repintados com paleta CearaGPS via classes locais (sem trocar tokens globais)
- Aba/subrota `/op/entregas/motoristas` — CRUD de motoristas (nome, telefone, veículo, ativo)
- Aba/subrota `/op/entregas/categorias` — CRUD de categorias (nome, cor, ícone, ativo, reordenar)
- Colunas do Kanban geradas dinamicamente a partir dos motoristas ativos (nada hardcoded)
- Modal "Nova Entrega" com select dinâmico de categoria + campos `vehicle_required`, `receiver_phone`, `requester_name` (auto-preenchido com nome do usuário logado)
- Card do Kanban exibe badge da categoria (cor/ícone dinâmicos), ícone do veículo exigido, telefone do recebedor com botão de ligar/WhatsApp, nome do solicitante

---

## Fase 2 — Portal do solicitante e avaliação

**Banco:**
- `op_delivery_ratings` (delivery_id, rating 1-5, comment, rated_by, rated_at)
- Trigger opcional pra recalcular média por motorista (ou view)

**Frontend:**
- Rota `/op/entregas/solicitar` — visível para role `colaborador`; formulário simplificado (categoria, endereço, data, período, veículo exigido, telefone recebedor, obs); cria como `Pendente` sem motorista
- Lista "Minhas solicitações" no mesmo portal mostrando status em tempo real
- Dialog de finalização (`OpClosureDialog`) ganha campo de estrelas (1-5) + comentário opcional, não bloqueia salvar
- Card do motorista na aba Motoristas exibe média de estrelas e total de avaliações

---

## Fase 3 — Dashboard, suporte e outdoor

**Banco:**
- `op_driver_support_tickets` (motorista_id, gps_lat, gps_lng, transcript, status, created_at, resolved_at) OU reaproveita `tickets` marcando categoria "Suporte Motorista"
- Decisão técnica: reaproveitar `tickets` existente é mais simples e cai no fluxo de chamados que admin já usa

**Frontend:**
- Rota `/op/entregas/dashboard` com:
  - Comparativo abertos x fechados (barras, filtro dia/semana/mês)
  - Cards: total aberto, total fechado, taxa conclusão %, tempo médio abertura→finalização
  - Quebra por motorista (recebido x finalizado, tempo médio, média de estrelas)
  - Quebra por categoria
- Tela mobile do motorista: botão "Suporte" que captura GPS (Geolocation API) + Web Speech API pra ditado (fallback textarea)
- Botão "Alto contraste outdoor" fixo no header mobile do motorista — toggle que aumenta font-size e força preto/branco puro via classe no `<html>`

---

## Detalhes técnicos

**Tabelas afetadas:** `op_deliveries` (colunas novas), `op_drivers` (garantir campos), 2 novas (`op_delivery_categories`, `op_delivery_ratings`). Migrations em 3 chamadas separadas, uma por fase, todas com GRANT + RLS por org.

**Escopo visual isolado:** cria `src/pages/op/entregas.css` (ou classes em `index.css` sob `.cearagps-scope`) com variáveis `--cgps-primary: 13 65 33%` (teal) e `--cgps-accent: 14 82 51%` (laranja) aplicadas via wrapper div. Nenhum token global tocado.

**Roles:** usa roles existentes. Admin/super_admin = admin. Novo role `motorista` adicionado ao enum `app_role`. `colaborador` já existe = solicitante.

**Realtime:** habilita `supabase.channel` nas tabelas de entregas pra admin/motorista/solicitante verem updates entre dispositivos.

**Não faz:** login por PIN, troca de tokens globais, mapas visuais.

---

## Ordem de execução

1. Aprovar plano
2. Fase 1: migration → aprovar → CRUD motoristas → CRUD categorias → repaint + campos novos → validar
3. Fase 2: migration → portal solicitante → avaliação → validar
4. Fase 3: migration → dashboard → suporte → outdoor → validar
5. `bun run build` no fim de cada fase

Cada fase é entregável independente. Se algo travar, paramos numa fase estável.