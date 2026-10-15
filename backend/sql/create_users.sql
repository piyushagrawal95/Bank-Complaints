create table if not exists users(
    id BIGINT generated always as identity primary key,
    email text not null unique,
    password_hash text not null,
    full_name text,
    role text not null default 'agent' check(role in ('agent','supervisor','admin')),
    is_active boolean not null default true,
    created_at timestamptz not null default now()

)