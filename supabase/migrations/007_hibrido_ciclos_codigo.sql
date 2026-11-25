-- 1) Perfil híbrido: administrador que também opera veículo (RONAN). Configurável por usuário (opera_veiculos).
--    MASTERS continua exclusivamente administrativo (opera_veiculos = false).
alter table public.profiles add column if not exists opera_veiculos boolean not null default false;

create or replace function public.pode_operar() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and ativo and excluido_em is null and (papel = 'func' or opera_veiculos));
$$;
revoke all on function public.pode_operar() from public, anon;
grant execute on function public.pode_operar() to authenticated;

create or replace function public.bloqueia_admin_operacional() returns trigger
language plpgsql set search_path = public as $$
declare alvo uuid;
begin
  if tg_table_name = 'vehicles' then alvo := new.responsavel_padrao;
  else alvo := (to_jsonb(new)->>'user_id')::uuid; end if;
  if alvo is not null and exists(select 1 from profiles where id = alvo and papel = 'admin' and not opera_veiculos) then
    raise exception 'Administrador exclusivamente administrativo não pode ser responsável por veículo.';
  end if;
  return new;
end $$;

create or replace function public.assumir_veiculo(p_vehicle uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  if not pode_operar() then raise exception 'Esta conta é exclusivamente administrativa e não assume veículos.'; end if;
  if exists (select 1 from vehicles where id = p_vehicle and (excluido_em is not null or not ativo)) then raise exception 'Veículo inativo ou excluído.'; end if;
  if not exists (select 1 from vehicle_authorizations where vehicle_id = p_vehicle and user_id = auth.uid())
     and not exists (select 1 from vehicles where id = p_vehicle and responsavel_padrao = auth.uid()) then
    raise exception 'Você não está autorizado a usar este veículo.';
  end if;
  insert into vehicle_usage(vehicle_id, user_id) values (p_vehicle, auth.uid()) returning id into novo;
  return novo;
end $$;

alter policy trips_ins on public.trips with check (
  (user_id = auth.uid() and pode_operar() and usando_veiculo(vehicle_id) and origem = 'app' and chave_import is null)
  or (is_admin() and origem = 'importacao'));
alter policy fuel_ins on public.fuelings with check (
  (user_id = auth.uid() and pode_operar() and usando_veiculo(vehicle_id) and origem = 'app' and chave_import is null)
  or (is_admin() and origem = 'importacao'));

-- 2) Último abastecimento válido de cada veículo (referência do ciclo nos indicadores; uma linha por veículo).
create or replace view public.vehicle_last_fueling with (security_invoker = on) as
select distinct on (vehicle_id) vehicle_id, id as fueling_id, data, hora, km, litros
from public.fuelings where excluido_em is null
order by vehicle_id, data desc, hora desc, criado_em desc;

-- 3) Códigos de recuperação gerados pelo administrador (guardados só como hash; gerados e validados na função de servidor).
create table if not exists public.recovery_codes (
  id            bigserial primary key,
  user_id       uuid not null references public.profiles(id),
  code_hash     text not null,
  criado_por    uuid not null references public.profiles(id),
  criado_em     timestamptz not null default now(),
  expira_em     timestamptz not null,
  usado_em      timestamptz,
  revogado_em   timestamptz,
  revogado_por  uuid references public.profiles(id),
  tentativas    int not null default 0,
  pedido_id     bigint references public.access_requests(id)
);
create index if not exists recovery_codes_user on public.recovery_codes (user_id, criado_em desc);
alter table public.recovery_codes enable row level security;
create policy rc_sel on public.recovery_codes for select to authenticated using (is_admin());
create trigger audit_recovery_codes after insert or update on public.recovery_codes for each row execute function public.audit_trigger();
