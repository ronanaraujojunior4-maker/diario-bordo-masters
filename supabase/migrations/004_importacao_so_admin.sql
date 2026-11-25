-- Registros marcados como importação (e com chave_import) só podem ser gravados pelo administrador.
alter policy trips_ins on public.trips with check (
  (user_id = auth.uid() and not is_admin() and usando_veiculo(vehicle_id) and origem = 'app' and chave_import is null)
  or (is_admin() and origem = 'importacao'));
alter policy fuel_ins on public.fuelings with check (
  (user_id = auth.uid() and not is_admin() and usando_veiculo(vehicle_id) and origem = 'app' and chave_import is null)
  or (is_admin() and origem = 'importacao'));
