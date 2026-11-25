/* Conexão com o Supabase (modo oficial). Ativado somente quando config.js tiver supabaseUrl e supabaseAnonKey.
   Sem configuração, o app roda no modo demonstração. Banco: projeto diario-bordo-masters (plano Free). Regras e RLS testadas no banco real em 2026-11-25.
   Economia (plano gratuito): uma carga inicial com janela de 90 dias, consultas paginadas, histórico mais antigo sob demanda,
   Realtime apenas na tabela de uso dos veículos, biblioteca carregada só quando necessária. */
'use strict';
(() => {
  const CFG = window.DIARIO_CONFIG || {};
  if (!CFG.supabaseUrl || !CFG.supabaseAnonKey || new URLSearchParams(location.search).has('demo')) return; // modo demonstração (?demo no endereço)
  if (/service_role/.test(atob((CFG.supabaseAnonKey.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/') || 'e30=') || '')) { alert('config.js contém a chave service_role. Use somente a chave publishable/anon.'); return; }

  const JANELA_DIAS = 90, PAGE = 1000;
  let sb = null, since = null, lastKmView = new Map(), carregadoEm = 0;
  const loadScript = src => new Promise((ok, err) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => err(Error('Não foi possível carregar a biblioteca do Supabase. Verifique a conexão.')); document.head.append(s); });
  const must = ({ data, error }) => { if (error) throw Error(traduz(error.message)); return data; };
  const traduz = m => /duplicate key.*vehicle_usage_um_ativo/.test(m) ? 'Este veículo já está em uso por outra pessoa.' : /vehicle_usage_um_por_usuario/.test(m) ? 'Você já está com um veículo. Libere-o antes de assumir outro.' : /placa_norm/.test(m) ? 'Já existe um veículo com esta placa.' : /row-level security/.test(m) ? 'Operação não permitida para o seu perfil.' : /Invalid login/.test(m) ? 'Usuário ou senha incorretos.' : m;
  async function all(q) { const out = []; for (let i = 0; ; i += PAGE) { const d = must(await q().range(i, i + PAGE - 1)); out.push(...d); if (d.length < PAGE) return out; } }
  const emailDe = u => /@/.test(u) ? u.trim().toLowerCase() : `${npl(u).toLowerCase()}@${CFG.loginDomain || 'diario.masters'}`;
  const resumo = d => { if (!d) return ''; const x = d.depois || d.antes || {}; return Object.entries(x).filter(([k, v]) => v != null && v !== '' && !/^(id|criado_em|user_id|vehicle_id|placa_norm)$/.test(k)).slice(0, 6).map(([k, v]) => `${k}: ${v}`).join(' · '); };

  async function carregar(desde) {
    const [profiles, vehicles, auths, lk] = await Promise.all([
      all(() => sb.from('profiles').select('id,usuario,nome,papel,ativo,excluido_em').order('nome')),
      all(() => sb.from('vehicles').select('id,nome,modelo,placa,responsavel_padrao,km_inicial,km_troca_oleo,data_troca_oleo,ativo,obs,excluido_em').order('nome')),
      all(() => sb.from('vehicle_authorizations').select('vehicle_id,user_id')),
      all(() => sb.from('vehicle_last_km').select('vehicle_id,ultima_km')),
    ]);
    const [usage, trips, fuelings, audit, acessos, privados] = await Promise.all([
      all(() => sb.from('vehicle_usage').select('*').or(`status.eq.ativa,inicio.gte.${desde}`).order('inicio', { ascending: false })),
      all(() => sb.from('trips').select('*').is('excluido_em', null).gte('data', desde).order('data', { ascending: false })),
      all(() => sb.from('fuelings').select('*').is('excluido_em', null).gte('data', desde).order('data', { ascending: false })),
      isAdmin() ? must(await sb.from('audit_log').select('*').order('id', { ascending: false }).limit(200)) : [],
      isAdmin() ? must(await sb.from('access_requests').select('*').order('criado_em', { ascending: false }).limit(100)) : [],
      isAdmin() ? must(await sb.from('profile_private').select('user_id,email_recuperacao')) : [],
    ]);
    since = desde; carregadoEm = Date.now(); lastKmView = new Map(lk.map(r => [r.vehicle_id, r.ultima_km]));
    DB.d = {
      versao: 1, users: profiles,
      vehicles: vehicles.map(v => ({ ...v, responsavel: v.responsavel_padrao, autorizados: auths.filter(a => a.vehicle_id === v.id).map(a => a.user_id) })),
      usage, trips, fuelings, acessos, privados: Object.fromEntries(privados.filter(x => x.email_recuperacao).map(x => [x.user_id, x.email_recuperacao])),
      audit: audit.map(a => ({ id: a.id, em: a.em, user_id: a.user_id, acao: `${a.acao}_${a.entidade}`, entidade: a.entidade, entidade_id: a.entidade_id, detalhes: resumo(a.detalhes) })),
    };
  }
  const recarregar = () => carregar(since);

  window.CLOUD = {
    async start() {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
      // Só volta ao login quando o próprio Supabase encerra a sessão (saída ou revogação), nunca por falha temporária de rede.
      sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && S.user) { S.user = null; renderLogin(); } });
      const { data } = await sb.auth.getSession();
      return data.session ? this.perfil(data.session.user.id) : null;
    },
    async perfil(id) {
      const p = must(await sb.from('profiles').select('id,usuario,nome,papel,ativo,trocar_senha').eq('id', id).single());
      if (!p.ativo) { await sb.auth.signOut(); throw Error('Usuário inativo. Fale com o administrador.'); }
      S.user = p; await carregar(isoDay(addDays(new Date(), -JANELA_DIAS)));
      // Atualiza os indicadores quando o app volta a ficar visível (sem consultas contínuas, para poupar o plano gratuito).
      document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible' && S.user && Date.now() - carregadoEm > 60000) { await recarregar().catch(() => { }); if (!$('#dlg').open) route(); } });
      sb.channel('uso').on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_usage' }, async () => { await recarregar(); if (['painel', 'registro', 'liberacoes', 'alocacao'].includes(S.route) && !$('#dlg').open) route(); }).subscribe();
      return p;
    },
    async fn(body) { // função de servidor "usuarios" (a chave secreta fica só no servidor)
      const { data, error } = await sb.functions.invoke('usuarios', { body });
      if (error) { let m = error.message; try { m = (await error.context.json()).erro || m; } catch { } throw Error(m); }
      if (data?.erro) throw Error(data.erro); return data;
    },
    async temAdmin() { const { data, error } = await sb.rpc('tem_admin'); return error ? true : !!data; },
    async primeiroAcesso(codigo, senha) { await this.fn({ acao: 'primeiro_acesso', codigo, senha }); return this.login('MASTERS', senha); },
    async minhaSenha(senha) { if (String(senha).length < 6) throw Error('A senha precisa ter pelo menos 6 caracteres.'); must(await sb.auth.updateUser({ password: senha })); await sb.rpc('senha_trocada'); if (S.user) S.user.trocar_senha = false; },
    recuperarEmail(email) { return this.fn({ acao: 'recuperar_email', email }); },
    pedirAjuda(d) { return this.fn({ acao: 'pedir_ajuda', ...d }); },
    async atender(d) { const r = await this.fn({ acao: 'atender', ...d }); await recarregar(); return r; },
    async novaSenhaPeloLink(token_hash, senha) { // token de recuperação do Supabase Auth: uso único e com validade
      const { error } = await sb.auth.verifyOtp({ token_hash, type: 'recovery' });
      if (error) throw Error('Link inválido ou expirado. Peça um novo link em "Esqueci minha senha".');
      try { must(await sb.auth.updateUser({ password: senha })); await sb.rpc('senha_trocada'); } finally { S.user = null; await sb.auth.signOut(); }
    },
    async login(usuario, senha) { const r = must(await sb.auth.signInWithPassword({ email: emailDe(usuario), password: senha })); return this.perfil(r.user.id); },
    async logout() { sb.removeAllChannels(); await sb.auth.signOut(); },
    async ensureSince(d) { if (d && since && d < since) await carregar(d); },
    install() {
      DB.load = DB.save = DB.reset = () => { };
      DB.audit = () => { }; // a auditoria oficial é gravada pelos gatilhos do banco
      const lk0 = DB.lastKm.bind(DB);
      DB.lastKm = vid => { const r = lk0(vid), v = lastKmView.get(vid); return v != null && (r.km == null || v > r.km) ? { km: v, fonte: 'histórico completo do veículo (banco)', trip: null } : r; };
      DB.assumir = async vid => { if (isAdmin()) throw Error('Conta de administrador não assume veículos.'); must(await sb.rpc('assumir_veiculo', { p_vehicle: vid })); await recarregar(); };
      DB.liberar = async (vid, just) => { must(await sb.rpc('liberar_veiculo', { p_vehicle: vid, p_justificativa: just || null })); await recarregar(); };
      const ins = async (tab, row) => { const d = must(await sb.from(tab).upsert(row, { onConflict: 'id', ignoreDuplicates: true }).select('id')); await recarregar(); return d.length ? 'ok' : 'repetido'; };
      DB.addTrip = t => ins('trips', { id: t.id, vehicle_id: t.vehicle_id, user_id: S.user.id, data: t.data, hora_saida: t.hora_saida || null, hora_chegada: t.hora_chegada || null, km_saida: t.km_saida, km_chegada: t.km_chegada, origem_destino: t.origem_destino, motorista: t.motorista, finalidade: t.finalidade || null, visto: t.visto, usuario_texto: t.usuario_texto, obs: t.obs || null, origem: 'app' });
      DB.addFuel = f => { const dup = DB.d.fuelings.find(x => x.vehicle_id === f.vehicle_id && x.data === f.data && x.hora.slice(0, 5) === f.hora && Math.abs(x.total - f.total) < .005); if (dup) throw Error('Já existe um abastecimento deste veículo com a mesma data, horário e valor. Registro não duplicado.'); const { criado_em, ...r } = f; return ins('fuelings', { ...r, user_id: S.user.id, origem: 'app' }); };
      DB.saveVehicle = async v => {
        const row = { nome: v.nome, modelo: v.modelo || null, placa: v.placa, km_inicial: v.km_inicial || 0, km_troca_oleo: v.km_troca_oleo, responsavel_padrao: v.responsavel || null, ativo: v.ativo !== false };
        must(v.id ? await sb.from('vehicles').update(row).eq('id', v.id) : await sb.from('vehicles').insert(row)); await recarregar();
      };
      DB.alocar = async (vid, resp, aut) => {
        must(await sb.from('vehicles').update({ responsavel_padrao: resp || null }).eq('id', vid));
        must(await sb.from('vehicle_authorizations').delete().eq('vehicle_id', vid));
        if (aut.length) must(await sb.from('vehicle_authorizations').insert(aut.map(user_id => ({ vehicle_id: vid, user_id }))));
        await recarregar();
      };
      DB.saveUser = async u => {
        if (u.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u.email)) throw Error('E-mail de recuperação inválido.');
        let id = u.id;
        if (!id) id = (await CLOUD.fn({ acao: 'criar', usuario: u.usuario, nome: u.nome, senha: u.senha || '' })).id;
        else {
          must(await sb.from('profiles').update({ nome: u.nome, ativo: u.ativo }).eq('id', u.id));
          if (u.senha) await CLOUD.fn({ acao: 'senha', id: u.id, senha: u.senha });
        }
        if (u.email !== undefined && (u.email || null) !== (DB.d.privados?.[id] || null)) {
          const { error } = await sb.from('profile_private').upsert({ user_id: id, email_recuperacao: u.email || null, atualizado_em: new Date().toISOString() });
          if (error) throw Error(/profile_private_email/.test(error.message) ? 'Este e-mail já está cadastrado para outro usuário.' : traduz(error.message));
        }
        await recarregar();
      };
      const upd = async (tab, id, row, msg) => { const d = must(await sb.from(tab).update(row).eq('id', id).select('id')); if (!d.length) throw Error(msg); await recarregar(); };
      DB.editTrip = (id, p) => upd('trips', id, p, 'Você só pode editar os seus próprios registros.');
      DB.editFuel = (id, p) => upd('fuelings', id, p, 'Você só pode editar os seus próprios registros.');
      DB.delTrip = (id, m) => upd('trips', id, { excluido_em: new Date().toISOString(), motivo_exclusao: m || null }, 'Você só pode excluir os seus próprios registros.');
      DB.delFuel = (id, m) => upd('fuelings', id, { excluido_em: new Date().toISOString(), motivo_exclusao: m || null }, 'Você só pode excluir os seus próprios registros.');
      DB.delVehicle = (id, m) => upd('vehicles', id, { excluido_em: new Date().toISOString(), motivo_exclusao: m }, 'Operação não permitida para o seu perfil.');
      DB.delUser = async (id, m) => { await CLOUD.fn({ acao: 'excluir_usuario', id, motivo: m }); await recarregar(); };
      window.doImport = async () => { // grava só os "novos"; chave_import única + ignoreDuplicates: reimportar nunca duplica nem sobrescreve
        const P = S.importPreview, ok = P.rows.filter(x => x.st === 'novo'), T = [], A = [], R = { tv: 0, ta: 0, iv: 0, ia: 0, erros: [] };
        const ids = new Map(); DB.d.trips.forEach(t => { const k = t.chave_import || chaveViagem(t, DB.veh(t.vehicle_id)?.placa); ids.set(k, t.id); });
        for (const r of ok) {
          const base = { id: uid(), vehicle_id: r.v.id, user_id: r.u?.id || S.user.id, origem: 'importacao' };
          if (r.tipo === 'Viagem') T.push({ ...base, data: r.rec.data, hora_saida: r.rec.hora_saida || null, hora_chegada: r.rec.hora_chegada || null, km_saida: r.rec.km_saida, km_chegada: r.rec.km_chegada, origem_destino: r.rec.origem_destino || '', motorista: r.rec.motorista || '', finalidade: r.rec.finalidade || null, visto: !!r.rec.visto, usuario_texto: r.rec.usuario_texto || null, chave_import: chaveViagem(r.rec, r.v.placa) });
          else A.push({ r, row: { ...base, data: r.rec.data, hora: r.rec.hora, km: r.rec.km, posto: r.rec.posto || null, combustivel: r.rec.combustivel, litros: r.rec.litros, preco_litro: r.rec.preco_litro, total: r.rec.total, modalidade: r.rec.modalidade, obs: r.rec.obs || null, chave_import: chaveAb(r.rec, r.v.placa) } });
        }
        for (let i = 0; i < T.length; i += 200) {
          const lote = T.slice(i, i + 200), { data, error } = await sb.from('trips').upsert(lote, { onConflict: 'chave_import', ignoreDuplicates: true }).select('id,chave_import');
          if (error) { R.erros.push(`Viagens ${i + 1}–${i + lote.length}: ${traduz(error.message)}`); continue; }
          R.tv += data.length; R.iv += lote.length - data.length; data.forEach(d => ids.set(d.chave_import, d.id));
        }
        const F = A.map(({ r, row }) => ({ ...row, trip_id: r.trip ? ids.get(r.trip.key) || null : null }));
        for (let i = 0; i < F.length; i += 200) {
          const lote = F.slice(i, i + 200), { data, error } = await sb.from('fuelings').upsert(lote, { onConflict: 'chave_import', ignoreDuplicates: true }).select('id');
          if (error) { R.erros.push(`Abastecimentos ${i + 1}–${i + lote.length}: ${traduz(error.message)}`); continue; }
          R.ta += data.length; R.ia += lote.length - data.length;
        }
        await carregar(since); return R;
      };
    },
  };
})();
