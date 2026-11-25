// Gestão de acessos por nome de usuário (sem e-mail no login). Publicada no Supabase com verify_jwt = false
// (a própria função valida a sessão do administrador nas ações administrativas).
// O Supabase Auth exige um e-mail interno: USUARIO -> usuario@diario.masters (nunca exibido nem usado para envio).
// Recuperação de senha: o administrador gera um código temporário (só o hash fica no banco, HMAC com a chave do servidor);
// o funcionário informa usuário + código + nova senha. Sem e-mail, SMTP ou serviço externo.
// A chave service_role fica só no servidor (variável de ambiente da função).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const DOM = 'diario.masters';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const norm = (u: string) => String(u ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const txt = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
const VALIDADE_MIN = 120, MAX_TENTATIVAS = 5, MAX_FALHAS_HORA = 30;
const INVALIDO = 'Usuário ou código inválido, expirado ou já utilizado. Peça um novo código ao administrador.';

function gerarCodigo() { // 8 caracteres (32 símbolos sem ambíguos) = 40 bits; exibido como XXXX-XXXX
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(b, x => A[x % 32]).join('');
}
const normCod = (c: unknown) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
async function hashCodigo(userId: string, codigo: string) { // HMAC-SHA256 com a chave do servidor: o hash sozinho não permite testar códigos
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`${userId}:${codigo}`));
  return Array.from(new Uint8Array(sig), x => x.toString(16).padStart(2, '0')).join('');
}
function iguais(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return out({ ok: true });
  try {
    const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const b = await req.json();
    const usuario = norm(b.usuario), senha = String(b.senha ?? ''), nome = String(b.nome ?? '').trim();
    const validaSenha = () => { if (senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.'); };
    const desde = (min: number) => new Date(Date.now() - min * 60000).toISOString();

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

    // ── Recuperação pelo funcionário com o código recebido do administrador (sem login) ──
    if (b.acao === 'usar_codigo') {
      const cod = normCod(b.codigo);
      if (senha.length < 6) return out({ erro: 'A nova senha precisa ter pelo menos 6 caracteres.' }, 400);
      const { count: falhas } = await admin.from('audit_log').select('id', { count: 'exact', head: true }).eq('acao', 'RECUPERACAO_CODIGO_FALHA').gte('em', desde(60));
      if ((falhas ?? 0) >= MAX_FALHAS_HORA) return out({ erro: 'Muitas tentativas inválidas. Aguarde alguns minutos e tente de novo.' }, 429);
      const falha = async (user_id: string | null, motivo: string) => { await admin.from('audit_log').insert({ acao: 'RECUPERACAO_CODIGO_FALHA', entidade: 'acesso', entidade_id: user_id, detalhes: { usuario, motivo } }); return out({ erro: INVALIDO }, 400); };
      const { data: p } = await admin.from('profiles').select('id,usuario,ativo,excluido_em').eq('usuario', usuario).maybeSingle();
      if (!p || !p.ativo || p.excluido_em) return falha(p?.id ?? null, 'usuário inexistente ou inativo');
      const { data: c } = await admin.from('recovery_codes').select('id,code_hash,expira_em,tentativas').eq('user_id', p.id).is('usado_em', null).is('revogado_em', null).order('criado_em', { ascending: false }).limit(1).maybeSingle();
      if (!c) return falha(p.id, 'sem código pendente');
      if (new Date(c.expira_em) < new Date()) return falha(p.id, 'código expirado');
      if (cod.length !== 8 || !iguais(await hashCodigo(p.id, cod), c.code_hash)) {
        const t = c.tentativas + 1;
        await admin.from('recovery_codes').update(t >= MAX_TENTATIVAS ? { tentativas: t, revogado_em: new Date().toISOString() } : { tentativas: t }).eq('id', c.id);
        return falha(p.id, t >= MAX_TENTATIVAS ? 'código revogado após 5 tentativas erradas' : `código incorreto (tentativa ${t} de ${MAX_TENTATIVAS})`);
      }
      // Marca como usado antes de trocar a senha (uso único mesmo com envios simultâneos).
      const { data: ok } = await admin.from('recovery_codes').update({ usado_em: new Date().toISOString() }).eq('id', c.id).is('usado_em', null).select('id');
      if (!ok?.length) return falha(p.id, 'código já utilizado');
      const { error } = await admin.auth.admin.updateUserById(p.id, { password: senha }); // altera somente a credencial
      if (error) { await admin.from('recovery_codes').update({ usado_em: null }).eq('id', c.id); throw error; }
      await admin.from('profiles').update({ trocar_senha: false }).eq('id', p.id);
      await admin.from('audit_log').insert({ user_id: p.id, acao: 'RECUPERACAO_CODIGO_USADO', entidade: 'acesso', entidade_id: p.id, detalhes: { usuario: p.usuario, codigo_id: c.id } });
      return out({ ok: true, mensagem: 'Senha alterada. Entre com o seu usuário e a nova senha.' });
    }

    // ── Pedido de ajuda administrativa (sem login) ──
    if (b.acao === 'pedir_ajuda') {
      const ui = norm(txt(b.usuario, 60)), ni = txt(b.nome, 120), ct = txt(b.contato, 120), msg = txt(b.mensagem, 600);
      if (!ui || !ni || !ct) return out({ erro: 'Informe usuário, nome completo e um telefone ou contato.' }, 400);
      const { count } = await admin.from('access_requests').select('id', { count: 'exact', head: true }).gte('criado_em', desde(60));
      if ((count ?? 0) >= 20) return out({ erro: 'Muitos pedidos no momento. Tente mais tarde ou fale diretamente com o administrador.' }, 429);
      const { count: abertos } = await admin.from('access_requests').select('id', { count: 'exact', head: true }).eq('usuario_informado', ui).eq('status', 'aberta');
      if ((abertos ?? 0) >= 2) return out({ ok: true, mensagem: 'Seu pedido já está com o administrador. Aguarde o contato.' });
      const { data: p } = await admin.from('profiles').select('id').eq('usuario', ui).maybeSingle();
      const { error } = await admin.from('access_requests').insert({ usuario_informado: ui, nome_informado: ni, contato: ct, mensagem: msg || null, user_id: p?.id ?? null });
      if (error) throw error;
      return out({ ok: true, mensagem: 'Pedido enviado. O administrador vai confirmar sua identidade pelo contato informado antes de liberar o acesso.' });
    }

    // Demais ações: somente administrador logado.
    const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } });
    const { data: me } = await caller.auth.getUser();
    if (!me?.user) return out({ erro: 'Sessão expirada. Entre novamente.' }, 401);
    const { data: p } = await admin.from('profiles').select('papel,ativo').eq('id', me.user.id).single();
    if (p?.papel !== 'admin' || !p.ativo) return out({ erro: 'Acesso restrito ao administrador.' }, 403);

    if (b.acao === 'criar') {
      if (!/^[A-Z0-9]{2,30}$/.test(usuario)) return out({ erro: 'Usuário inválido: use de 2 a 30 letras ou números, sem espaços.' }, 400);
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
    if (b.acao === 'excluir_usuario') { // exclusão lógica: bloqueia o acesso e preserva todo o histórico
      const motivo = txt(b.motivo, 300);
      if (!motivo) return out({ erro: 'Informe a justificativa para excluir o usuário.' }, 400);
      if (b.id === me.user.id) return out({ erro: 'Você não pode excluir o seu próprio acesso.' }, 400);
      const { data: alvo } = await admin.from('profiles').select('id,usuario,nome,papel,ativo').eq('id', b.id).single();
      if (!alvo) return out({ erro: 'Usuário não encontrado.' }, 404);
      const { error } = await admin.from('profiles').update({ ativo: false, excluido_em: new Date().toISOString(), motivo_exclusao: motivo }).eq('id', alvo.id);
      if (error) return out({ erro: error.message }, 400); // último administrador ou usuário com veículo: bloqueado no banco
      await admin.from('vehicles').update({ responsavel_padrao: null }).eq('responsavel_padrao', alvo.id);
      await admin.from('vehicle_authorizations').delete().eq('user_id', alvo.id);
      await admin.auth.admin.updateUserById(alvo.id, { ban_duration: '876000h' }); // impede novo login e renovação de sessão
      await admin.from('audit_log').insert({ user_id: me.user.id, acao: 'EXCLUIR_USUARIO', entidade: 'usuario', entidade_id: alvo.id, detalhes: { antes: alvo, motivo } });
      return out({ ok: true });
    }
    if (b.acao === 'gerar_codigo') { // código temporário para o funcionário criar nova senha
      const { data: alvo } = await admin.from('profiles').select('id,usuario,nome,ativo,excluido_em').eq('id', b.user_id).single();
      if (!alvo || !alvo.ativo || alvo.excluido_em) return out({ erro: 'Usuário não encontrado ou inativo.' }, 404);
      const agora = new Date().toISOString();
      await admin.from('recovery_codes').update({ revogado_em: agora, revogado_por: me.user.id }).eq('user_id', alvo.id).is('usado_em', null).is('revogado_em', null); // só um código válido por vez
      const codigo = gerarCodigo(), expira = new Date(Date.now() + VALIDADE_MIN * 60000).toISOString();
      const { data: c, error } = await admin.from('recovery_codes').insert({ user_id: alvo.id, code_hash: await hashCodigo(alvo.id, codigo), criado_por: me.user.id, expira_em: expira, pedido_id: b.pedido_id || null }).select('id').single();
      if (error) throw error;
      if (b.pedido_id) await admin.from('access_requests').update({ status: 'atendida', user_id: alvo.id, verificacao: txt(b.verificacao, 300) || null, resolucao: 'Código de recuperação gerado.', atendido_por: me.user.id, atendido_em: agora }).eq('id', b.pedido_id).eq('status', 'aberta');
      await admin.from('audit_log').insert({ user_id: me.user.id, acao: 'RECUPERACAO_CODIGO_GERADO', entidade: 'acesso', entidade_id: alvo.id, detalhes: { usuario: alvo.usuario, codigo_id: c.id, expira_em: expira, pedido: b.pedido_id || null } });
      return out({ ok: true, codigo: codigo.slice(0, 4) + '-' + codigo.slice(4), expira_em: expira }); // exibido uma única vez; não fica gravado
    }
    if (b.acao === 'revogar_codigo') {
      const { data: c } = await admin.from('recovery_codes').update({ revogado_em: new Date().toISOString(), revogado_por: me.user.id }).eq('id', b.id).is('usado_em', null).is('revogado_em', null).select('id,user_id');
      if (!c?.length) return out({ erro: 'Código não está mais pendente.' }, 400);
      await admin.from('audit_log').insert({ user_id: me.user.id, acao: 'RECUPERACAO_CODIGO_REVOGADO', entidade: 'acesso', entidade_id: c[0].user_id, detalhes: { codigo_id: b.id } });
      return out({ ok: true });
    }
    if (b.acao === 'recusar_pedido') {
      await admin.from('access_requests').update({ status: 'recusada', resolucao: txt(b.resolucao, 300) || 'Pedido recusado.', atendido_por: me.user.id, atendido_em: new Date().toISOString() }).eq('id', b.id).eq('status', 'aberta');
      await admin.from('audit_log').insert({ user_id: me.user.id, acao: 'RECUPERACAO_PEDIDO_RECUSADO', entidade: 'acesso', entidade_id: null, detalhes: { pedido: b.id } });
      return out({ ok: true });
    }
    return out({ erro: 'Ação desconhecida.' }, 400);
  } catch (e) {
    return out({ erro: (e as Error).message }, 400);
  }
});
