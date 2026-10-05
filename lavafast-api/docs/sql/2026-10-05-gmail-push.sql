alter table operacoes.importacoes_email
    add column if not exists tentativas integer not null default 0,
    add column if not exists gmail_history_id text,
    add column if not exists quantidade_registros integer not null default 0,
    add column if not exists recebido_em timestamptz;

create table if not exists operacoes.gmail_sync_state (
    source varchar(50) primary key,
    history_id text,
    watch_expiration timestamptz,
    email_address text,
    label_id text,
    last_notification_history_id text,
    last_sync_at timestamptz,
    last_watch_at timestamptz,
    last_reconciliation_at timestamptz,
    last_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table operacoes.gmail_sync_state enable row level security;

create index if not exists idx_importacoes_email_status_updated
    on operacoes.importacoes_email (status, updated_at desc);
