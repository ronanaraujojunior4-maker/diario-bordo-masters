// Gestão de acessos por nome de usuário (sem e-mail para o usuário). Publicada no Supabase com verify_jwt = false
// (a própria função valida a sessão do administrador).
// O Supabase Auth exige um e-mail interno: USUARIO -> usuario@diario.masters (nunca exibido nem usado para envio).
// A chave service_role fica só no servidor (variável de ambiente da função).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const DOM = 'diario.masters';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const norm = (u: string) => String(u ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return out({ ok: true });
  try {
    const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const b = await req.json();
    const usuario = norm(b.usuario), senha = String(b.senha ?? ''), nome = String(b.nome ?? '').trim();
    const validaSenha = () => { if (senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.'); };

    if (b.acao === 'primeiro_acesso') { // cria MASTERS uma única vez, com o código de configuração
      const { data: tem } = await admin.from('profiles').select('id').eq('papel', 'admin').limit(1);
      if (tem?.length) return out({ erro: 'O administrador já foi configurado.' }, 409);
      const { data: cod } = await admin.from('setup_code').select('codigo').eq('codigo', String(b.codigo ?? '').trim().toUpperCase()).maybeSingle();
      if (!cod) return out({ erro: 'Código de configuração inválido.' }, 403);
      validaSenha();
      const { data: u, error } = await admin.auth.admin.createUser({ email: `masters@${DOM}`, password: senha, email_confirm: true });
      if (error) throw error;
      await admin.from('profiles').update({ papel: 'admin', nome: 'Administração Masters' }).eq('id', u.user.id);
      await admin.from('setup_code').delete().neq('codigo', '');
      await admin.from('audit_log').insert({ user_id: u.user.id, acao: 'PRIMEIRO_ACESSO', entidade: 'usuario', entidade_id: u.user.id, detalhes: { usuario: 'MASTERS' } });
      return out({ ok: true });
    }

    // Demais ações: somente o administrador logado.
    const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } });
    const { data: me } = await caller.auth.getUser();
    if (!me?.user) return out({ erro: 'Sessão expirada. Entre novamente.' }, 401);
    const { data: p } = await admin.from('profiles').select('papel,ativo').eq('id', me.user.id).single();
    if (p?.papel !== 'admin' || !p.ativo) return out({ erro: 'Acesso restrito ao administrador.' }, 403);

    if (b.acao === 'criar') {
      if (!/^[A-Z0-9]{2,30}$/.test(usuario)) return out({ erro: 'Usuário inválido: use de 2 a 30 letras ou números, sem espaços.' }, 400);
      if (usuario === 'MASTERS') return out({ erro: 'MASTERS já existe e é o único administrador.' }, 400);
      if (!nome) return out({ erro: 'Informe o nome completo.' }, 400);
      validaSenha();
      const { data: u, error } = await admin.auth.admin.createUser({ email: `${usuario.toLowerCase()}@${DOM}`, password: senha, email_confirm: true });
      if (error) return out({ erro: /already|registered|exists/i.test(error.message) ? 'Este usuário já existe.' : error.message }, 400);
      await admin.from('profiles').update({ nome }).eq('id', u.user.id);
      await admin.from('audit_log').insert({ user_id: me.user.id, acao: 'NOVO_USUARIO', entidade: 'usuario', entidade_id: u.user.id, detalhes: { usuario, nome } });
      return out({ ok: true, id: u.user.id });
    }
    if (b.acao === 'senha') { // redefinição de senha pelo administrador
      validaSenha();
      const { data: alvo } = await admin.from('profiles').select('id,usuario').eq('id', b.id).single();
      if (!alvo) return out({ erro: 'Usuário não encontrado.' }, 404);
      const { error } = await admin.auth.admin.updateUserById(alvo.id, { password: senha });
      if (error) throw error;
      await admin.from('audit_log').insert({ user_id: me.user.id, acao: 'REDEFINIR_SENHA', entidade: 'usuario', entidade_id: alvo.id, detalhes: { usuario: alvo.usuario } });
      return out({ ok: true });
    }
    return out({ erro: 'Ação desconhecida.' }, 400);
  } catch (e) {
    return out({ erro: (e as Error).message }, 400);
  }
});
