-- Recuperação de senha e acesso + mais de um administrador (MASTERS e RONAN).
-- Senhas nunca ficam no banco do app: só no Supabase Auth (hash). Envio do link e senha temporária: função de servidor "usuarios".

-- 1) Vários administradores (decisão do usuário em 2026-11-25). Administrador continua sem operar veículos.
drop index if exists public.profiles_um_admin;
create or replace function public.bloqueia_admin_operacional() returns trigger
language plpgsql set search_path = public as $$
declare alvo uuid;
begin
  if tg_table_name = 'vehicles' then alvo := new.responsavel_padrao;
  else alvo := (to_jsonb(new)->>'user_id')::uuid; end if;
  if alvo is not null and exists(select 1 from profiles where id = alvo and papel = 'admin') then
    raise exception 'Administrador não pode ser responsável operacional por veículo.';
  end if;
  return new;
end $$;
-- Encerrar um uso antigo de quem virou administrador continua permitido.
drop trigger if exists usage_sem_admin on public.vehicle_usage;
create trigger usage_sem_admin before insert on public.vehicle_usage for each row execute function public.bloqueia_admin_operacional();

create or replace function public.assumir_veiculo(p_vehicle uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  if is_admin() then raise exception 'Conta de administrador não assume veículos.'; end if;
  if not exists (select 1 from vehicle_authorizations where vehicle_id = p_vehicle and user_id = auth.uid())
     and not exists (select 1 from vehicles where id = p_vehicle and responsavel_padrao = auth.uid()) then
    raise exception 'Você não está autorizado a usar este veículo.';
  end if;
  insert into vehicle_usage(vehicle_id, user_id) values (p_vehicle, auth.uid()) returning id into novo;
  return novo;
end $$;

-- 2) Troca obrigatória de senha após senha temporária.
alter table public.profiles add column if not exists trocar_senha boolean not null default false;
create or replace function public.senha_trocada() returns void
language sql security definer set search_path = public as $$
  update profiles set trocar_senha = false where id = auth.uid() and trocar_senha;
$$;
revoke all on function public.senha_trocada() from public, anon;
grant execute on function public.senha_trocada() to authenticated;

-- 3) E-mail de recuperação: separado de profiles para que funcionários não vejam o e-mail dos colegas.
create table if not exists public.profile_private (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  email_recuperacao text check (email_recuperacao is null or email_recuperacao ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  atualizado_em     timestamptz not null default now()
);
create unique index if not exists profile_private_email on public.profile_private (lower(email_recuperacao)) where email_recuperacao is not null;
alter table public.profile_private enable row level security;
create policy pp_sel on public.profile_private for select to authenticated using (is_admin() or user_id = auth.uid());
create policy pp_adm on public.profile_private for all to authenticated using (is_admin()) with check (is_admin());

-- 4) Pedidos de ajuda administrativa (gravados só pela função de servidor; lidos só por administradores).
create table if not exists public.access_requests (
  id                bigserial primary key,
  criado_em         timestamptz not null default now(),
  usuario_informado text not null check (length(usuario_informado) <= 60),
  nome_informado    text check (length(nome_informado) <= 120),
  contato           text check (length(contato) <= 120),
  mensagem          text check (length(mensagem) <= 600),
  user_id           uuid references public.profiles(id),
  status            text not null default 'aberta' check (status in ('aberta','atendida','recusada')),
  verificacao       text,
  resolucao         text,
  atendido_por      uuid references public.profiles(id),
  atendido_em       timestamptz
);
create index if not exists access_requests_status on public.access_requests (status, criado_em desc);
alter table public.access_requests enable row level security;
create policy ar_sel on public.access_requests for select to authenticated using (is_admin());

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
begin
  insert into audit_log(acao, entidade, entidade_id, detalhes)
  values (tg_op, tg_table_name, coalesce(r->>'id', r->>'user_id'),
          jsonb_build_object('antes', case when tg_op<>'INSERT' then to_jsonb(old) end,
                             'depois', case when tg_op<>'DELETE' then to_jsonb(new) end));
  return coalesce(new, old);
end $$;
create trigger audit_profile_private after insert or update or delete on public.profile_private for each row execute function public.audit_trigger();
create trigger audit_access_requests after insert or update or delete on public.access_requests for each row execute function public.audit_trigger();
