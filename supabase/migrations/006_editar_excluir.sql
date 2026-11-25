-- Edição e exclusão com rastreabilidade. Exclusão é LÓGICA (arquivamento): nada que tenha vínculo é apagado fisicamente.
-- Permissões aplicadas no banco: funcionário só altera/exclui os próprios registros; administrador altera/exclui qualquer um,
-- com justificativa obrigatória para excluir registro de outra pessoa e para arquivar veículo ou usuário.

alter table public.trips    add column if not exists excluido_em timestamptz, add column if not exists excluido_por uuid references public.profiles(id), add column if not exists motivo_exclusao text;
alter table public.fuelings add column if not exists excluido_em timestamptz, add column if not exists excluido_por uuid references public.profiles(id), add column if not exists motivo_exclusao text;
alter table public.vehicles add column if not exists excluido_em timestamptz, add column if not exists excluido_por uuid references public.profiles(id), add column if not exists motivo_exclusao text;
alter table public.profiles add column if not exists excluido_em timestamptz, add column if not exists motivo_exclusao text;

-- Viagens e abastecimentos: o que cada perfil pode mudar.
create or replace function public.protege_registro() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if old.excluido_em is not null then raise exception 'Registro excluído não pode ser alterado.'; end if;
    if new.user_id <> old.user_id or new.vehicle_id <> old.vehicle_id or new.origem <> old.origem
       or new.chave_import is distinct from old.chave_import or new.criado_em <> old.criado_em then
      raise exception 'Alteração não permitida para o seu perfil.';
    end if;
  end if;
  if old.excluido_em is null and new.excluido_em is not null then
    if auth.uid() is not null and new.user_id <> auth.uid() and coalesce(trim(new.motivo_exclusao), '') = '' then
      raise exception 'Exclusão de registro de outra pessoa exige justificativa.';
    end if;
    new.excluido_em := now(); new.excluido_por := auth.uid();
  end if;
  return new;
end $$;
create trigger trips_protege before update on public.trips for each row execute function public.protege_registro();
create trigger fuelings_protege before update on public.fuelings for each row execute function public.protege_registro();

-- Nada de exclusão física de viagens e abastecimentos (nem pelo administrador): preserva histórico e auditoria.
alter policy trips_del on public.trips using (false);
alter policy fuel_del on public.fuelings using (false);

-- Veículo: arquivar exige justificativa e veículo livre.
create or replace function public.protege_veiculo() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.excluido_em is null and new.excluido_em is not null then
    if coalesce(trim(new.motivo_exclusao), '') = '' then raise exception 'Informe a justificativa para excluir o veículo.'; end if;
    if exists (select 1 from vehicle_usage where vehicle_id = new.id and status = 'ativa') then raise exception 'Libere o veículo antes de excluí-lo.'; end if;
    new.excluido_em := now(); new.excluido_por := auth.uid(); new.ativo := false; new.responsavel_padrao := null;
  end if;
  return new;
end $$;
create trigger vehicles_protege before update on public.vehicles for each row execute function public.protege_veiculo();

-- Usuários: nunca deixar o sistema sem administrador ativo.
create or replace function public.protege_admin() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.papel = 'admin' and old.ativo and (new.papel <> 'admin' or not new.ativo or new.excluido_em is not null)
     and not exists (select 1 from profiles where papel = 'admin' and ativo and excluido_em is null and id <> old.id) then
    raise exception 'Não é possível remover o último administrador ativo.';
  end if;
  if old.excluido_em is null and new.excluido_em is not null and exists (select 1 from vehicle_usage where user_id = new.id and status = 'ativa') then
    raise exception 'Este usuário está com um veículo. Libere o veículo antes de excluí-lo.';
  end if;
  return new;
end $$;
create trigger profiles_protege_admin before update on public.profiles for each row execute function public.protege_admin();

revoke execute on function public.protege_registro(), public.protege_veiculo(), public.protege_admin() from public, anon, authenticated;

-- Indicadores ignoram registros excluídos (última km volta a refletir só registros válidos).
create or replace view public.vehicle_last_km with (security_invoker = on) as
select v.id as vehicle_id,
       greatest(v.km_inicial, coalesce(max(t.km_chegada), 0)) as ultima_km,
       max(t.data) as ultima_data
from public.vehicles v left join public.trips t on t.vehicle_id = v.id and t.excluido_em is null
group by v.id;

create or replace view public.trip_inconsistencies with (security_invoker = on) as
select * from (
  select t.id, t.vehicle_id, t.user_id, t.data, t.hora_saida, t.hora_chegada, t.km_saida, t.km_chegada, t.origem_destino, t.motorista,
         t.finalidade, t.visto, t.usuario_texto, t.obs, t.origem, t.chave_import, t.criado_em, lag(t.km_chegada) over (partition by t.vehicle_id order by t.data, t.hora_saida, t.criado_em) as km_anterior
  from public.trips t where t.excluido_em is null) x
where km_anterior is not null and km_saida <> km_anterior;

-- Veículo arquivado não pode ser assumido.
create or replace function public.assumir_veiculo(p_vehicle uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  if is_admin() then raise exception 'Conta de administrador não assume veículos.'; end if;
  if exists (select 1 from vehicles where id = p_vehicle and (excluido_em is not null or not ativo)) then raise exception 'Veículo inativo ou excluído.'; end if;
  if not exists (select 1 from vehicle_authorizations where vehicle_id = p_vehicle and user_id = auth.uid())
     and not exists (select 1 from vehicles where id = p_vehicle and responsavel_padrao = auth.uid()) then
    raise exception 'Você não está autorizado a usar este veículo.';
  end if;
  insert into vehicle_usage(vehicle_id, user_id) values (p_vehicle, auth.uid()) returning id into novo;
  return novo;
end $$;

-- Auditoria: exclusão lógica aparece como EXCLUSAO (com os dados de antes e a justificativa).
create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end); op text := tg_op;
begin
  if tg_op = 'UPDATE' and (to_jsonb(old)->>'excluido_em') is null and (to_jsonb(new)->>'excluido_em') is not null then op := 'EXCLUSAO'; end if;
  insert into audit_log(acao, entidade, entidade_id, detalhes)
  values (op, tg_table_name, coalesce(r->>'id', r->>'user_id'),
          jsonb_build_object('antes', case when tg_op<>'INSERT' then to_jsonb(old) end,
                             'depois', case when tg_op<>'DELETE' then to_jsonb(new) end));
  return coalesce(new, old);
end $$;
