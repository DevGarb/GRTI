# Corrigir cálculo do Tempo Médio (TMA)

## Diagnóstico

Conferi os dados no banco e o TMA está **subestimado**. Existe um bug no RPC `get_metas_tecnicos`.

**Exemplo real (chamado do Felipe em 12/05):**

```text
started_at        15:58:12   ← técnico assumiu (ticket virou "Em Andamento")
status_change     16:09:47   Em Andamento → Aguardando Aprovação
status_change     16:13:57   Aguardando Aprovação → Aprovado
status_change     20:28:34   Aprovado → Fechado
```

O `ticket_history` **não tem um evento com `new_value = 'Em Andamento'`** — a primeira transição registrada já tem `old_value = 'Em Andamento'`. Isso porque quando o técnico se auto-atribui, o status é setado direto via update e a "entrada" em Em Andamento não vira um `status_change` separado.

No RPC, a CTE `paired` só abre janela quando encontra `new_value = 'Em Andamento'`:

```sql
CASE WHEN new_value='Em Andamento' THEN created_at END AS open_at
```

Como esse evento não existe para a primeira janela, o tempo entre `started_at` e o primeiro `Aguardando Aprovação` (~11 min nesse caso) **é ignorado**. Resultado: tickets sem retrabalho contam **0 minutos** de TMA.

A versão antiga em `src/lib/ticketTiming.ts` já tratava esse caso (linhas 162-165):
> "Se o primeiro evento já reflete uma transição de 'Em Andamento' para outro status, precisamos abrir a janela inicial em started_at."

Essa lógica não foi portada para o RPC.

## Correção

Atualizar `public.get_metas_tecnicos` para incluir uma janela inicial sintética usando `started_at` quando o primeiro `status_change` do ticket sai de "Em Andamento" para um status de pausa, antes de qualquer evento que entre em "Em Andamento".

### SQL (esboço)

Adicionar na CTE de eventos, por ticket:
- Detectar o `min(created_at)` do primeiro `status_change` cujo `old_value = 'Em Andamento'`.
- Se existir e o ticket tiver `started_at`, injetar uma linha extra com `open_at = started_at` e `close_at = primeiro_status_change` (somando seus minutos comerciais).

Em pseudo-SQL dentro do RPC:

```sql
first_exit AS (
  SELECT ticket_id, MIN(created_at) AS at
  FROM events
  WHERE old_value = 'Em Andamento'
  GROUP BY ticket_id
),
initial_window AS (
  SELECT c.id AS ticket_id,
         public.business_minutes_between(c.started_at, fe.at) AS mins
  FROM closed c
  JOIN first_exit fe ON fe.ticket_id = c.id
  WHERE c.started_at IS NOT NULL AND fe.at > c.started_at
)
-- somar initial_window.mins no work_min por ticket
```

A CTE `paired` continua tratando os retrabalhos (idas e voltas a "Em Andamento" registradas como `new_value`).

## Validação

Após aplicar a migration, rodar uma consulta de auditoria comparando para o mês atual:
- TMA por técnico antes/depois;
- Conferir manualmente o ticket do Felipe (esperado ~11 min, hoje aparece como 0).

Também validar que tickets com retrabalho (entradas em `new_value = 'Em Andamento'`) **continuam** somando corretamente as janelas adicionais (a janela inicial passa a ser contada uma única vez).

## Itens secundários (apenas relatar, não alterar agora)

- **"Tempo Médio Geral"** na tela é a média simples das médias dos técnicos, não ponderada por nº de chamados. Pequeno viés quando os técnicos têm volumes muito diferentes. Posso ajustar depois se quiser.
- O frontend não precisa mudar — `avgResolutionHours` continua sendo `total_work_minutes / 60 / total_closed`.

## Escopo

- 1 migration: `CREATE OR REPLACE FUNCTION public.get_metas_tecnicos(...)` com a janela inicial corrigida.
- Sem mudanças em código frontend.
- Sem mudanças em RLS / permissões (mantém `SECURITY DEFINER` e grants atuais).
