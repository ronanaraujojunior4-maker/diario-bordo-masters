-- Tanque cheio no abastecimento: true = completou o tanque; false = parcial; null = não informado (registros antigos/importados).
alter table public.fuelings add column if not exists tanque_cheio boolean;
comment on column public.fuelings.tanque_cheio is 'true = tanque completado; false = parcial; null = não informado. Consumo médio usa intervalos entre dois abastecimentos com tanque cheio.';
