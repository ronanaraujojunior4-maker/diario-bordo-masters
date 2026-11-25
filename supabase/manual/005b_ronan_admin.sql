-- Colar no Supabase: SQL Editor → New query → Run. Não apaga viagens, abastecimentos nem histórico.
begin;
-- 1) Permite mais de um administrador
drop index if exists public.profiles_um_admin;
-- 2) Permite encerrar o uso de veículo de quem virou administrador (assumir continua bloqueado)
create or replace trigger usage_sem_admin before insert on public.vehicle_usage
  for each row execute function public.bloqueia_admin_operacional();
-- 3) Libera o veículo que está com o RONAN, com justificativa (fica na auditoria)
update public.vehicle_usage set status = 'encerrada', fim = now(),
  liberado_por = (select id from public.profiles where usuario = 'MASTERS'),
  justificativa = 'RONAN promovido a administrador (decisão de 25/11/2026)'
where status = 'ativa' and user_id = (select id from public.profiles where usuario = 'RONAN');
-- 4) Retira o RONAN da responsabilidade e das autorizações de veículos
update public.vehicles set responsavel_padrao = null where responsavel_padrao = (select id from public.profiles where usuario = 'RONAN');
delete from public.vehicle_authorizations where user_id = (select id from public.profiles where usuario = 'RONAN');
-- 5) RONAN passa a ser administrador
update public.profiles set papel = 'admin' where usuario = 'RONAN';
commit;
select usuario, papel from public.profiles order by usuario;
