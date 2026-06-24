
DO $$
DECLARE
  _org uuid := 'a543a17b-0def-4ceb-acf5-91017f2b0ad3';
  m_excluidos uuid; m_suporte uuid; m_hardware uuid; m_redes uuid; m_sistemas uuid; m_dados uuid; m_gestao uuid; m_avulso uuid;
  s_excluido uuid; s_usuario uuid; s_acessos uuid; s_equip uuid;
  s_cftv uuid; s_format uuid; s_prev uuid;
  s_cabo uuid; s_conect uuid; s_servidor uuid;
  s_n8n uuid; s_api uuid; s_sql uuid; s_pbi uuid; s_kommo uuid; s_manychat uuid; s_meta uuid; s_uazapi uuid; s_goto uuid; s_service uuid; s_protrack uuid; s_lovable uuid; s_gmail uuid;
  s_rel uuid; s_doc uuid; s_plan uuid;
  s_planj uuid; s_melh uuid; s_gov uuid;
  s_fallback uuid;
BEGIN
  -- 1) Desativar todas as categorias atuais (preserva histórico)
  UPDATE public.categories SET is_active = false WHERE organization_id = _org;

  -- 2) Macros
  INSERT INTO public.categories(name, level, parent_id, organization_id, is_active) VALUES ('Chamados Excluídos','macro',NULL,_org,true) RETURNING id INTO m_excluidos;
  INSERT INTO public.categories(name, level, parent_id, organization_id, is_active) VALUES ('Suporte & Operação','macro',NULL,_org,true) RETURNING id INTO m_suporte;
  INSERT INTO public.categories(name, level, parent_id, organization_id, is_active) VALUES ('Hardware & CFTV','macro',NULL,_org,true) RETURNING id INTO m_hardware;
  INSERT INTO public.categories(name, level, parent_id, organization_id, is_active) VALUES ('Redes & Infraestrutura','macro',NULL,_org,true) RETURNING id INTO m_redes;
  INSERT INTO public.categories(name, level, parent_id, organization_id, is_active) VALUES ('Sistemas & Desenvolvimento','macro',NULL,_org,true) RETURNING id INTO m_sistemas;
  INSERT INTO public.categories(name, level, parent_id, organization_id, is_active) VALUES ('Dados, Relatórios & Documentação','macro',NULL,_org,true) RETURNING id INTO m_dados;
  INSERT INTO public.categories(name, level, parent_id, organization_id, is_active) VALUES ('Gestão & Estratégico','macro',NULL,_org,true) RETURNING id INTO m_gestao;
  INSERT INTO public.categories(name, level, parent_id, organization_id, is_active) VALUES ('Avulso','macro',NULL,_org,true) RETURNING id INTO m_avulso;

  -- 3) Sistemas
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Excluído','sistema',m_excluidos,_org,true) RETURNING id INTO s_excluido;

  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Usuário','sistema',m_suporte,_org,true) RETURNING id INTO s_usuario;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Acessos & Identidade','sistema',m_suporte,_org,true) RETURNING id INTO s_acessos;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Equipamentos & Logística','sistema',m_suporte,_org,true) RETURNING id INTO s_equip;

  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('CFTV','sistema',m_hardware,_org,true) RETURNING id INTO s_cftv;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Formatação & Manutenção','sistema',m_hardware,_org,true) RETURNING id INTO s_format;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Preventivas Mensais','sistema',m_hardware,_org,true) RETURNING id INTO s_prev;

  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Cabeamento & Crimpagem','sistema',m_redes,_org,true) RETURNING id INTO s_cabo;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Conectividade & WiFi','sistema',m_redes,_org,true) RETURNING id INTO s_conect;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Servidor','sistema',m_redes,_org,true) RETURNING id INTO s_servidor;

  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('n8n','sistema',m_sistemas,_org,true) RETURNING id INTO s_n8n;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('API','sistema',m_sistemas,_org,true) RETURNING id INTO s_api;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('SQL','sistema',m_sistemas,_org,true) RETURNING id INTO s_sql;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('PowerBI','sistema',m_sistemas,_org,true) RETURNING id INTO s_pbi;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Kommo','sistema',m_sistemas,_org,true) RETURNING id INTO s_kommo;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Manychat','sistema',m_sistemas,_org,true) RETURNING id INTO s_manychat;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Meta / FB API','sistema',m_sistemas,_org,true) RETURNING id INTO s_meta;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('UazApi','sistema',m_sistemas,_org,true) RETURNING id INTO s_uazapi;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('GoTo','sistema',m_sistemas,_org,true) RETURNING id INTO s_goto;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Service ERP','sistema',m_sistemas,_org,true) RETURNING id INTO s_service;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Protrack','sistema',m_sistemas,_org,true) RETURNING id INTO s_protrack;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Lovable','sistema',m_sistemas,_org,true) RETURNING id INTO s_lovable;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Gmail','sistema',m_sistemas,_org,true) RETURNING id INTO s_gmail;

  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Relatórios','sistema',m_dados,_org,true) RETURNING id INTO s_rel;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Documentação','sistema',m_dados,_org,true) RETURNING id INTO s_doc;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Planilhas','sistema',m_dados,_org,true) RETURNING id INTO s_plan;

  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Planejamento & Alinhamento','sistema',m_gestao,_org,true) RETURNING id INTO s_planj;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Melhoria de Processos','sistema',m_gestao,_org,true) RETURNING id INTO s_melh;
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Governança de TI','sistema',m_gestao,_org,true) RETURNING id INTO s_gov;

  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active) VALUES ('Fallback','sistema',m_avulso,_org,true) RETURNING id INTO s_fallback;

  -- 4) Items
  INSERT INTO public.categories(name,level,parent_id,organization_id,is_active,score) VALUES
    ('Improdutivo','item',s_excluido,_org,true,0),
    ('Duplicado','item',s_excluido,_org,true,0),

    ('Suporte Trivial (N1)','item',s_usuario,_org,true,1),
    ('Suporte Padrão (N2)','item',s_usuario,_org,true,3),
    ('Suporte Complexo (N3)','item',s_usuario,_org,true,5),

    ('Liberação de acesso / link','item',s_acessos,_org,true,1),
    ('Redefinição de senha','item',s_acessos,_org,true,1),
    ('Adição / Edição de acesso','item',s_acessos,_org,true,2),
    ('Criação de usuário / acesso','item',s_acessos,_org,true,2),
    ('Onboarding','item',s_acessos,_org,true,2),
    ('Offboarding','item',s_acessos,_org,true,2),

    ('Entrega de equipamento / periférico','item',s_equip,_org,true,1),
    ('Suporte endpoint (impressora / áudio / periféricos / pilha)','item',s_equip,_org,true,1),
    ('Movimentação de item (entrega / recebimento / substituição)','item',s_equip,_org,true,2),
    ('Erro Windows / SO','item',s_equip,_org,true,3),
    ('Troca de componentes','item',s_equip,_org,true,3),

    ('Análise de filmagem','item',s_cftv,_org,true,1),
    ('Adição de câmera no DVR','item',s_cftv,_org,true,1),
    ('Instalação de câmera','item',s_cftv,_org,true,2),
    ('Passagem de cabo (CFTV)','item',s_cftv,_org,true,2),
    ('Manutenção câmera / DVR','item',s_cftv,_org,true,2),
    ('Verificação semanal','item',s_cftv,_org,true,3),

    ('Formatação padrão','item',s_format,_org,true,3),
    ('Limpeza interna e otimização','item',s_format,_org,true,3),
    ('Backup + formatação completa','item',s_format,_org,true,5),

    ('Preventiva padrão','item',s_prev,_org,true,1),
    ('Preventiva premium','item',s_prev,_org,true,2),
    ('Preventiva servidor','item',s_prev,_org,true,7),

    ('Crimpagem RJ45','item',s_cabo,_org,true,1),
    ('Instalação caixa RJ45','item',s_cabo,_org,true,2),
    ('Passagem de cabo simples','item',s_cabo,_org,true,2),
    ('Passagem de cabo estrutura complexa','item',s_cabo,_org,true,5),

    ('Ajuste cabo de rede','item',s_conect,_org,true,1),
    ('Identificação de problema de rede','item',s_conect,_org,true,2),
    ('Ajuste / correção WiFi','item',s_conect,_org,true,2),
    ('Amarrar IP em AP (UniFi)','item',s_conect,_org,true,2),
    ('Análise e diagnóstico de rede','item',s_conect,_org,true,2),
    ('Instalação / configuração de equipamento','item',s_conect,_org,true,4),
    ('Configuração VLAN','item',s_conect,_org,true,5),

    ('Apagar BKPs antigos','item',s_servidor,_org,true,2),
    ('Liberar espaço em disco','item',s_servidor,_org,true,2),
    ('Organização de cabos','item',s_servidor,_org,true,4),
    ('Manutenção sistema servidor','item',s_servidor,_org,true,7),
    ('Reinstalação serviço crítico','item',s_servidor,_org,true,9),

    ('Manutenção workflow','item',s_n8n,_org,true,3),
    ('Integração API externa','item',s_n8n,_org,true,3),
    ('Criação workflow simples','item',s_n8n,_org,true,4),
    ('Implementação de melhoria','item',s_n8n,_org,true,5),
    ('Refatoração workflow','item',s_n8n,_org,true,6),
    ('Criação workflow complexo (múltiplos nós)','item',s_n8n,_org,true,9),

    ('Estudo de documentação','item',s_api,_org,true,2),
    ('Implementação de endpoint','item',s_api,_org,true,2),
    ('Integração n8n / API','item',s_api,_org,true,4),
    ('Debug de integração','item',s_api,_org,true,5),

    ('Manutenção query simples','item',s_sql,_org,true,2),
    ('Criação query simples','item',s_sql,_org,true,3),
    ('Ajuste de view','item',s_sql,_org,true,4),
    ('Manutenção query complexa','item',s_sql,_org,true,5),
    ('Refatoração / otimização','item',s_sql,_org,true,6),
    ('Criação query complexa','item',s_sql,_org,true,7),
    ('Criação de view','item',s_sql,_org,true,8),

    ('Manutenção dashboard','item',s_pbi,_org,true,3),
    ('Criação dashboard simples','item',s_pbi,_org,true,4),
    ('Melhoria de performance do modelo','item',s_pbi,_org,true,5),
    ('Criação dashboard gerencial','item',s_pbi,_org,true,7),

    ('Conexão de chip','item',s_kommo,_org,true,1),
    ('Criação tags / funis','item',s_kommo,_org,true,1),
    ('Criação automação (Simples)','item',s_kommo,_org,true,2),
    ('Ajuste automação existente','item',s_kommo,_org,true,3),
    ('Correção bug / fluxo','item',s_kommo,_org,true,3),
    ('Criação automação (Padrão)','item',s_kommo,_org,true,4),
    ('Correção bug / fluxo (Complexo)','item',s_kommo,_org,true,5),
    ('Criação automação (Avançado)','item',s_kommo,_org,true,7),

    ('Conectar rede social','item',s_manychat,_org,true,1),
    ('Edição em automação','item',s_manychat,_org,true,1),
    ('Criação automação (Simples)','item',s_manychat,_org,true,2),
    ('Criação automação (Padrão)','item',s_manychat,_org,true,4),

    ('Adesão Meta Verified','item',s_meta,_org,true,2),

    ('Ajuste de instância','item',s_uazapi,_org,true,1),
    ('Configuração novo chip','item',s_uazapi,_org,true,2),

    ('Suporte usuário plataforma','item',s_goto,_org,true,1),
    ('Criação relatório simples','item',s_goto,_org,true,2),
    ('Manutenção relatório','item',s_goto,_org,true,2),
    ('Suporte na plataforma','item',s_goto,_org,true,3),
    ('Ajuste em automação de dados','item',s_goto,_org,true,3),
    ('Suporte integração API / planilha','item',s_goto,_org,true,5),

    ('Atualização Service','item',s_service,_org,true,2),
    ('Suporte N1 usuário','item',s_service,_org,true,2),
    ('Suporte N2 parametrização','item',s_service,_org,true,4),

    ('Manutenção pasta','item',s_protrack,_org,true,1),
    ('Integração com ERP','item',s_protrack,_org,true,3),
    ('Ajuste integração','item',s_protrack,_org,true,5),

    ('Manutenção projeto','item',s_lovable,_org,true,3),
    ('Evolução de funcionalidade','item',s_lovable,_org,true,5),
    ('Refatoração fluxo backend','item',s_lovable,_org,true,5),
    ('Integração n8n','item',s_lovable,_org,true,6),
    ('Criação projeto','item',s_lovable,_org,true,7),

    ('Configuração API','item',s_gmail,_org,true,4),
    ('Ajuste DNS / email','item',s_gmail,_org,true,4),

    ('Relatório simples','item',s_rel,_org,true,1),
    ('Criação de relatório','item',s_rel,_org,true,3),
    ('Ajuste ETL','item',s_rel,_org,true,3),
    ('Criação de relatório automatizado','item',s_rel,_org,true,4),
    ('Integração dashboard com API','item',s_rel,_org,true,6),

    ('Criação de documentação','item',s_doc,_org,true,3),
    ('Criação de documentação complexa','item',s_doc,_org,true,7),

    ('Ajuste de inconsistência','item',s_plan,_org,true,2),

    ('Definição de plano de ação','item',s_planj,_org,true,3),

    ('Melhoria de processo (Padrão)','item',s_melh,_org,true,3),
    ('Melhoria de processo (Complexo)','item',s_melh,_org,true,5),
    ('Melhoria de processo (Avançado)','item',s_melh,_org,true,7),
    ('Redução de custos / automação','item',s_melh,_org,true,9),
    ('Implantação de nova IA','item',s_melh,_org,true,10),
    ('Reestruturação de setor','item',s_melh,_org,true,10),

    ('Contagem de estoque','item',s_gov,_org,true,4),

    ('Avulso Trivial','item',s_fallback,_org,true,1),
    ('Avulso Simples','item',s_fallback,_org,true,2),
    ('Avulso Padrão','item',s_fallback,_org,true,3),
    ('Avulso Complexo','item',s_fallback,_org,true,5),
    ('Avulso Avançado','item',s_fallback,_org,true,8),
    ('Avulso Estrutural','item',s_fallback,_org,true,10);
END $$;
