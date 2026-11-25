-- Código de configuração inicial (só a função de servidor lê; nenhuma política = inacessível pelo app).
create table public.setup_code (codigo text primary key, criado_em timestamptz not null default now());
alter table public.setup_code enable row level security;
revoke all on public.setup_code from anon, authenticated;
insert into public.setup_code(codigo) values (upper(substr(md5(gen_random_uuid()::text), 1, 8)));
-- Indica se já existe administrador (para a tela de primeiro acesso).
create or replace function public.tem_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where papel = 'admin');
$$;
grant execute on function public.tem_admin() to anon, authenticated;
