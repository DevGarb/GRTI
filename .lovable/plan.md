# Importação de checklists a partir de JSON (GRCHECK)

Objetivo: subir o arquivo `checklists_full.json` (120 checklists, 612 categorias, 1.721 itens, 1.113 opções) por uma tela no GRCHECK, gravar tudo em tabelas relacionais e transformar os checklists em Modelos utilizáveis.

Decisões já definidas: dados sempre na organização GRCHECK, reenvio do arquivo atualiza os registros existentes (sem duplicar), e os checklists importados também viram Modelos.

## 1. Novas tabelas

Como já existem tabelas `categories` e `chk_template_items` no sistema, as tabelas de importação usam o prefixo `chk_imp_` para não conflitar:

- `chk_imp_checklists` — id original do arquivo, nome, tipo (1 Checklist, 2 Pesquisa de Satisfação, 3 Plano de Ação), descrição, ativo, organização
- `chk_imp_categories` — id original, checklist, nome, descrição, categoria-pai (hierarquia preservada: 26 categorias têm pai)
- `chk_imp_items` — id original, categoria, nome, obrigatório, escala, peso
- `chk_imp_item_options` — id original, item, texto, valor

Os ids originais do arquivo são a chave primária, o que garante que os relacionamentos do JSON sejam mantidos e que o reenvio atualize em vez de duplicar. Acesso liberado para membros da organização; escrita apenas para administradores.

## 2. Tela de importação

Nova página **Importar** em `/checklists/importar`, visível no menu do GRCHECK apenas para administradores:

- Área para selecionar/arrastar o arquivo JSON
- Validação do formato antes de enviar, com mensagem clara em caso de arquivo inválido
- Prévia com a contagem do que será importado (checklists, categorias, itens, opções)
- Botão "Importar" com barra de progresso
- Resumo final: quantos registros foram criados, atualizados e quantos modelos foram gerados
- Lista dos checklists já importados, com filtro por tipo e status

## 3. Conversão em Modelos

Após a importação, cada checklist do tipo 1 (Checklist) vira um Modelo do GRCHECK:

- Um registro em `chk_templates` por checklist (título, descrição, frequência padrão "única", ativo conforme o arquivo)
- Um item de modelo por item do JSON, no formato "CATEGORIA – Item", preservando a ordem original e o peso
- Reimportação atualiza o modelo existente em vez de criar outro

Pesquisas de Satisfação (tipo 2) ficam armazenadas, mas não geram Modelos, já que o fluxo de execução atual é de checklist.

## Detalhes técnicos

- Migration criando as 4 tabelas com FKs em cascata, GRANTs para `authenticated`/`service_role`, RLS por organização (leitura para membros, escrita para admin) e triggers de `updated_at`.
- Coluna `weight` como `numeric` (o arquivo tem pesos inteiros e fracionários) e `scale` como `integer` (valores observados de 1 a 1023).
- Importação executada no cliente com o Supabase JS: upsert em lotes (~500 linhas) na ordem checklists → categorias (pais antes dos filhos) → itens → opções, dentro da página nova.
- Geração de modelos feita por RPC `chk_import_generate_templates()` (security definer, restrita a admin da organização) para evitar centenas de chamadas do navegador.
- Rota registrada em `src/App.tsx` com `MenuGuard`+`AdminRoute` e chave de menu `chk-importar` adicionada em `src/config/menuItems.ts` e habilitada em `organization_menu_config` do GRCHECK.
- O arquivo enviado não é armazenado — apenas os dados extraídos.
