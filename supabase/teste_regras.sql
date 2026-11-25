-- Teste das regras de negócio (rodar em banco de teste, nunca em produção). Resultado em 2026-11-25: todas as regras passaram.
\set ON_ERROR_STOP 0
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
insert into profiles values ('00000000-0000-0000-0000-000000000001','MASTERS','Masters','admin'),('00000000-0000-0000-0000-000000000002','RONAN','Ronan','func'),('00000000-0000-0000-0000-000000000003','ECCLE','Eccleston','func');
insert into vehicles(id,nome,placa,responsavel_padrao,km_inicial) values ('10000000-0000-0000-0000-000000000001','Fiat Mobi','TYD5C39','00000000-0000-0000-0000-000000000002',1000);
insert into vehicle_authorizations values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003');
-- T1 admin como responsável (deve falhar)
update vehicles set responsavel_padrao='00000000-0000-0000-0000-000000000001';
set app.uid='00000000-0000-0000-0000-000000000001';
select assumir_veiculo('10000000-0000-0000-0000-000000000001'); -- T2 deve falhar
set app.uid='00000000-0000-0000-0000-000000000002';
select assumir_veiculo('10000000-0000-0000-0000-000000000001') is not null as ronan_assumiu;
set app.uid='00000000-0000-0000-0000-000000000003';
select assumir_veiculo('10000000-0000-0000-0000-000000000001'); -- T3 simultâneo deve falhar
select liberar_veiculo('10000000-0000-0000-0000-000000000001'); -- T4 terceiro deve falhar
insert into trips(id,vehicle_id,user_id,data,km_saida,km_chegada,origem_destino,motorista) values (gen_random_uuid(),'10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','2026-11-20',1000,1050,'A','R');
insert into trips(id,vehicle_id,user_id,data,km_saida,km_chegada,origem_destino,motorista) values (gen_random_uuid(),'10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','2026-11-21',1040,1060,'B','R'); -- T5 deve falhar (<1050)
insert into trips(id,vehicle_id,user_id,data,km_saida,km_chegada,origem_destino,motorista,origem) values (gen_random_uuid(),'10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','2026-11-01',900,950,'antiga','R','importacao');
select ultima_km from vehicle_last_km; -- esperado 1050
select count(*) inconsist from trip_inconsistencies; -- 1 (1000 vs 950)
set app.uid='00000000-0000-0000-0000-000000000001';
select liberar_veiculo('10000000-0000-0000-0000-000000000001'); -- T6 sem justificativa falha
select liberar_veiculo('10000000-0000-0000-0000-000000000001','Funcionário esqueceu de liberar') ; 
select status, justificativa from vehicle_usage;
select acao, entidade from audit_log order by id desc limit 3;
