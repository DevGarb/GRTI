## Objetivo
Garantir no modal **Concluir projeto** que o valor digitado pelo usuário sempre prevaleça, e usar o sugerido (Pequeno R$ 300 / Médio R$ 500 / Grande R$ 800) apenas como fallback quando o campo estiver vazio.

## Mudanças em `src/components/projetos/CompleteProjectModal.tsx`

1. **Inicialização do campo Valor**
   - Ao abrir o modal, se `initialValue` existir → preencher com ele.
   - Se não existir → deixar o campo **vazio** (placeholder mostrando o sugerido do porte atual, ex.: "Sugerido: 300"), em vez de já preencher com o default.

2. **Troca de porte (handleSizeChange)**
   - Continuar **sem sobrescrever** o que o usuário digitou.
   - Apenas atualizar o placeholder do input para refletir o sugerido do novo porte.

3. **Confirmação (handleConfirm)**
   - Se o campo `value` estiver vazio/inválido → usar `SIZE_DEFAULTS[size]` como valor salvo.
   - Se tiver valor digitado → salvar exatamente o que foi digitado (`parseFloat`).
   - Nunca salvar `null` por esquecimento — sempre algum número (digitado ou sugerido).

4. **Texto auxiliar**
   - Ajustar a legenda abaixo do input para algo como: *"Deixe em branco para usar o valor sugerido do porte selecionado."*

## Fora de escopo
- Sem alterações de schema, hooks, ProjectCard ou outros componentes — só o modal.
