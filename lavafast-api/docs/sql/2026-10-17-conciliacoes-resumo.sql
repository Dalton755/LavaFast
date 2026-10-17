-- O resumo de cada consulta fica disponível sem transferir todas as linhas salvas.
alter table financeiro.conciliacoes_salvas
  add column if not exists resumo jsonb not null default '{}'::jsonb;
