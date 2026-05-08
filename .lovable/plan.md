## Objetivo

Modernizar os módulos **Entregas**, **Oficina** e **Manutenção Predial** com visualização Kanban, fluxo de fechamento controlado e ações rápidas (telefone, WhatsApp, mapa). As três telas vão compartilhar a mesma base de componentes para reduzir bugs e facilitar testes.

---

## 1. Componentes compartilhados (novos, em `src/components/operacional/`)

- **`OpKanbanBoard.tsx`** — board genérico que recebe `columns`, `items`, `renderCard`, `onMove`, `allowedTransitions`. Reutiliza o `@hello-pangea/dnd` já presente no projeto (mesmo do `KanbanBoard` de chamados).
- **`OpCard.tsx`** — cartão compacto com título, badges (status/prioridade/categoria), e linha de ações rápidas (ver abaixo).
- **`OpDetailDrawer.tsx`** — painel lateral (Sheet) que abre ao clicar no cartão, mostrando todas as informações + abas (Detalhes / Observações / Fotos quando aplicável).
- **`OpClosureDialog.tsx`** — modal de fechamento, exigido sempre que o usuário marca o card como **Finalizado/Concluído**. Campos:
  - Data de conclusão (default hoje)
  - Resumo do que foi feito (obrigatório)
  - Custo final (apenas Oficina)
  - Anexar fotos depois (opcional, apenas Oficina/Manutenção)
- **`OpQuickActions.tsx`** — botões pequenos de:
  - **Ligar** (`tel:` se houver telefone)
  - **WhatsApp** (`https://wa.me/55<num>` limpando máscara)
  - **Endereço**: tenta abrir Google Maps (`https://www.google.com/maps/search/?api=1&query=...`); botão secundário "Copiar endereço" usando `navigator.clipboard`
- **`OpNotesPanel.tsx`** — lista de observações/comentários por card, com `@menção` (autocomplete dos usuários da organização). Salva em nova tabela `op_card_notes`.

---

## 2. Mudanças por módulo

### 2.1 Entregas (`OpEntregas.tsx`)
- Adicionar **toggle "Lista | Kanban"**; manter lista existente como fallback
- Colunas Kanban: **Pendente → Em rota → Finalizado** (Cancelado fica visível mas em coluna separada recolhível)
- Clique no card → `OpDetailDrawer`
- Filtro **"Ocultar finalizados"** ligado por padrão na visão Kanban
- Quick actions no card: Ligar, WhatsApp (`contact_phone`), Maps (`address`)
- Ao mover para Finalizado → abre `OpClosureDialog`
- Aba "Observações" no drawer

### 2.2 Oficina (`OpOficina.tsx`)
- Padronizar status para: **Pendente, Aguardando peças, Em andamento, Finalizado, Cancelada** (migra os atuais "Aberta"/"Em execução"/"Aguardando peça"/"Finalizada" via SQL update)
- Coluna **"Em atraso"** = computada (tem `deadline` < hoje e não finalizado) — derivada, não persistida
- Adicionar campo `deadline date` na tabela `op_service_orders` (hoje não existe)
- Toggle Lista/Kanban; ocultar finalizados por padrão
- Drawer expansível com peças/fotos/notas
- Closure dialog inclui custo final (atualiza `total_cost`) e `finished_at`
- Quick actions: telefone/WhatsApp do contato da empresa (via `op_companies.contact_phone`)

### 2.3 Manutenção Predial (`OpManutencao.tsx`)
- Toggle Lista/Kanban na aba "Ordens de Manutenção"
- Colunas: **Aberta → Em execução → Concluída**, com indicador "Atrasada" em cards (badge vermelho)
- Drawer com fotos antes/depois e observações
- Closure dialog ao concluir
- Quick actions: telefone do responsável da sede + endereço da sede no Maps

---

## 3. Banco de dados

Migrations necessárias:

```sql
-- Campos de fechamento (todos os 3 módulos)
ALTER TABLE op_deliveries
  ADD COLUMN closure_summary text,
  ADD COLUMN closed_at timestamptz,
  ADD COLUMN closed_by uuid;

ALTER TABLE op_service_orders
  ADD COLUMN deadline date,
  ADD COLUMN closure_summary text,
  ADD COLUMN closed_by uuid;

ALTER TABLE op_maintenance_orders
  ADD COLUMN closure_summary text,
  ADD COLUMN closed_by uuid;

-- Tabela única de observações/menções por card
CREATE TABLE op_card_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  module text NOT NULL CHECK (module IN ('delivery','service_order','maintenance')),
  card_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  mentioned_users uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE op_card_notes ENABLE ROW LEVEL SECURITY;
-- RLS: staff da mesma org pode ler/inserir; só autor apaga
```

Update de status na Oficina para o novo vocabulário (`UPDATE` via tool de insert).

---

## 4. Hooks

- Estender `useDeliveries`, `useServiceOrders`, `useMaintenanceOrders` com `closeCard(id, payload)`.
- Novo `useCardNotes(module, cardId)` para CRUD em `op_card_notes` + busca de usuários para menções.

---

## 5. Validação após cada etapa

1. Compilar e verificar tipos — sem erros TS
2. Testar arrastar entre colunas em cada módulo (todas as transições válidas)
3. Testar fluxo de fechamento (não deixar passar para Finalizado sem resumo)
4. Testar ações rápidas: telefone abre dialer, WhatsApp abre wa.me, endereço abre Maps e copia fallback
5. Testar `@menção` em observações
6. Testar filtro "Ocultar finalizados"
7. Verificar RLS em `op_card_notes` (super admin / staff / outros)

---

## 6. Ordem de implementação (commits incrementais)

1. **Migration de schema** (campos de fechamento + `op_card_notes` + RLS)
2. **Componentes compartilhados** (`OpKanbanBoard`, `OpCard`, `OpDetailDrawer`, `OpClosureDialog`, `OpQuickActions`, `OpNotesPanel`)
3. **Hook `useCardNotes`** + extensão dos hooks existentes
4. **Entregas** com Kanban + drawer + closure + quick actions + notas → validar
5. **Oficina** com migration de status + Kanban → validar
6. **Manutenção** com Kanban + closure → validar
7. Atualizar documentação em `public/docs/` (Operacional)

---

## Detalhes técnicos

- Reusar `@hello-pangea/dnd` (já no projeto)
- Endereço → Maps: detectar mobile e usar `geo:` quando possível, senão URL universal
- Telefone limpo via regex `\D` antes de gerar `tel:` / `wa.me`
- Menções: parser simples `@nome` resolvido para `user_id` ao salvar; renderizar como link
- Status "Em atraso" é UI-only (não persiste); ordenação no Kanban respeita `deadline asc`
- Closure dialog é o ÚNICO caminho para chegar em Finalizado/Concluído (no select e no drag-and-drop)
