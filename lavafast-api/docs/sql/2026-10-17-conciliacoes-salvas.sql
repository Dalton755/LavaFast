-- Arquivo privado e fotografia imutável da conciliação Localiza (Mooca/Central Plaza).
-- O acesso é exclusivamente pelo backend autenticado, com perfil financeiro validado.
create table if not exists financeiro.conciliacoes_salvas (
  id uuid primary key default gen_random_uuid(),
  usuario_auth_id uuid not null references auth.users(id) on delete restrict,
  usuario_nome text not null,
  usuario_email text not null,
  nome_consulta text not null check (char_length(trim(nome_consulta)) between 2 and 120),
  loja text not null check (loja in ('MOOCA', 'CENTRAL_PLAZA')),
  data_inicial date not null,
  data_final date not null,
  consultado_em timestamptz not null default now(),
  arquivo_nome text not null,
  arquivo_path text not null unique,
  pagamentos jsonb not null,
  resultado jsonb not null,
  criado_em timestamptz not null default now(),
  constraint periodo_conciliacao_valido check (data_inicial <= data_final)
);

create index if not exists conciliacoes_salvas_usuario_data_idx
  on financeiro.conciliacoes_salvas (usuario_auth_id, consultado_em desc);

alter table financeiro.conciliacoes_salvas enable row level security;
revoke all on financeiro.conciliacoes_salvas from anon, authenticated;

-- Storage privado, sem política de acesso para cliente; somente service_role do backend.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lavafast-conciliacoes',
  'lavafast-conciliacoes',
  false,
  8388608,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
on conflict (id) do nothing;
