-- Diário de Bordo – Masters Engenharia · esquema inicial (Supabase / PostgreSQL)
-- Aplicar SOMENTE no projeto Supabase novo e exclusivo do Diário de Bordo.
-- Aplicado em 2026-11-25 no projeto diario-bordo-masters (org diario-bordo-masters, plano Free).

create extension if not exists pgcrypto;

-- ───────────────────────── Perfis ─────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  usuario     text not null unique,              -- login curto (ex.: RONAN, MASTERS)
  nome        text not null,
  papel       text not null default 'func' check (papel in ('admin','func')),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);
-- Garante um único administrador.
create unique index profiles_um_admin on public.profiles ((papel)) where papel = 'admin';

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and papel = 'admin' and ativo);
$$;

-- Perfil criado automaticamente quando o administrador cadastra o acesso em Authentication → Add user.
-- Login = parte do e-mail antes do @ (ex.: ronan@diario.masters → RONAN). Todos entram como funcionário.
-- Depois de criar o acesso MASTERS, rode uma vez:  update public.profiles set papel = 'admin' where usuario = 'MASTERS';
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, usuario, nome)
  values (new.id, upper(split_part(new.email, '@', 1)), initcap(split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ───────────────────────── Veículos ─────────────────────────
create table public.vehicles (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,                    -- ex.: Fiat Mobi
  modelo              text,
  placa               text not null,
  placa_norm          text generated always as (upper(regexp_replace(placa,'[^A-Za-z0-9]','','g'))) stored unique,
  responsavel_padrao  uuid references public.profiles(id),
  km_inicial          integer not null default 0 check (km_inicial >= 0),
  km_troca_oleo       integer,
  data_troca_oleo     date,
  ativo               boolean not null default true,
  obs                 text,
  criado_em           timestamptz not null default now()
);

create table public.vehicle_authorizations (
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  primary key (vehicle_id, user_id)
);

-- Uso/reserva do veículo. Um único uso ativo por veículo (impede uso simultâneo).
create table public.vehicle_usage (
  id             uuid primary key default gen_random_uuid(),
  vehicle_id     uuid not null references public.vehicles(id),
  user_id        uuid not null references public.profiles(id),
  status         text not null default 'ativa' check (status in ('ativa','encerrada')),
  inicio         timestamptz not null default now(),
  fim            timestamptz,
  liberado_por   uuid references public.profiles(id),
  justificativa  text
);
create unique index vehicle_usage_um_ativo on public.vehicle_usage (vehicle_id) where status = 'ativa';
create unique index vehicle_usage_um_por_usuario on public.vehicle_usage (user_id) where status = 'ativa';

-- ───────────────────────── Viagens ─────────────────────────
-- id gerado no aparelho (idempotência: reenvio do mesmo formulário não duplica).
create table public.trips (
  id             uuid primary key,
  vehicle_id     uuid not null references public.vehicles(id),
  user_id        uuid not null references public.profiles(id),
  data           date not null,
  hora_saida     time,
  hora_chegada   time,
  km_saida       integer not null check (km_saida >= 0),
  km_chegada     integer not null,
  origem_destino text not null,
  motorista      text not null,
  finalidade     text,
  visto          boolean not null default false,
  usuario_texto  text,                 -- coluna USUÁRIO do layout antigo
  obs            text,
  origem         text not null default 'app' check (origem in ('app','importacao')),
  chave_import   text unique,          -- placa|data|kmS|kmC|hS|hC|od|mot (mesma regra do app antigo)
  criado_em      timestamptz not null default now(),
  check (km_chegada >= km_saida)
);
create index trips_vehicle_ordem on public.trips (vehicle_id, data, hora_saida);

-- ───────────────────────── Abastecimentos ─────────────────────────
create table public.fuelings (
  id           uuid primary key,       -- gerado no aparelho (idempotência)
  vehicle_id   uuid not null references public.vehicles(id),
  user_id      uuid not null references public.profiles(id),
  trip_id      uuid references public.trips(id),
  data         date not null,
  hora         time not null,
  km           integer check (km >= 0),
  posto        text,
  combustivel  text check (combustivel in ('Gasolina','Etanol','Diesel','GNV','Outro')),
  litros       numeric(10,2) not null check (litros > 0),
  preco_litro  numeric(10,3) not null check (preco_litro > 0),
  total        numeric(12,2) not null check (total > 0),
  modalidade   text not null default 'avulso' check (modalidade in ('avulso','req','func')),
  obs          text,
  origem       text not null default 'app' check (origem in ('app','importacao')),
  chave_import text unique,            -- placa|data|hora|km|posto|total
  criado_em    timestamptz not null default now()
);

-- ───────────────────────── Auditoria ─────────────────────────
create table public.audit_log (
  id         bigserial primary key,
  em         timestamptz not null default now(),
  user_id    uuid default auth.uid(),
  acao       text not null,
  entidade   text not null,
  entidade_id text,
  detalhes   jsonb
);

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log(acao, entidade, entidade_id, detalhes)
  values (tg_op, tg_table_name,
          coalesce((case when tg_op='DELETE' then old.id else new.id end)::text, null),
          jsonb_build_object('antes', case when tg_op<>'INSERT' then to_jsonb(old) end,
                             'depois', case when tg_op<>'DELETE' then to_jsonb(new) end));
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['profiles','vehicles','vehicle_usage','trips','fuelings'] loop
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s
                    for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

-- ───────────────────────── Última km por veículo ─────────────────────────
-- Maior km de chegada entre viagens válidas de TODOS os usuários. Nunca retrocede:
-- uma viagem antiga sincronizada depois não reduz o valor.
create or replace view public.vehicle_last_km with (security_invoker = on) as
select v.id as vehicle_id,
       greatest(v.km_inicial, coalesce(max(t.km_chegada), 0)) as ultima_km,
       max(t.data) as ultima_data
from public.vehicles v left join public.trips t on t.vehicle_id = v.id
group by v.id;

-- Inconsistências: km de saída diferente da chegada anterior (ordem cronológica).
create or replace view public.trip_inconsistencies with (security_invoker = on) as
select * from (
  select t.*, lag(t.km_chegada) over (partition by t.vehicle_id order by t.data, t.hora_saida, t.criado_em) as km_anterior
  from public.trips t) x
where km_anterior is not null and km_saida <> km_anterior;

-- Regra: nova viagem não pode começar abaixo da última km (exceto importação histórica).
create or replace function public.trips_valida_km() returns trigger
language plpgsql security definer set search_path = public as $$
declare ult integer;
begin
  if new.origem = 'app' then
    select ultima_km into ult from vehicle_last_km where vehicle_id = new.vehicle_id;
    if new.km_saida < coalesce(ult,0) then
      raise exception 'KM de saída (%) menor que a última km registrada do veículo (%).', new.km_saida, ult;
    end if;
  end if;
  return new;
end $$;
create trigger trips_valida_km before insert on public.trips for each row execute function public.trips_valida_km();

-- ───────────────────────── Operações de uso ─────────────────────────
create or replace function public.assumir_veiculo(p_vehicle uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  if is_admin() then raise exception 'A conta MASTERS é administrativa e não assume veículos.'; end if;
  if not exists (select 1 from vehicle_authorizations where vehicle_id = p_vehicle and user_id = auth.uid())
     and not exists (select 1 from vehicles where id = p_vehicle and responsavel_padrao = auth.uid()) then
    raise exception 'Você não está autorizado a usar este veículo.';
  end if;
  insert into vehicle_usage(vehicle_id, user_id) values (p_vehicle, auth.uid()) returning id into novo;
  return novo;  -- índice único impede uso simultâneo
end $$;

create or replace function public.liberar_veiculo(p_vehicle uuid, p_justificativa text default null) returns void
language plpgsql security definer set search_path = public as $$
declare u vehicle_usage;
begin
  select * into u from vehicle_usage where vehicle_id = p_vehicle and status = 'ativa' for update;
  if not found then raise exception 'Veículo já está disponível.'; end if;
  if u.user_id <> auth.uid() then
    if not is_admin() then raise exception 'Somente quem está com o veículo ou o administrador pode liberá-lo.'; end if;
    if coalesce(trim(p_justificativa),'') = '' then raise exception 'Liberação administrativa exige justificativa.'; end if;
  end if;
  update vehicle_usage set status='encerrada', fim=now(), liberado_por=auth.uid(), justificativa=p_justificativa where id = u.id;
end $$;

-- Admin nunca é responsável padrão nem usuário de veículo.
create or replace function public.bloqueia_admin_operacional() returns trigger
language plpgsql set search_path = public as $$
declare alvo uuid;
begin
  if tg_table_name = 'vehicles' then alvo := new.responsavel_padrao;
  else alvo := (to_jsonb(new)->>'user_id')::uuid; end if;
  if alvo is not null and exists(select 1 from profiles where id = alvo and papel = 'admin') then
    raise exception 'MASTERS não pode ser responsável operacional por veículo.';
  end if;
  return new;
end $$;
create trigger vehicles_sem_admin before insert or update on public.vehicles for each row execute function public.bloqueia_admin_operacional();
create trigger usage_sem_admin before insert or update on public.vehicle_usage for each row execute function public.bloqueia_admin_operacional();
create trigger auth_sem_admin before insert or update on public.vehicle_authorizations for each row execute function public.bloqueia_admin_operacional();

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_authorizations enable row level security;
alter table public.vehicle_usage enable row level security;
alter table public.trips enable row level security;
alter table public.fuelings enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.pode_ver_veiculo(p_vehicle uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin()
      or exists (select 1 from vehicle_authorizations where vehicle_id = p_vehicle and user_id = auth.uid())
      or exists (select 1 from vehicles where id = p_vehicle and responsavel_padrao = auth.uid());
$$;

create or replace function public.usando_veiculo(p_vehicle uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from vehicle_usage where vehicle_id = p_vehicle and user_id = auth.uid() and status = 'ativa');
$$;

-- Perfis: cada um vê o próprio; admin vê e gerencia todos.
-- Nomes e logins são visíveis a todos os usuários autenticados (para exibir quem está com cada veículo).
create policy profiles_sel on public.profiles for select to authenticated using (true);
create policy profiles_adm on public.profiles for all to authenticated using (is_admin()) with check (is_admin());

-- Veículos: leitura dos autorizados; escrita só admin.
create policy vehicles_sel on public.vehicles for select to authenticated using (pode_ver_veiculo(id));
create policy vehicles_adm on public.vehicles for all to authenticated using (is_admin()) with check (is_admin());
create policy vauth_sel on public.vehicle_authorizations for select to authenticated using (user_id = auth.uid() or is_admin());
create policy vauth_adm on public.vehicle_authorizations for all to authenticated using (is_admin()) with check (is_admin());

-- Uso: leitura para quem vê o veículo; escrita somente pelas funções assumir/liberar.
create policy usage_sel on public.vehicle_usage for select to authenticated using (pode_ver_veiculo(vehicle_id));

-- Viagens e abastecimentos: funcionário lê os do veículo autorizado, cria os próprios
-- somente com o veículo assumido, edita só os próprios. Admin lê tudo e corrige com auditoria.
create policy trips_sel on public.trips for select to authenticated using (pode_ver_veiculo(vehicle_id));
create policy trips_ins on public.trips for insert to authenticated with check (
  (user_id = auth.uid() and not is_admin() and usando_veiculo(vehicle_id)) or (is_admin() and origem = 'importacao'));
create policy trips_upd on public.trips for update to authenticated using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());
create policy trips_del on public.trips for delete to authenticated using (is_admin());

create policy fuel_sel on public.fuelings for select to authenticated using (pode_ver_veiculo(vehicle_id));
create policy fuel_ins on public.fuelings for insert to authenticated with check (
  (user_id = auth.uid() and not is_admin() and usando_veiculo(vehicle_id)) or (is_admin() and origem = 'importacao'));
create policy fuel_upd on public.fuelings for update to authenticated using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());
create policy fuel_del on public.fuelings for delete to authenticated using (is_admin());

create policy audit_sel on public.audit_log for select to authenticated using (is_admin());

-- Funções só para usuários autenticados (nada para visitantes anônimos).
revoke execute on function public.is_admin(), public.pode_ver_veiculo(uuid), public.usando_veiculo(uuid),
  public.assumir_veiculo(uuid), public.liberar_veiculo(uuid, text), public.handle_new_user(), public.audit_trigger(),
  public.trips_valida_km(), public.bloqueia_admin_operacional() from public, anon;
grant execute on function public.is_admin(), public.pode_ver_veiculo(uuid), public.usando_veiculo(uuid),
  public.assumir_veiculo(uuid), public.liberar_veiculo(uuid, text) to authenticated;
revoke all on public.vehicle_last_km, public.trip_inconsistencies from anon;

-- Realtime somente no uso dos veículos (economia no plano gratuito)
alter publication supabase_realtime add table public.vehicle_usage;

-- Funções de gatilho não ficam expostas como RPC.
revoke execute on function public.handle_new_user(), public.audit_trigger(), public.trips_valida_km(), public.bloqueia_admin_operacional() from authenticated;
