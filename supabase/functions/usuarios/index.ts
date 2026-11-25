// Gestão de acessos por nome de usuário (sem e-mail no login). Publicada no Supabase com verify_jwt = false
// (a própria função valida a sessão do administrador nas ações administrativas).
// O Supabase Auth exige um e-mail interno: USUARIO -> usuario@diario.masters (nunca exibido nem usado para envio).
// Recuperação: o link usa o token de recuperação do próprio Supabase Auth (uso único, expira) e é enviado ao
// "e-mail de recuperação" cadastrado pelo administrador. Envio pelo Brevo (plano gratuito), com a chave só no servidor:
//   BREVO_API_KEY, EMAIL_REMETENTE (e-mail verificado no Brevo) e, opcional, APP_URL (endereço do app).
// A chave service_role fica só no servidor (variável de ambiente da função).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const DOM = 'diario.masters';
const APP_URL_PADRAO = 'https://ronanaraujojunior4-maker.github.io/diario-bordo-masters/';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const norm = (u: string) => String(u ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const txt = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
const RX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const GENERICO = 'Se houver uma conta com esse e-mail, enviaremos em alguns minutos um link para criar uma nova senha. Confira também a caixa de spam. O link vale por 1 hora e só pode ser usado uma vez.';

function senhaTemporaria() { // 10 caracteres aleatórios, sem caracteres ambíguos
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', b = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(b, x => A[x % A.length]).join('');
}

// deno-lint-ignore no-explicit-any
async function enviarLink(admin: any, usuario: string, nome: string, email: string): Promise<string | null> {
  const key = Deno.env.get('BREVO_API_KEY'), de = Deno.env.get('EMAIL_REMETENTE'), app = Deno.env.get('APP_URL') || APP_URL_PADRAO;
  if (!key || !de) return 'O envio de e-mail ainda não foi configurado (BREVO_API_KEY e EMAIL_REMETENTE).';
  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: `${usuario.toLowerCase()}@${DOM}` });
  if (error) return error.message;
  const link = `${app}#recuperar=${encodeURIComponent(data.properties.hashed_token)}`, nm = nome.replace(/[<>&"]/g, '');
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': key, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Diário de Bordo Masters', email: de }, to: [{ email, name: nm }], subject: 'Recuperação de senha – Diário de Bordo Masters',
      htmlContent: `<p>Olá, ${nm}.</p><p>Recebemos um pedido para criar uma nova senha do usuário <b>${usuario}</b> no Diário de Bordo Masters.</p><p><a href="${link}">Criar nova senha</a></p><p>O link vale por 1 hora e só pode ser usado uma vez. Se você não pediu, ignore este e-mail: sua senha atual continua valendo.</p>`,
    }),
  });
  return r.ok ? null : `Falha no envio do e-mail (${r.status}).`;
}

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

    // ── Recuperação pelo próprio usuário: resposta sempre igual (não revela se o e-mail existe) ──
    if (b.acao === 'recuperar_email') {
      const email = txt(b.email, 200).toLowerCase();
      if (!RX_EMAIL.test(email)) return out({ erro: 'Informe um e-mail válido.' }, 400);
      const { count } = await admin.from('audit_log').select('id', { count: 'exact', head: true }).eq('acao', 'RECUPERACAO_EMAIL').gte('em', desde(60));
      if ((count ?? 0) >= 30) return out({ ok: true, mensagem: GENERICO }); // limite geral por hora
      const { data: pps } = await admin.from('profile_private').select('user_id,email_recuperacao').not('email_recuperacao', 'is', null);
      const pp = (pps ?? []).find((x: { email_recuperacao: string }) => x.email_recuperacao.toLowerCase() === email);
      const { data: p } = pp ? await admin.from('profiles').select('id,usuario,nome,ativo').eq('id', pp.user_id).single() : { data: null };
      let falha: string | null = 'nenhuma conta ativa com este e-mail';
      if (p?.ativo) {
        const { count: c2 } = await admin.from('audit_log').select('id', { count: 'exact', head: true }).eq('acao', 'RECUPERACAO_EMAIL').eq('entidade_id', p.id).gte('em', desde(60));
        falha = (c2 ?? 0) >= 3 ? 'limite de 3 pedidos por hora' : await enviarLink(admin, p.usuario, p.nome, pp!.email_recuperacao);
      }
      await admin.from('audit_log').insert({ acao: 'RECUPERACAO_EMAIL', entidade: 'acesso', entidade_id: p?.id ?? null, detalhes: { enviado: !falha, motivo: falha, usuario: p?.usuario ?? null } });
      return out({ ok: true, mensagem: GENERICO });
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
    if (b.acao === 'atender') { // atendimento de pedido de ajuda, depois de confirmar a identidade
      const verificacao = txt(b.verificacao, 300), resolucao = txt(b.resolucao, 300);
      if (!['senha_temporaria', 'enviar_link', 'recusar'].includes(b.tipo)) return out({ erro: 'Escolha como atender o pedido.' }, 400);
      if (b.tipo !== 'recusar' && verificacao.length < 5) return out({ erro: 'Descreva como a identidade foi confirmada.' }, 400);
      const { data: r } = await admin.from('access_requests').select('*').eq('id', b.id).single();
      if (!r || r.status !== 'aberta') return out({ erro: 'Pedido não encontrado ou já atendido.' }, 404);
      const alvoId = b.user_id || r.user_id;
      const { data: alvo } = alvoId ? await admin.from('profiles').select('id,usuario,nome,ativo').eq('id', alvoId).single() : { data: null };
      if (b.tipo !== 'recusar' && !alvo) return out({ erro: 'Escolha o usuário cadastrado que corresponde ao pedido.' }, 400);
      let temp: string | null = null;
      if (b.tipo === 'senha_temporaria') {
        temp = senhaTemporaria();
        const { error } = await admin.auth.admin.updateUserById(alvo!.id, { password: temp });
        if (error) throw error;
        await admin.from('profiles').update({ trocar_senha: true }).eq('id', alvo!.id);
      }
      if (b.tipo === 'enviar_link') {
        const { data: pp } = await admin.from('profile_private').select('email_recuperacao').eq('user_id', alvo!.id).maybeSingle();
        if (!pp?.email_recuperacao) return out({ erro: 'Este usuário não tem e-mail de recuperação. Cadastre em Usuários ou use a senha temporária.' }, 400);
        const falha = await enviarLink(admin, alvo!.usuario, alvo!.nome, pp.email_recuperacao);
        if (falha) return out({ erro: falha }, 400);
      }
      const padrao: Record<string, string> = { senha_temporaria: 'Senha temporária entregue; troca obrigatória no próximo acesso.', enviar_link: 'Link de recuperação enviado ao e-mail cadastrado.', recusar: 'Pedido recusado.' };
      await admin.from('access_requests').update({ status: b.tipo === 'recusar' ? 'recusada' : 'atendida', user_id: alvo?.id ?? r.user_id, verificacao: verificacao || null, resolucao: resolucao || padrao[b.tipo], atendido_por: me.user.id, atendido_em: new Date().toISOString() }).eq('id', r.id);
      await admin.from('audit_log').insert({ user_id: me.user.id, acao: 'RECUPERACAO_ADMIN', entidade: 'acesso', entidade_id: alvo?.id ?? null, detalhes: { pedido: r.id, tipo: b.tipo, usuario: alvo?.usuario ?? r.usuario_informado, verificacao, resolucao: resolucao || padrao[b.tipo] } });
      return out({ ok: true, senha_temporaria: temp }); // mostrada uma única vez ao administrador; não fica gravada
    }
    return out({ erro: 'Ação desconhecida.' }, 400);
  } catch (e) {
    return out({ erro: (e as Error).message }, 400);
  }
});
