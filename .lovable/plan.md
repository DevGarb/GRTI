## Erro ao encerrar sprint

**Causa:** a função `close_sprint_with_checklist` no banco ainda exige anexo de evidência para cada item e dispara `RAISE EXCEPTION 'Anexe a evidência para: …'`. O erro `malformed array literal: "Documentação"` vem desse mesmo bloco (concatenação `text[] || text` quando o array já tem itens).

**Correção (migration):** atualizar a função para tornar as evidências opcionais:
- remover o bloco `_missing` e o `RAISE EXCEPTION` de evidências
- manter apenas a validação de checklist 100% confirmado
- restante (score, insert em `sprint_quality_checks`, update da sprint, `sprint_history`) inalterado

Assim o front (que já trata evidências como opcionais) consegue encerrar a sprint normalmente.