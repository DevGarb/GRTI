# Corrigir o total de preventivas no Painel de TV

## Resultado esperado
- O card **Preventivas do Mês** mostrará `5/28 planejadas`, usando a soma das metas individuais cadastradas para Felipe e Izabele.
- A porcentagem será calculada pelo mesmo total: `5 ÷ 28 = 18%`.
- O indicador ficará vermelho abaixo de 80% e verde ao atingir 80% ou mais.
- Os cartões individuais continuarão mostrando suas metas, como `1/14` e `4/14`.

## Implementação
- Ajustar a função do Painel de TV para calcular o planejado geral pela soma das metas mensais `preventivas_done` dos técnicos da organização.
- Manter o cálculo atual por equipamentos apenas para pendências e atrasos operacionais, sem usá-lo como denominador da meta.
- Aplicar o limite visual de 80% também no card geral.
- Publicar novamente a função e validar a resposta e a tela do painel.
