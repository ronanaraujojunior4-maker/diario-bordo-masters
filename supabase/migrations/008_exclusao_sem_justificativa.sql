-- Exclusão de viagens e abastecimentos sem justificativa obrigatória (decisão do usuário, 25/11/2026).
-- Continua: exclusão lógica, confirmação na tela, permissões (funcionário só os próprios; administrador todos) e auditoria EXCLUSAO
-- com quem excluiu (excluido_por), quando (excluido_em) e os dados anteriores (audit_log.detalhes.antes).
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
    new.excluido_em := now(); new.excluido_por := auth.uid();
    new.motivo_exclusao := nullif(trim(coalesce(new.motivo_exclusao, '')), '');
  end if;
  return new;
end $$;
revoke execute on function public.protege_registro() from public, anon, authenticated;
