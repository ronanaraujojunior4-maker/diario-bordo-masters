/* Diário de Bordo – Masters Engenharia · versão de apresentação
   Modo atual: DEMONSTRAÇÃO (dados fictícios no navegador, isolados do sistema oficial).
   A camada "DB" concentra todas as leituras/escritas para ser trocada pelo Supabase (ver supabase/migrations). */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
const npl = v => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const pad = n => String(n).padStart(2, '0');
const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoDay(new Date());
const fd = d => { const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : (d || ''); };
const fdt = iso => { if (!iso) return ''; const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const nf = (n, d = 0) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const brl = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brl0 = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pbr = v => { v = String(v ?? '').replace(/R\$|\s/g, ''); if (v === '') return NaN; if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.'); return /^-?(\d+\.?\d*|\.\d+)$/.test(v) ? Number(v) : NaN; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { } }, del(k) { try { localStorage.removeItem(k); } catch { } } };

/* ───────────── Ícones ───────────── */
const IC = {
  gauge: '<path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  fuel: '<path d="M3 22h12"/><path d="M4 9h10"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.83a2 2 0 0 0-.59-1.42L18 5"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/>',
  shuffle: '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="M18 2l4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="M18 14l4 4-4 4"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
};
const ico = (n, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;

/* ───────────── Base de demonstração ───────────── */
const DEMO_KEY = 'dbm-demo-v1';
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seedDemo() {
  const R = rng(1420);
  const users = [
    { id: 'u-masters', usuario: 'MASTERS', nome: 'Administração Masters', papel: 'admin', ativo: true },
    { id: 'u-ronan', usuario: 'RONAN', nome: 'Ronan', papel: 'func', ativo: true },
    { id: 'u-eccleston', usuario: 'ECCLESTON', nome: 'Eccleston Brito', papel: 'func', ativo: true },
    { id: 'u-valdinei', usuario: 'VALDINEI', nome: 'Valdinei Teixeira', papel: 'func', ativo: true },
  ];
  const vehicles = [
    { id: 'v-mobi', nome: 'Fiat Mobi', modelo: 'Mobi Like 1.0', placa: 'TYD5C39', responsavel: 'u-ronan', km_inicial: 18240, km_troca_oleo: 22000, data_troca_oleo: '', ativo: true, autorizados: ['u-ronan', 'u-valdinei'] },
    { id: 'v-hr', nome: 'Hyundai HR', modelo: 'HR 2.5 Diesel', placa: 'QZH-4A95', responsavel: 'u-eccleston', km_inicial: 96410, km_troca_oleo: 100000, data_troca_oleo: '', ativo: true, autorizados: ['u-eccleston', 'u-ronan'] },
    { id: 'v-s10', nome: 'S10 High Country', modelo: 'S10 2.8 Diesel 4x4', placa: 'QZY-5H82', responsavel: 'u-valdinei', km_inicial: 54880, km_troca_oleo: 58500, data_troca_oleo: '', ativo: true, autorizados: ['u-valdinei'] },
  ];
  const destinos = ['Sede → Obra Residencial Alfa (demo)', 'Sede → Fornecedor de aço (demo)', 'Obra Beta → Sede (demo)', 'Sede → Cliente Gama (demo)', 'Sede → Cartório / bancos (demo)', 'Obra Delta → Depósito (demo)', 'Sede → Vistoria técnica (demo)'];
  const fins = ['Visita técnica', 'Transporte de material', 'Reunião com cliente', 'Serviço administrativo', 'Fiscalização de obra'];
  const trips = [], fuelings = [];
  const start = addDays(new Date(), -44);
  for (const v of vehicles) {
    let km = v.km_inicial, sinceFuel = 0, n = 0;
    const user = users.find(u => u.id === v.responsavel);
    for (let d = 0; d < 44; d++) {
      const day = addDays(start, d); if (day.getDay() === 0) continue;
      const qt = R() < 0.25 ? 0 : (R() < 0.3 ? 2 : 1);
      for (let k = 0; k < qt; k++) {
        const dist = Math.round((v.id === 'v-mobi' ? 18 : 35) + R() * (v.id === 'v-mobi' ? 70 : 160));
        const h = 7 + k * 5 + Math.floor(R() * 3), m = Math.floor(R() * 4) * 15;
        let kmS = km;
        if (v.id === 'v-hr' && n === 17) kmS = km + 42; // inconsistência proposital (lacuna) para demonstrar o alerta
        const t = { id: uid(), vehicle_id: v.id, user_id: user.id, data: isoDay(day), hora_saida: `${pad(h)}:${pad(m)}`, hora_chegada: `${pad(h + 1 + Math.floor(dist / 70))}:${pad((m + 30) % 60)}`, km_saida: kmS, km_chegada: kmS + dist, origem_destino: destinos[Math.floor(R() * destinos.length)], motorista: user.nome, finalidade: fins[Math.floor(R() * fins.length)], visto: true, usuario_texto: user.usuario, origem: 'app', criado_em: day.toISOString() };
        trips.push(t); km = t.km_chegada; sinceFuel += dist; n++;
        if (sinceFuel > (v.id === 'v-mobi' ? 380 : 520)) {
          const diesel = v.id !== 'v-mobi', preco = diesel ? 6.19 + R() * .3 : 6.09 + R() * .35, litros = Math.round((sinceFuel / (v.id === 'v-mobi' ? 13.2 : v.id === 'v-hr' ? 8.4 : 9.6)) * 100) / 100;
          fuelings.push({ id: uid(), vehicle_id: v.id, user_id: user.id, trip_id: t.id, data: t.data, hora: t.hora_chegada, km: t.km_chegada, posto: ['Posto Avenida (demo)', 'Posto Rodovia (demo)', 'Posto Centro (demo)'][Math.floor(R() * 3)], combustivel: diesel ? 'Diesel' : 'Gasolina', litros, preco_litro: Math.round(preco * 1000) / 1000, total: Math.round(litros * preco * 100) / 100, modalidade: R() < .8 ? 'req' : 'func', obs: '', origem: 'app', criado_em: day.toISOString() });
          sinceFuel = 0;
        }
      }
    }
  }
  const now = new Date();
  const usage = [
    { id: uid(), vehicle_id: 'v-hr', user_id: 'u-eccleston', status: 'ativa', inicio: new Date(now.getTime() - 2.5 * 3600e3).toISOString(), fim: null, liberado_por: null, justificativa: '' },
    { id: uid(), vehicle_id: 'v-s10', user_id: 'u-valdinei', status: 'ativa', inicio: new Date(now.getTime() - 20 * 3600e3).toISOString(), fim: null, liberado_por: null, justificativa: '' },
    { id: uid(), vehicle_id: 'v-mobi', user_id: 'u-ronan', status: 'encerrada', inicio: addDays(now, -1).toISOString(), fim: new Date(now.getTime() - 18 * 3600e3).toISOString(), liberado_por: 'u-ronan', justificativa: '' },
  ];
  return { versao: 1, criado: now.toISOString(), users, vehicles, trips, fuelings, usage, audit: [{ id: uid(), em: now.toISOString(), user_id: 'sistema', acao: 'BASE_DEMO', entidade: 'sistema', entidade_id: '', detalhes: 'Base de demonstração criada com dados fictícios.' }] };
}

/* ───────────── Camada de dados (demo) ───────────── */
const DB = {
  d: null,
  load() { try { this.d = JSON.parse(store.get(DEMO_KEY)); } catch { this.d = null; } if (!this.d || this.d.versao !== 1) { this.d = seedDemo(); this.save(); } },
  save() { store.set(DEMO_KEY, JSON.stringify(this.d)); },
  reset() { this.d = seedDemo(); this.save(); },
  audit(acao, entidade, entidade_id, detalhes) { this.d.audit.unshift({ id: uid(), em: new Date().toISOString(), user_id: S.user?.id || 'sistema', acao, entidade, entidade_id: entidade_id || '', detalhes }); },
  user(id) { return this.d.users.find(u => u.id === id); },
  veh(id) { return this.d.vehicles.find(v => v.id === id); },
  activeUse(vid) { return this.d.usage.find(u => u.vehicle_id === vid && u.status === 'ativa'); },
  myUse() { return this.d.usage.find(u => u.user_id === S.user?.id && u.status === 'ativa'); },
  canSee(v) { return isAdmin() || v.responsavel === S.user.id || (v.autorizados || []).includes(S.user.id); },
  vehicles() { return this.d.vehicles.filter(v => this.canSee(v)); },
  trips() { const ids = new Set(this.vehicles().map(v => v.id)); return this.d.trips.filter(t => ids.has(t.vehicle_id)); },
  fuelings() { const ids = new Set(this.vehicles().map(v => v.id)); return this.d.fuelings.filter(t => ids.has(t.vehicle_id)); },

  /* Última km válida: maior km de chegada de TODAS as viagens do veículo (qualquer usuário). Nunca retrocede. */
  lastKm(vid) {
    const v = this.veh(vid); let best = null;
    for (const t of this.d.trips) if (t.vehicle_id === vid && (!best || t.km_chegada > best.km_chegada)) best = t;
    if (!best || best.km_chegada < (v?.km_inicial || 0)) return { km: v?.km_inicial ?? null, fonte: 'cadastro do veículo', trip: null };
    return { km: best.km_chegada, fonte: `viagem de ${fd(best.data)} · ${this.user(best.user_id)?.nome || best.usuario_texto || 'importação'}`, trip: best };
  },
  ordered(vid) { return this.d.trips.filter(t => t.vehicle_id === vid).sort((a, b) => (a.data + (a.hora_saida || '') + a.criado_em).localeCompare(b.data + (b.hora_saida || '') + b.criado_em)); },
  inconsistencies(vid) {
    const out = [], L = this.ordered(vid);
    for (let i = 1; i < L.length; i++) if (L[i].km_saida !== L[i - 1].km_chegada) out.push({ trip: L[i], prev: L[i - 1], diff: L[i].km_saida - L[i - 1].km_chegada });
    return out;
  },

  assumir(vid) {
    if (isAdmin()) throw Error('A conta MASTERS é administrativa e não assume veículos.');
    const v = this.veh(vid); if (!v || !this.canSee(v)) throw Error('Você não está autorizado a usar este veículo.');
    if (this.activeUse(vid)) throw Error('Este veículo já está em uso por outra pessoa.');
    if (this.myUse()) throw Error('Você já está com um veículo. Libere-o antes de assumir outro.');
    const u = { id: uid(), vehicle_id: vid, user_id: S.user.id, status: 'ativa', inicio: new Date().toISOString(), fim: null, liberado_por: null, justificativa: '' };
    this.d.usage.push(u); this.audit('ASSUMIR_VEICULO', 'veiculo', vid, `${S.user.nome} assumiu ${v.nome} (${v.placa}).`); this.save();
  },
  liberar(vid, just) {
    const u = this.activeUse(vid); if (!u) throw Error('O veículo já está disponível.');
    const adminRel = u.user_id !== S.user.id;
    if (adminRel && !isAdmin()) throw Error('Somente quem está com o veículo ou o administrador pode liberá-lo.');
    if (adminRel && !String(just || '').trim()) throw Error('Liberação administrativa exige justificativa.');
    Object.assign(u, { status: 'encerrada', fim: new Date().toISOString(), liberado_por: S.user.id, justificativa: just || '' });
    const v = this.veh(vid);
    this.audit(adminRel ? 'LIBERACAO_ADMIN' : 'LIBERAR_VEICULO', 'veiculo', vid, adminRel ? `Liberação administrativa de ${v.nome} (estava com ${this.user(u.user_id)?.nome}). Justificativa: ${just}` : `${S.user.nome} liberou ${v.nome}.`);
    this.save();
  },
  addTrip(t) {
    if (this.d.trips.some(x => x.id === t.id)) return 'repetido'; // idempotência: mesmo formulário enviado de novo
    const use = this.myUse(); if (isAdmin() || !use || use.vehicle_id !== t.vehicle_id) throw Error('Assuma o veículo antes de registrar a viagem.');
    const lk = this.lastKm(t.vehicle_id).km ?? 0;
    if (t.km_saida < lk) throw Error(`KM de saída (${nf(t.km_saida)}) menor que a última km registrada (${nf(lk)}).`);
    if (t.km_chegada < t.km_saida) throw Error('KM de chegada não pode ser menor que a KM de saída.');
    this.d.trips.push(t); this.audit('NOVA_VIAGEM', 'viagem', t.id, `${this.veh(t.vehicle_id).placa}: ${nf(t.km_saida)} → ${nf(t.km_chegada)} km (${t.origem_destino}).`); this.save(); return 'ok';
  },
  addFuel(f) {
    if (this.d.fuelings.some(x => x.id === f.id)) return 'repetido';
    const use = this.myUse(); if (isAdmin() || !use || use.vehicle_id !== f.vehicle_id) throw Error('Assuma o veículo antes de registrar o abastecimento.');
    const dup = this.d.fuelings.find(x => x.vehicle_id === f.vehicle_id && x.data === f.data && x.hora === f.hora && Math.abs(x.total - f.total) < .005);
    if (dup) throw Error('Já existe um abastecimento deste veículo com a mesma data, horário e valor. Registro não duplicado.');
    this.d.fuelings.push(f); this.audit('NOVO_ABASTECIMENTO', 'abastecimento', f.id, `${this.veh(f.vehicle_id).placa}: ${nf(f.litros, 2)} L · ${brl(f.total)}.`); this.save(); return 'ok';
  },
  saveVehicle(v) {
    if (!isAdmin()) throw Error('Somente o administrador cadastra veículos.');
    if (!v.nome.trim() || !npl(v.placa)) throw Error('Informe identificação e placa.');
    if (this.d.vehicles.some(x => x.id !== v.id && npl(x.placa) === npl(v.placa))) throw Error('Já existe um veículo com esta placa.');
    if (v.responsavel && this.user(v.responsavel)?.papel === 'admin') throw Error('MASTERS não pode ser responsável operacional.');
    const old = this.veh(v.id);
    if (old) { Object.assign(old, v); this.audit('EDITAR_VEICULO', 'veiculo', v.id, `${v.nome} (${v.placa}) atualizado.`); }
    else { this.d.vehicles.push({ ...v, id: uid(), autorizados: v.responsavel ? [v.responsavel] : [], ativo: true }); this.audit('NOVO_VEICULO', 'veiculo', '', `${v.nome} (${v.placa}) cadastrado.`); }
    this.save();
  },
  alocar(vid, resp, autorizados) {
    if (!isAdmin()) throw Error('Acesso restrito ao administrador.');
    const v = this.veh(vid);
    if (resp && this.user(resp)?.papel === 'admin') throw Error('MASTERS não pode ser responsável operacional.');
    const before = `${this.user(v.responsavel)?.nome || 'sem responsável'}`;
    v.responsavel = resp || null; v.autorizados = [...new Set(autorizados.filter(id => this.user(id)?.papel !== 'admin'))];
    this.audit('ALOCACAO', 'veiculo', vid, `${v.nome}: responsável ${before} → ${this.user(resp)?.nome || 'sem responsável'}; autorizados: ${v.autorizados.map(id => this.user(id)?.nome).join(', ') || 'nenhum'}.`);
    this.save();
  },
  saveUser(u) {
    if (!isAdmin()) throw Error('Acesso restrito ao administrador.');
    const usuario = npl(u.usuario); if (!usuario || !u.nome.trim()) throw Error('Informe usuário e nome.');
    if (usuario === 'MASTERS' && u.id !== 'u-masters') throw Error('MASTERS é o único administrador e já existe.');
    if (this.d.users.some(x => x.id !== u.id && x.usuario === usuario)) throw Error('Este usuário já existe.');
    const old = this.user(u.id);
    if (old) { Object.assign(old, { nome: u.nome, ativo: u.ativo }); this.audit('EDITAR_USUARIO', 'usuario', u.id, `${u.nome}: ${u.ativo ? 'ativo' : 'inativo'}.`); }
    else { this.d.users.push({ id: uid(), usuario, nome: u.nome.trim(), papel: 'func', ativo: true }); this.audit('NOVO_USUARIO', 'usuario', '', `${u.nome} (${usuario}) cadastrado.`); }
    this.save();
  },
};

/* ───────────── Estado e sessão ───────────── */
const S = { user: null, route: 'painel', charts: [], regFilter: '', relTab: 'viagens', rel: { ini: isoDay(addDays(new Date(), -29)), fim: today(), vid: '', uid: '' }, importPreview: null, cadTab: 'veiculos' };
const isAdmin = () => S.user?.papel === 'admin';
const SESSION_KEY = 'dbm-demo-session';

const ROUTES = [
  { id: 'painel', label: 'Diário de Bordo', sub: 'Visão geral', icon: 'gauge', render: rPainel },
  { id: 'registro', label: 'Registro', sub: 'Viagens', icon: 'route', render: rRegistro },
  { id: 'cadastros', label: 'Cadastros', sub: 'Veículos', icon: 'car', render: rCadastros },
  { id: 'abastecimento', label: 'Abastecimento', sub: 'Combustível', icon: 'fuel', render: rAbastecimento },
  { id: 'relatorios', label: 'Relatórios', sub: 'Consultas e exportação', icon: 'chart', render: rRelatorios },
  { id: 'usuarios', label: 'Usuários', sub: 'Acessos', icon: 'users', render: rUsuarios, admin: true },
  { id: 'liberacoes', label: 'Liberações', sub: 'Administração', icon: 'key', render: rLiberacoes, admin: true },
  { id: 'alocacao', label: 'Alocação de veículos', sub: 'Administração', icon: 'shuffle', render: rAlocacao, admin: true },
  { id: 'importacao', label: 'Importação', sub: 'Layout do sistema anterior', icon: 'upload', render: rImportacao, admin: true },
  { id: 'auditoria', label: 'Auditoria', sub: 'Histórico de operações', icon: 'shield', render: rAuditoria, admin: true },
];

function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; $('#toast').append(t); setTimeout(() => t.remove(), 3800); }
function dialog(html, onReady) { const d = $('#dlg'); d.innerHTML = html; onReady?.(d); d.showModal(); return d; }
const closeDlg = () => $('#dlg').close();

/* ───────────── Login ───────────── */
function renderLogin() {
  $('#root').innerHTML = `
  <div class="login">
    <section class="login-art"><canvas id="routes" aria-hidden="true"></canvas>
      <div><span class="logo-chip"><img src="assets/logo-masters.svg" alt="Master's Engenharia"></span></div>
      <div style="display:grid;gap:14px">
        <h1>Diário de Bordo da frota Masters</h1>
        <p>Viagens, quilometragem, abastecimentos e uso de veículos em um só lugar, com a última quilometragem sempre recuperada do banco e histórico auditado.</p>
      </div>
      <p class="mono" style="font-size:12px;color:#7F93B8">Versão de apresentação · ${fd(today())}</p>
    </section>
    <section class="login-form">
      <form id="lf" autocomplete="on">
        <div><h2 style="font-size:22px">Entrar</h2>${window.CLOUD ? '' : '<p class="muted" style="margin:4px 0 0">Ambiente de demonstração. Use um dos perfis abaixo com a senha <b class="mono">demo</b>.</p>'}</div>
        ${window.CLOUD ? '' : `<div class="demo-users">${DB.d.users.filter(u => u.ativo).map(u => `<button type="button" data-u="${esc(u.usuario)}">${esc(u.usuario)}${u.papel === 'admin' ? ' · admin' : ''}</button>`).join('')}</div>`}
        <label class="fld">Usuário<input id="l-user" autocomplete="username" autocapitalize="characters" placeholder="Ex.: RONAN"></label>
        <label class="fld">Senha<input id="l-pass" type="password" autocomplete="current-password" placeholder="${window.CLOUD ? 'Sua senha' : 'demo'}"></label>
        <div id="l-err"></div>
        <button class="btn" style="justify-content:center">Entrar</button>
        ${window.CLOUD ? '' : '<p class="muted" style="font-size:12px;margin:0">Na versão oficial, o acesso será pelo Supabase Auth, com sessão persistente entre aberturas do aplicativo.</p>'}
      </form>
    </section>
  </div>`;
  $$('.demo-users button').forEach(b => b.onclick = () => { $('#l-user').value = b.dataset.u; $('#l-pass').value = 'demo'; $('#l-pass').focus(); });
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    if (window.CLOUD) { const bt = $('#lf button.btn'); bt.disabled = true; try { await CLOUD.login($('#l-user').value, $('#l-pass').value); location.hash = 'painel'; renderShell(); } catch (x) { bt.disabled = false; $('#l-err').innerHTML = `<div class="msg err">${ico('alert')}${esc(x.message)}</div>`; } return; }
    const u = DB.d.users.find(x => x.usuario === npl($('#l-user').value) && x.ativo);
    if (!u || $('#l-pass').value !== 'demo') { $('#l-err').innerHTML = `<div class="msg err">${ico('alert')}Usuário ou senha incorretos. Na demonstração a senha é "demo".</div>`; return; }
    S.user = u; store.set(SESSION_KEY, u.id); DB.audit('LOGIN', 'usuario', u.id, `${u.nome} entrou (demonstração).`); DB.save();
    location.hash = 'painel'; renderShell();
  };
  drawRoutes();
}
function drawRoutes() {
  const c = $('#routes'); if (!c) return; const r = c.getBoundingClientRect(), dpr = devicePixelRatio || 1; c.width = r.width * dpr; c.height = r.height * dpr;
  const x = c.getContext('2d'); x.scale(dpr, dpr); const R = rng(7);
  for (let i = 0; i < 14; i++) {
    x.beginPath(); let px = R() * r.width, py = r.height; x.moveTo(px, py);
    for (let s = 0; s < 6; s++) { px += (R() - .5) * 220; py -= r.height / 6; x.lineTo(px, py); }
    x.strokeStyle = i % 3 ? 'rgba(47,107,255,.35)' : 'rgba(23,195,220,.5)'; x.lineWidth = i % 3 ? 1 : 1.6; x.setLineDash(i % 2 ? [4, 6] : []); x.stroke();
    x.fillStyle = 'rgba(23,195,220,.8)'; x.beginPath(); x.arc(px, py, 2.2, 0, 7); x.fill();
  }
}

/* ───────────── Estrutura ───────────── */
function renderShell() {
  const collapsed = store.get('dbm-side') === '1';
  const navItem = r => `<a href="#${r.id}" data-r="${r.id}" title="${esc(r.label)}">${ico(r.icon)}<span class="lbl">${esc(r.label)}</span></a>`;
  const main = ROUTES.filter(r => !r.admin), adm = ROUTES.filter(r => r.admin);
  $('#root').innerHTML = `
  <div class="app ${collapsed ? 'collapsed' : ''}" id="app">
    <div class="scrim" id="scrim"></div>
    <aside class="side" aria-label="Menu principal">
      <div class="brand"><span class="logo-chip"><img class="wide" src="assets/logo-masters.svg" alt="Master's Engenharia"><img class="narrow" src="assets/symbol.svg" alt="Masters"></span></div>
      <div class="grp">Operação</div>${main.map(navItem).join('')}
      ${isAdmin() ? `<div class="grp">Administração</div>${adm.map(navItem).join('')}` : ''}
      <div class="foot">
        <div class="me"><span class="avatar">${esc(S.user.nome.split(' ').map(p => p[0]).slice(0, 2).join(''))}</span><span class="who"><b>${esc(S.user.nome)}</b><span>${isAdmin() ? 'Administrador' : 'Funcionário'} · ${esc(S.user.usuario)}</span></span></div>
        <button class="lnk" id="collapse" title="Recolher menu">${ico('panel')}<span class="lbl">Recolher menu</span></button>
        <button class="lnk" id="reset" title="Restaurar base de demonstração" ${window.CLOUD ? 'hidden' : ''}>${ico('reset')}<span class="lbl">Restaurar demo</span></button>
        <button class="lnk" id="logout" title="Sair">${ico('logout')}<span class="lbl">Sair</span></button>
      </div>
    </aside>
    <div class="main">
      <div class="top"><button class="iconbtn" id="burger" aria-label="Abrir menu">${ico('menu')}</button>
        <div class="crumbs"><small id="t-sub"></small><h1 id="t-title"></h1></div><div class="grow"></div>
        ${window.CLOUD ? '' : '<span class="mode-pill" title="Dados fictícios, isolados do sistema oficial">Demonstração</span>'}</div>
      <main id="page" class="page"></main>
    </div>
    <nav class="bottom" aria-label="Navegação rápida">
      <a href="#painel" data-r="painel">${ico('gauge')}Visão geral</a><a href="#registro" data-r="registro">${ico('route')}Registro</a>
      <a href="#abastecimento" data-r="abastecimento">${ico('fuel')}Abastecer</a><button id="more">${ico('menu')}Menu</button>
    </nav>
  </div>`;
  const app = $('#app');
  $('#collapse').onclick = () => { app.classList.toggle('collapsed'); store.set('dbm-side', app.classList.contains('collapsed') ? '1' : '0'); };
  $('#burger').onclick = $('#more').onclick = () => app.classList.add('open');
  $('#scrim').onclick = () => app.classList.remove('open');
  $('#logout').onclick = async () => { DB.audit('LOGOUT', 'usuario', S.user.id, `${S.user.nome} saiu.`); DB.save(); if (window.CLOUD) await CLOUD.logout().catch(() => { }); S.user = null; store.del(SESSION_KEY); renderLogin(); };
  $('#reset').onclick = () => dialog(`<div class="dh"><h2>Restaurar base de demonstração?</h2></div><div class="dialog-body"><p>Todos os registros feitos nesta demonstração, neste navegador, serão substituídos pela base fictícia original. O sistema oficial não é afetado.</p></div><div class="dialog-foot"><button class="btn sec" id="c">Cancelar</button><button class="btn danger" id="o">Restaurar</button></div>`, d => { $('#c', d).onclick = closeDlg; $('#o', d).onclick = () => { DB.reset(); const u = DB.d.users.find(x => x.usuario === S.user.usuario); S.user = u; store.set(SESSION_KEY, u.id); closeDlg(); route(); toast('Base de demonstração restaurada.'); }; });
  route();
}
function route() {
  if (!S.user) return renderLogin();
  let id = (location.hash || '#painel').slice(1);
  let r = ROUTES.find(x => x.id === id) || ROUTES[0];
  if (r.admin && !isAdmin()) r = ROUTES[0];
  S.route = r.id;
  $$('[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === r.id));
  $('#app')?.classList.remove('open');
  $('#t-title').textContent = r.label; $('#t-sub').textContent = r.sub;
  S.charts.forEach(c => c.destroy()); S.charts = [];
  const p = $('#page'); p.style.animation = 'none'; p.offsetHeight; p.style.animation = '';
  p.innerHTML = r.render();
  r.after?.(); afterRender[r.id]?.();
}
const afterRender = {};
window.addEventListener('hashchange', () => S.user && route());

/* ───────────── Componentes ───────────── */
const vehLabel = v => `${esc(v.nome)} <span class="plate">${esc(v.placa)}</span>`;
function statusOf(v) {
  const u = DB.activeUse(v.id);
  if (!v.ativo) return { cls: 'p-mute', txt: 'Inativo', u };
  if (!u) return { cls: 'p-ok', txt: 'Disponível', u };
  const h = (Date.now() - new Date(u.inicio)) / 3600e3;
  return { cls: h > 12 ? 'p-warn' : 'p-info', txt: h > 12 ? `Em uso há ${Math.floor(h)} h` : 'Em uso', u };
}
function vehCard(v, actions = true) {
  const st = statusOf(v), lk = DB.lastKm(v.id), resp = DB.user(v.responsavel);
  let act = '';
  if (actions && !isAdmin()) {
    if (st.u && st.u.user_id === S.user.id) act = `<button class="btn sm sec" data-rel="${v.id}">${ico('key')}Liberar veículo</button>`;
    else if (!st.u && !DB.myUse()) act = `<button class="btn sm" data-ass="${v.id}">${ico('check')}Assumir veículo</button>`;
  }
  return `<article class="veh">
    <div class="row"><div><b>${esc(v.nome)}</b><div class="muted" style="font-size:12px">${esc(v.modelo || '')}</div></div><span class="plate">${esc(v.placa)}</span></div>
    <div class="row"><span class="pill ${st.cls}">${st.txt}</span><span class="km">${lk.km != null ? nf(lk.km) : '—'}<span class="muted" style="font:500 12px var(--f-body)"> km</span></span></div>
    <dl><dt>Responsável padrão</dt><dd>${esc(resp?.nome || '—')}</dd><dt>Com</dt><dd>${st.u ? esc(DB.user(st.u.user_id)?.nome) + ' · desde ' + fdt(st.u.inicio) : '—'}</dd></dl>
    ${act ? `<div class="bar">${act}</div>` : ''}
  </article>`;
}
function bindVehActions() {
  $$('[data-ass]').forEach(b => b.onclick = async () => { try { await DB.assumir(b.dataset.ass); toast('Veículo assumido. Você já pode registrar viagens e abastecimentos.'); route(); } catch (e) { toast(e.message); } });
  $$('[data-rel]').forEach(b => b.onclick = () => dialog(`<div class="dh"><h2>Liberar veículo?</h2></div><div class="dialog-body"><p>O veículo ficará disponível para outros funcionários autorizados.</p></div><div class="dialog-foot"><button class="btn sec" id="c">Cancelar</button><button class="btn" id="o">Liberar</button></div>`, d => { $('#c', d).onclick = closeDlg; $('#o', d).onclick = async () => { try { await DB.liberar(b.dataset.rel); closeDlg(); toast('Veículo liberado.'); route(); } catch (e) { toast(e.message); } }; }));
}
function table(cols, rows, empty = 'Nenhum registro encontrado.') {
  if (!rows.length) return `<div class="tw"><div class="empty">${empty}</div></div>`;
  return `<div class="tw"><table><thead><tr>${cols.map(c => `<th class="${c.n ? 'n' : ''}">${c.h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr class="${r.__flag ? 'flag' : ''}">${cols.map(c => `<td class="${c.n ? 'n' : ''}">${c.f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function mkChart(id, cfg) {
  if (!window.Chart) { $('#' + id).parentElement.innerHTML = '<div class="empty">Gráfico indisponível sem conexão.</div>'; return; }
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif'; Chart.defaults.color = css('--muted'); Chart.defaults.borderColor = css('--line');
  S.charts.push(new Chart($('#' + id), cfg));
}
const VCOL = ['#2F6BFF', '#17C3DC', '#7C8BA5', '#16A34A', '#D98A00', '#9B5CF6'];

/* ───────────── 1. Visão geral ───────────── */
function periodStats(ini, fim, vids) {
  const T = DB.trips().filter(t => t.data >= ini && t.data <= fim && (!vids || vids.includes(t.vehicle_id)));
  const A = DB.fuelings().filter(a => a.data >= ini && a.data <= fim && (!vids || vids.includes(a.vehicle_id)));
  const km = T.reduce((s, t) => s + (t.km_chegada - t.km_saida), 0), lit = A.reduce((s, a) => s + a.litros, 0), tot = A.reduce((s, a) => s + a.total, 0);
  return { T, A, km, lit, tot, kml: lit ? km / lit : null };
}
function attention() {
  const out = [];
  for (const v of DB.vehicles()) {
    const st = statusOf(v);
    if (st.u && st.cls === 'p-warn') out.push({ lvl: 'warn', t: `${v.nome} em uso há mais de 12 h`, d: `Com ${DB.user(st.u.user_id)?.nome} desde ${fdt(st.u.inicio)}. Verifique se precisa ser liberado.` });
    for (const i of DB.inconsistencies(v.id)) out.push({ lvl: 'crit', t: `Quilometragem divergente no ${v.nome}`, d: `Viagem de ${fd(i.trip.data)} saiu com ${nf(i.trip.km_saida)} km; a anterior terminou em ${nf(i.prev.km_chegada)} km (${i.diff > 0 ? 'lacuna de ' : 'retrocesso de '}${nf(Math.abs(i.diff))} km). Registros originais preservados.` });
    const lk = DB.lastKm(v.id).km;
    if (v.km_troca_oleo && lk != null && v.km_troca_oleo - lk <= 1000) out.push({ lvl: v.km_troca_oleo - lk <= 0 ? 'crit' : 'warn', t: `Troca de óleo do ${v.nome}`, d: v.km_troca_oleo - lk <= 0 ? `Prevista para ${nf(v.km_troca_oleo)} km; veículo já está com ${nf(lk)} km.` : `Faltam ${nf(v.km_troca_oleo - lk)} km (prevista para ${nf(v.km_troca_oleo)} km).` });
  }
  return out;
}
function rPainel() {
  const V = DB.vehicles(), ini = isoDay(addDays(new Date(), -29)), fim = today(), P = periodStats(ini, fim);
  const emUso = V.filter(v => DB.activeUse(v.id)).length, att = attention();
  const recent = [...P.T.map(t => ({ k: 'v', at: t.data + (t.hora_saida || ''), t })), ...P.A.map(a => ({ k: 'a', at: a.data + a.hora, a }))].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7);
  const mine = DB.myUse();
  afterRender.painel = () => {
    bindVehActions();
    const days = [...Array(30)].map((_, i) => isoDay(addDays(new Date(), i - 29)));
    mkChart('c-km', { type: 'bar', data: { labels: days.map(d => fd(d).slice(0, 5)), datasets: V.map((v, i) => ({ label: v.nome, backgroundColor: VCOL[i % VCOL.length], borderRadius: 3, data: days.map(d => P.T.filter(t => t.data === d && t.vehicle_id === v.id).reduce((s, t) => s + t.km_chegada - t.km_saida, 0)) })) }, options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${nf(c.raw)} km` } } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } }, y: { stacked: true, ticks: { callback: v => nf(v) } } } } });
    mkChart('c-fuel', { type: 'doughnut', data: { labels: V.map(v => v.nome), datasets: [{ data: V.map(v => P.A.filter(a => a.vehicle_id === v.id).reduce((s, a) => s + a.total, 0)), backgroundColor: V.map((_, i) => VCOL[i % VCOL.length]), borderColor: css('--surface'), borderWidth: 3 }] }, options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }, tooltip: { callbacks: { label: c => `${c.label}: ${brl(c.raw)}` } } } } });
  };
  return `
  ${!isAdmin() ? `<div class="msg ${mine ? 'ok' : 'info'}">${ico(mine ? 'check' : 'car')}<span>${mine ? `Você está com o <b>${esc(DB.veh(mine.vehicle_id).nome)}</b> desde ${fdt(mine.inicio)}. <a href="#registro">Registrar viagem</a> · <a href="#abastecimento">Registrar abastecimento</a>` : 'Você não está com nenhum veículo. Assuma um veículo disponível abaixo para registrar viagens e abastecimentos.'}</span></div>` : ''}
  <section class="kpis k8" aria-label="Indicadores dos últimos 30 dias">
    <div class="kpi" style="--tone:var(--navy-2)"><span class="k">${ico('car')}Veículos</span><span class="v">${V.length}</span><span class="s">${isAdmin() ? 'cadastrados' : 'autorizados para você'}</span></div>
    <div class="kpi" style="--tone:var(--ok)"><span class="k">Disponíveis</span><span class="v">${V.length - emUso}</span><span class="s">prontos para uso</span></div>
    <div class="kpi" style="--tone:var(--electric)"><span class="k">Em utilização</span><span class="v">${emUso}</span><span class="s">com funcionário agora</span></div>
    <div class="kpi" style="--tone:var(--cyan)"><span class="k">${ico('route')}Viagens</span><span class="v">${nf(P.T.length)}</span><span class="s">últimos 30 dias</span></div>
    <div class="kpi" style="--tone:var(--cyan)"><span class="k">Km percorridos</span><span class="v">${nf(P.km)}</span><span class="s">últimos 30 dias</span></div>
    <div class="kpi" style="--tone:var(--warn)"><span class="k">${ico('fuel')}Combustível</span><span class="v">${brl0(P.tot)}</span><span class="s">${P.A.length} abastecimentos · ${nf(P.lit, 0)} L</span></div>
    <div class="kpi" style="--tone:var(--graphite)"><span class="k">Consumo médio</span><span class="v">${P.kml ? nf(P.kml, 1) : '—'}<small style="font-size:14px"> km/L</small></span><span class="s">estimado: km ÷ litros</span></div>
    <div class="kpi" style="--tone:${att.length ? 'var(--crit)' : 'var(--ok)'}"><span class="k">${ico('alert')}Atenção</span><span class="v">${att.length}</span><span class="s">${att.length ? 'situações a verificar' : 'nada pendente'}</span></div>
  </section>
  <section class="card"><header><h2>Frota agora</h2><span class="grow"></span><span class="muted" style="font-size:12px">Última km calculada a partir das viagens de todos os usuários</span></header>
    <div class="fleet">${V.map(v => vehCard(v)).join('') || '<div class="empty">Nenhum veículo autorizado.</div>'}</div></section>
  <div class="grid g-dash">
    <section class="card"><header><h2>Quilometragem por dia</h2><span class="grow"></span><span class="muted" style="font-size:12px">${fd(ini)} a ${fd(fim)}</span></header><div class="chart-box"><canvas id="c-km" aria-label="Gráfico de km por dia"></canvas></div></section>
    <section class="card"><header><h2>Gasto com combustível</h2><span class="grow"></span><span class="muted" style="font-size:12px">30 dias</span></header><div class="chart-box"><canvas id="c-fuel" aria-label="Gráfico de gasto por veículo"></canvas></div></section>
  </div>
  <div class="grid g2">
    <section class="card"><header><h2>Precisa de atenção</h2><span class="grow"></span><span class="pill ${att.length ? 'p-warn' : 'p-ok'}">${att.length || 'Nada pendente'}</span></header>
      <div class="list">${att.map(a => `<div class="li">${ico('alert')}<div class="t"><b style="color:var(--${a.lvl})">${esc(a.t)}</b><div class="muted" style="font-size:13px">${esc(a.d)}</div></div></div>`).join('') || '<div class="empty">Nenhuma situação pendente.</div>'}</div></section>
    <section class="card"><header><h2>Histórico recente</h2></header>
      <div class="list">${recent.map(r => r.k === 'v' ? `<div class="li">${ico('route')}<div class="t"><b>${esc(DB.veh(r.t.vehicle_id).nome)}</b> · ${esc(r.t.origem_destino)}<div class="muted" style="font-size:12px">${fd(r.t.data)} ${esc(r.t.hora_saida || '')} · ${esc(DB.user(r.t.user_id)?.nome || r.t.usuario_texto)} · <span class="mono">${nf(r.t.km_chegada - r.t.km_saida)} km</span></div></div></div>` : `<div class="li">${ico('fuel')}<div class="t"><b>${esc(DB.veh(r.a.vehicle_id).nome)}</b> · ${esc(r.a.posto || 'Abastecimento')}<div class="muted" style="font-size:12px">${fd(r.a.data)} ${esc(r.a.hora)} · <span class="mono">${nf(r.a.litros, 2)} L · ${brl(r.a.total)}</span></div></div></div>`).join('') || '<div class="empty">Sem movimentação no período.</div>'}</div></section>
  </div>`;
}

/* ───────────── 2. Registro de viagens ───────────── */
function rRegistro() {
  const mine = DB.myUse(), V = DB.vehicles();
  const vid = mine ? mine.vehicle_id : (S.regFilter || V[0]?.id);
  const v = DB.veh(vid);
  let top = '';
  if (isAdmin()) top = `<div class="msg info">${ico('shield')}<span>A conta MASTERS consulta os registros, mas não assume veículos nem registra viagens. Selecione um veículo para ver o histórico.</span></div>`;
  else if (!mine) top = `<section class="card"><header><h2>Assuma um veículo para registrar</h2></header><div class="fleet">${V.map(x => vehCard(x)).join('')}</div></section>`;
  else {
    const lk = DB.lastKm(vid), fid = uid();
    top = `<section class="card"><header><h2>Nova viagem</h2><span class="grow"></span>${vehLabel(v)}</header>
      <div class="lastkm">${ico('gauge')}<div><div class="muted" style="font-size:12px">Última quilometragem válida do veículo</div><b>${lk.km != null ? nf(lk.km) + ' km' : 'Sem registro'}</b><div class="muted" style="font-size:12px">Fonte: ${esc(lk.fonte)}</div></div></div>
      <form class="f" id="tf" data-fid="${fid}" style="margin-top:14px" novalidate>
        <label class="fld">Data<input id="t-data" type="date" value="${today()}" required></label>
        <label class="fld">Hora de saída<input id="t-hs" type="time" required></label>
        <label class="fld">Hora de chegada<input id="t-hc" type="time"></label>
        <label class="fld">KM de saída<input id="t-kms" type="number" inputmode="numeric" min="0" value="${lk.km ?? ''}" required><span class="hint muted">Preenchida com a última km. Só aumente se houver uso não registrado.</span></label>
        <label class="fld">KM de chegada<input id="t-kmc" type="number" inputmode="numeric" min="0" required><span class="hint muted" id="t-rod">&nbsp;</span></label>
        <label class="fld w">Origem / Destino<input id="t-od" required placeholder="Ex.: Sede → Obra Residencial"></label>
        <label class="fld">Nome do motorista (legível)<input id="t-mot" value="${esc(S.user.nome)}" required></label>
        <label class="fld">Finalidade<input id="t-fin" placeholder="Ex.: Visita técnica"></label>
        <label class="fld">Usuário<input value="${esc(S.user.usuario)}" readonly></label>
        <label class="fld w">Observações<textarea id="t-obs" rows="2"></textarea></label>
        <label class="check w"><input type="checkbox" id="t-visto"> Visto do motorista: confirmo que as informações estão corretas.</label>
        <div class="w" id="t-err"></div>
        <div class="w bar"><button class="btn" id="t-save">${ico('check')}Salvar viagem</button><button type="button" class="btn sec" data-rel="${vid}">${ico('key')}Liberar veículo</button></div>
      </form></section>`;
  }
  const T = DB.ordered(vid).reverse(), inc = new Set(DB.inconsistencies(vid).map(i => i.trip.id));
  afterRender.registro = () => {
    bindVehActions();
    $('#reg-v')?.addEventListener('change', e => { S.regFilter = e.target.value; route(); });
    const f = $('#tf'); if (!f) return;
    const upd = () => { const s = +$('#t-kms').value, c = +$('#t-kmc').value; $('#t-rod').textContent = $('#t-kmc').value && c >= s ? `${nf(c - s)} km rodados` : ' '; };
    $('#t-kms').oninput = $('#t-kmc').oninput = upd;
    $('#t-hs').value = new Date().toTimeString().slice(0, 5);
    f.onsubmit = async e => {
      e.preventDefault(); const btn = $('#t-save'); if (btn.disabled) return;
      const g = id => $('#' + id).value.trim(), lk = DB.lastKm(vid).km ?? 0;
      const t = { id: f.dataset.fid, vehicle_id: vid, user_id: S.user.id, data: g('t-data'), hora_saida: g('t-hs'), hora_chegada: g('t-hc'), km_saida: Number(g('t-kms')), km_chegada: Number(g('t-kmc')), origem_destino: g('t-od'), motorista: g('t-mot'), finalidade: g('t-fin'), visto: $('#t-visto').checked, usuario_texto: S.user.usuario, obs: g('t-obs'), origem: 'app', criado_em: new Date().toISOString() };
      let err = '';
      if (!t.data || !t.hora_saida) err = 'Informe data e hora de saída.';
      else if (t.data > today()) err = 'A data não pode ser futura.';
      else if (g('t-kms') === '' || g('t-kmc') === '') err = 'Informe KM de saída e KM de chegada.';
      else if (t.km_saida < lk) err = `KM de saída menor que a última km registrada (${nf(lk)}). Confira o hodômetro.`;
      else if (t.km_chegada < t.km_saida) err = 'KM de chegada não pode ser menor que a KM de saída.';
      else if (t.km_chegada - t.km_saida > 1500) err = 'Distância acima de 1.500 km em uma viagem. Confira os valores.';
      else if (!t.origem_destino || !t.motorista) err = 'Informe origem/destino e o nome do motorista.';
      else if (!t.visto) err = 'Marque o visto do motorista para confirmar.';
      if (err) { $('#t-err').innerHTML = `<div class="msg err">${ico('alert')}${esc(err)}</div>`; return; }
      const gap = t.km_saida - lk;
      const go = async () => { btn.disabled = true; try { const r = await DB.addTrip(t); toast(r === 'repetido' ? 'Esta viagem já estava salva. Nada foi duplicado.' : 'Viagem salva. Última km atualizada.'); route(); } catch (x) { btn.disabled = false; $('#t-err').innerHTML = `<div class="msg err">${ico('alert')}${esc(x.message)}</div>`; } };
      if (gap > 0) dialog(`<div class="dh"><h2>KM de saída acima da última registrada</h2></div><div class="dialog-body"><p>Há <b>${nf(gap)} km</b> sem registro entre a última viagem (${nf(lk)} km) e esta saída (${nf(t.km_saida)} km). A viagem será salva e a diferença aparecerá em "Precisa de atenção".</p></div><div class="dialog-foot"><button class="btn sec" id="c">Corrigir</button><button class="btn" id="o">Salvar assim mesmo</button></div>`, d => { $('#c', d).onclick = closeDlg; $('#o', d).onclick = () => { closeDlg(); go(); }; });
      else go();
    };
  };
  return `${top}
  <section class="card"><header><h2>Viagens do veículo</h2><span class="grow"></span>
    ${mine ? vehLabel(v) : `<label class="fld" style="min-width:220px"><select id="reg-v" aria-label="Veículo">${V.map(x => `<option value="${x.id}" ${x.id === vid ? 'selected' : ''}>${esc(x.nome)} – ${esc(x.placa)}</option>`).join('')}</select></label>`}</header>
    ${table([
      { h: 'Data', f: r => fd(r.data) }, { h: 'Saída', f: r => esc(r.hora_saida) }, { h: 'Chegada', f: r => esc(r.hora_chegada) },
      { h: 'KM saída', n: 1, f: r => `<span class="mono">${nf(r.km_saida)}</span>` }, { h: 'KM chegada', n: 1, f: r => `<span class="mono">${nf(r.km_chegada)}</span>` },
      { h: 'Rodado', n: 1, f: r => `<span class="mono">${nf(r.km_chegada - r.km_saida)}</span>` }, { h: 'Origem / Destino', f: r => esc(r.origem_destino) },
      { h: 'Motorista', f: r => esc(r.motorista) }, { h: 'Finalidade', f: r => esc(r.finalidade) }, { h: 'Visto', f: r => r.visto ? 'OK' : '' },
      { h: 'Situação', f: r => inc.has(r.id) ? '<span class="pill p-warn">KM divergente</span>' : r.origem === 'importacao' ? '<span class="pill p-cyan">Importada</span>' : '<span class="pill p-ok">Válida</span>' },
    ], T.slice(0, 40).map(r => ({ ...r, __flag: inc.has(r.id) })), 'Nenhuma viagem registrada para este veículo.')}
    ${T.length > 40 ? `<p class="muted" style="font-size:12px">Mostrando as 40 mais recentes de ${T.length}. Use Relatórios para o histórico completo.</p>` : ''}
  </section>`;
}

/* ───────────── 3. Cadastros ───────────── */
function rCadastros() {
  const V = isAdmin() ? DB.d.vehicles : DB.vehicles();
  afterRender.cadastros = () => {
    $('#nv')?.addEventListener('click', () => vehicleDialog());
    $$('[data-edv]').forEach(b => b.onclick = () => vehicleDialog(DB.veh(b.dataset.edv)));
  };
  return `<section class="card"><header><h2>Veículos</h2><span class="grow"></span>${isAdmin() ? `<button class="btn" id="nv">${ico('plus')}Novo veículo</button>` : '<span class="muted" style="font-size:12px">Somente consulta. Cadastro feito pelo administrador.</span>'}</header>
  ${table([
    { h: 'Veículo', f: v => `<b>${esc(v.nome)}</b><div class="muted" style="font-size:12px">${esc(v.modelo || '')}</div>` }, { h: 'Placa', f: v => `<span class="plate">${esc(v.placa)}</span>` },
    { h: 'Responsável padrão', f: v => esc(DB.user(v.responsavel)?.nome || '—') }, { h: 'Última km', n: 1, f: v => `<span class="mono">${nf(DB.lastKm(v.id).km)}</span>` },
    { h: 'Troca de óleo', n: 1, f: v => v.km_troca_oleo ? `<span class="mono">${nf(v.km_troca_oleo)}</span>` : '—' }, { h: 'Situação', f: v => { const s = statusOf(v); return `<span class="pill ${s.cls}">${s.txt}</span>`; } },
    ...(isAdmin() ? [{ h: '', f: v => `<button class="btn sm sec" data-edv="${v.id}">Editar</button>` }] : []),
  ], V)}
  <p class="muted" style="font-size:12px;margin:10px 0 0">Sem limite de veículos. Placas são comparadas sem traço e sem espaço, para impedir duplicidade (QZH-4A95 = QZH4A95). Veículos não são excluídos: ficam inativos para preservar o histórico.</p></section>`;
}
function vehicleDialog(v) {
  const U = DB.d.users.filter(u => u.papel !== 'admin' && u.ativo);
  dialog(`<form id="vf"><div class="dh"><h2>${v ? 'Editar veículo' : 'Novo veículo'}</h2></div><div class="dialog-body"><div class="f" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
    <label class="fld">Identificação *<input id="v-nome" value="${esc(v?.nome)}" placeholder="Ex.: Fiat Mobi"></label>
    <label class="fld">Modelo<input id="v-mod" value="${esc(v?.modelo)}"></label>
    <label class="fld">Placa *<input id="v-pl" value="${esc(v?.placa)}" placeholder="ABC1D23"></label>
    <label class="fld">KM inicial<input id="v-km" type="number" min="0" value="${v?.km_inicial ?? 0}"></label>
    <label class="fld">KM da próxima troca de óleo<input id="v-oleo" type="number" min="0" value="${v?.km_troca_oleo ?? ''}"></label>
    <label class="fld">Responsável padrão<select id="v-resp"><option value="">Sem responsável</option>${U.map(u => `<option value="${u.id}" ${v?.responsavel === u.id ? 'selected' : ''}>${esc(u.nome)}</option>`).join('')}</select></label>
    ${v ? `<label class="check"><input type="checkbox" id="v-at" ${v.ativo ? 'checked' : ''}> Veículo ativo</label>` : ''}
    </div><div id="v-err"></div></div>
    <div class="dialog-foot"><button type="button" class="btn sec" id="c">Cancelar</button><button class="btn">Salvar</button></div></form>`, d => {
    $('#c', d).onclick = closeDlg;
    $('#vf', d).onsubmit = async e => { e.preventDefault(); try { await DB.saveVehicle({ ...(v || {}), id: v?.id, nome: $('#v-nome').value.trim(), modelo: $('#v-mod').value.trim(), placa: $('#v-pl').value.trim().toUpperCase(), km_inicial: Number($('#v-km').value || 0), km_troca_oleo: $('#v-oleo').value ? Number($('#v-oleo').value) : null, responsavel: $('#v-resp').value || null, ativo: v ? $('#v-at').checked : true }); closeDlg(); toast('Veículo salvo.'); route(); } catch (x) { $('#v-err').innerHTML = `<div class="msg err">${esc(x.message)}</div>`; } };
  });
}

/* ───────────── 4. Abastecimento ───────────── */
const MOD = { avulso: 'Avulso / vinculado a viagem', req: 'Requisição Masters', func: 'Pago pelo funcionário' };
function rAbastecimento() {
  const mine = DB.myUse(), V = DB.vehicles();
  let top = '';
  if (isAdmin()) top = `<div class="msg info">${ico('shield')}<span>A conta MASTERS consulta os abastecimentos, mas não registra em nome dos funcionários.</span></div>`;
  else if (!mine) top = `<div class="msg info">${ico('car')}<span>Assuma um veículo na <a href="#registro">tela de Registro</a> para lançar abastecimentos.</span></div>`;
  else {
    const vid = mine.vehicle_id, lk = DB.lastKm(vid), postos = [...new Set(DB.d.fuelings.map(a => a.posto).filter(Boolean))];
    const trips = DB.ordered(vid).reverse().slice(0, 8);
    top = `<section class="card"><header><h2>Novo abastecimento</h2><span class="grow"></span>${vehLabel(DB.veh(vid))}</header>
    <form class="f" id="af" data-fid="${uid()}" novalidate>
      <label class="fld">Data<input id="a-data" type="date" value="${today()}"></label>
      <label class="fld">Horário<input id="a-hora" type="time"></label>
      <label class="fld">KM do veículo<input id="a-km" type="number" min="0" inputmode="numeric" value="${lk.km ?? ''}"><span class="hint muted">Sugerida pela última km válida</span></label>
      <label class="fld">Posto<input id="a-posto" list="postos" placeholder="Selecione ou digite"><datalist id="postos">${postos.map(p => `<option value="${esc(p)}">`).join('')}</datalist></label>
      <label class="fld">Combustível<select id="a-comb">${['Gasolina', 'Etanol', 'Diesel', 'GNV', 'Outro'].map(c => `<option ${c === (DB.veh(vid).modelo || '').match(/Diesel/i)?.[0] ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label class="fld">Modalidade<select id="a-mod">${Object.entries(MOD).map(([k, l]) => `<option value="${k}" ${k === 'req' ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="fld">Valor total pago (R$)<input id="a-tot" inputmode="decimal" placeholder="300,00"></label>
      <label class="fld">Preço por litro (R$/L)<input id="a-prec" inputmode="decimal" placeholder="6,19"></label>
      <label class="fld">Litros (calculado)<input id="a-lit" readonly tabindex="-1"></label>
      <label class="fld w">Viagem relacionada (opcional)<select id="a-trip"><option value="">Nenhuma</option>${trips.map(t => `<option value="${t.id}">${fd(t.data)} — ${esc(t.origem_destino)}</option>`).join('')}</select></label>
      <label class="fld w">Observações<input id="a-obs"></label>
      <div class="w" id="a-err"></div>
      <div class="w bar"><button class="btn" id="a-save">${ico('check')}Salvar abastecimento</button></div>
    </form></section>`;
  }
  const A = DB.fuelings().slice().sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
  const P = periodStats(isoDay(addDays(new Date(), -29)), today());
  afterRender.abastecimento = () => {
    const f = $('#af'); if (!f) return;
    $('#a-hora').value = new Date().toTimeString().slice(0, 5);
    const calc = () => { const t = pbr($('#a-tot').value), p = pbr($('#a-prec').value); $('#a-lit').value = t > 0 && p > 0 ? nf(Math.round(t / p * 100) / 100, 2) : ''; };
    $('#a-tot').oninput = $('#a-prec').oninput = calc;
    f.onsubmit = async e => {
      e.preventDefault(); const btn = $('#a-save'); if (btn.disabled) return;
      const t = pbr($('#a-tot').value), p = pbr($('#a-prec').value), km = $('#a-km').value === '' ? null : Number($('#a-km').value);
      let err = '';
      if (!$('#a-data').value || !$('#a-hora').value) err = 'Informe data e horário.';
      else if (!(t > 0)) err = 'Valor total inválido. Use números, por exemplo 300,00.';
      else if (!(p > 0)) err = 'Preço por litro inválido. Use números, por exemplo 6,19.';
      else if (km != null && km < 0) err = 'A quilometragem deve ser 0 ou maior.';
      if (err) { $('#a-err').innerHTML = `<div class="msg err">${ico('alert')}${esc(err)}</div>`; return; }
      btn.disabled = true;
      try {
        const r = await DB.addFuel({ id: f.dataset.fid, vehicle_id: mine.vehicle_id, user_id: S.user.id, trip_id: $('#a-trip').value || null, data: $('#a-data').value, hora: $('#a-hora').value, km, posto: $('#a-posto').value.trim(), combustivel: $('#a-comb').value, litros: Math.round(t / p * 100) / 100, preco_litro: p, total: t, modalidade: $('#a-mod').value, obs: $('#a-obs').value.trim(), origem: 'app', criado_em: new Date().toISOString() });
        toast(r === 'repetido' ? 'Este abastecimento já estava salvo. Nada foi duplicado.' : 'Abastecimento salvo.'); route();
      } catch (x) { btn.disabled = false; $('#a-err').innerHTML = `<div class="msg err">${ico('alert')}${esc(x.message)}</div>`; }
    };
  };
  return `${top}
  <section class="kpis"><div class="kpi" style="--tone:var(--warn)"><span class="k">Gasto em 30 dias</span><span class="v">${brl0(P.tot)}</span></div><div class="kpi" style="--tone:var(--cyan)"><span class="k">Litros em 30 dias</span><span class="v">${nf(P.lit, 1)}</span></div><div class="kpi" style="--tone:var(--electric)"><span class="k">Preço médio</span><span class="v">${P.lit ? brl(P.tot / P.lit) : '—'}</span><span class="s">por litro</span></div><div class="kpi" style="--tone:var(--graphite)"><span class="k">Abastecimentos</span><span class="v">${P.A.length}</span><span class="s">30 dias</span></div></section>
  <section class="card"><header><h2>Abastecimentos registrados</h2></header>
  ${table([
    { h: 'Data', f: a => fd(a.data) }, { h: 'Hora', f: a => esc(a.hora) }, { h: 'Veículo', f: a => vehLabel(DB.veh(a.vehicle_id)) }, { h: 'KM', n: 1, f: a => a.km != null ? `<span class="mono">${nf(a.km)}</span>` : '—' },
    { h: 'Posto', f: a => esc(a.posto) }, { h: 'Combustível', f: a => esc(a.combustivel) }, { h: 'Modalidade', f: a => esc(MOD[a.modalidade] || '') },
    { h: 'Litros', n: 1, f: a => nf(a.litros, 2) }, { h: 'R$/L', n: 1, f: a => nf(a.preco_litro, 3) }, { h: 'Total', n: 1, f: a => brl(a.total) }, { h: 'Registrado por', f: a => esc(DB.user(a.user_id)?.nome || 'Importação') },
  ], A.slice(0, 40))}
  <p class="muted" style="font-size:12px;margin:10px 0 0">Proteção contra duplicidade: cada formulário tem um identificador único (clique repetido, recarga ou reenvio não criam um segundo registro) e o sistema recusa abastecimento do mesmo veículo com mesma data, horário e valor.</p></section>`;
}

/* ───────────── 5. Relatórios ───────────── */
function relData() {
  const { ini, fim, vid, uid: u } = S.rel;
  const T = DB.trips().filter(t => t.data >= ini && t.data <= fim && (!vid || t.vehicle_id === vid) && (!u || t.user_id === u)).sort((a, b) => (a.data + a.hora_saida).localeCompare(b.data + b.hora_saida));
  const A = DB.fuelings().filter(a => a.data >= ini && a.data <= fim && (!vid || a.vehicle_id === vid) && (!u || a.user_id === u)).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  return { T, A };
}
function rRelatorios() {
  const V = DB.vehicles(), U = DB.d.users.filter(x => x.papel !== 'admin'), { T, A } = relData();
  const frota = V.filter(v => !S.rel.vid || v.id === S.rel.vid).map(v => { const t = T.filter(x => x.vehicle_id === v.id), a = A.filter(x => x.vehicle_id === v.id), km = t.reduce((s, x) => s + x.km_chegada - x.km_saida, 0), l = a.reduce((s, x) => s + x.litros, 0); return { v, n: t.length, km, l, tot: a.reduce((s, x) => s + x.total, 0), dias: new Set(t.map(x => x.data)).size, kml: l ? km / l : null }; });
  const porU = U.map(u => { const t = T.filter(x => x.user_id === u.id), a = A.filter(x => x.user_id === u.id); return { u, n: t.length, km: t.reduce((s, x) => s + x.km_chegada - x.km_saida, 0), na: a.length, tot: a.reduce((s, x) => s + x.total, 0) }; }).filter(x => x.n || x.na);
  const tabs = { viagens: 'Viagens', abastecimentos: 'Abastecimentos', frota: 'Utilização da frota', usuarios: 'Por usuário' };
  let body = '';
  if (S.relTab === 'viagens') body = table([{ h: 'Data', f: r => fd(r.data) }, { h: 'Veículo', f: r => vehLabel(DB.veh(r.vehicle_id)) }, { h: 'Saída', f: r => esc(r.hora_saida) }, { h: 'KM saída', n: 1, f: r => nf(r.km_saida) }, { h: 'KM chegada', n: 1, f: r => nf(r.km_chegada) }, { h: 'Rodado', n: 1, f: r => nf(r.km_chegada - r.km_saida) }, { h: 'Origem / Destino', f: r => esc(r.origem_destino) }, { h: 'Motorista', f: r => esc(r.motorista) }, { h: 'Finalidade', f: r => esc(r.finalidade) }], T);
  if (S.relTab === 'abastecimentos') body = table([{ h: 'Data', f: a => fd(a.data) }, { h: 'Veículo', f: a => vehLabel(DB.veh(a.vehicle_id)) }, { h: 'KM', n: 1, f: a => a.km != null ? nf(a.km) : '—' }, { h: 'Posto', f: a => esc(a.posto) }, { h: 'Modalidade', f: a => esc(MOD[a.modalidade]) }, { h: 'Litros', n: 1, f: a => nf(a.litros, 2) }, { h: 'Total', n: 1, f: a => brl(a.total) }], A);
  if (S.relTab === 'frota') body = table([{ h: 'Veículo', f: r => vehLabel(r.v) }, { h: 'Viagens', n: 1, f: r => r.n }, { h: 'Dias em uso', n: 1, f: r => r.dias }, { h: 'Km rodados', n: 1, f: r => nf(r.km) }, { h: 'Litros', n: 1, f: r => nf(r.l, 1) }, { h: 'Gasto', n: 1, f: r => brl(r.tot) }, { h: 'Km/L (estim.)', n: 1, f: r => r.kml ? nf(r.kml, 1) : '—' }, { h: 'Última km', n: 1, f: r => nf(DB.lastKm(r.v.id).km) }], frota);
  if (S.relTab === 'usuarios') body = table([{ h: 'Funcionário', f: r => esc(r.u.nome) }, { h: 'Viagens', n: 1, f: r => r.n }, { h: 'Km rodados', n: 1, f: r => nf(r.km) }, { h: 'Abastecimentos', n: 1, f: r => r.na }, { h: 'Gasto', n: 1, f: r => brl(r.tot) }], porU);
  afterRender.relatorios = () => {
    ['ini', 'fim', 'vid', 'uid'].forEach(k => { const el = $('#r-' + k); if (el) el.onchange = async () => { S.rel[k] = el.value; if (k === 'ini' && window.CLOUD) await CLOUD.ensureSince(el.value).catch(x => toast(x.message)); route(); }; });
    $$('[data-rt]').forEach(b => b.onclick = () => { S.relTab = b.dataset.rt; route(); });
    $$('[data-at]').forEach(b => b.onclick = () => { const n = new Date(); let i, f = today(); if (b.dataset.at === '7') i = isoDay(addDays(n, -6)); if (b.dataset.at === '30') i = isoDay(addDays(n, -29)); if (b.dataset.at === 'mes') i = isoDay(new Date(n.getFullYear(), n.getMonth(), 1)); if (b.dataset.at === 'ant') { i = isoDay(new Date(n.getFullYear(), n.getMonth() - 1, 1)); f = isoDay(new Date(n.getFullYear(), n.getMonth(), 0)); } Object.assign(S.rel, { ini: i, fim: f }); route(); });
    $('#x-xlsx')?.addEventListener('click', exportXlsx); $('#x-csv')?.addEventListener('click', exportCsv); $('#x-pdf')?.addEventListener('click', () => window.print());
  };
  const km = T.reduce((s, t) => s + t.km_chegada - t.km_saida, 0), tot = A.reduce((s, a) => s + a.total, 0);
  return `<section class="card"><form class="f" onsubmit="return false">
      <label class="fld">Data inicial<input id="r-ini" type="date" value="${S.rel.ini}"></label><label class="fld">Data final<input id="r-fim" type="date" value="${S.rel.fim}"></label>
      <label class="fld">Veículo<select id="r-vid"><option value="">Todos</option>${V.map(v => `<option value="${v.id}" ${S.rel.vid === v.id ? 'selected' : ''}>${esc(v.nome)} – ${esc(v.placa)}</option>`).join('')}</select></label>
      ${isAdmin() ? `<label class="fld">Usuário<select id="r-uid"><option value="">Todos</option>${U.map(u => `<option value="${u.id}" ${S.rel.uid === u.id ? 'selected' : ''}>${esc(u.nome)}</option>`).join('')}</select></label>` : ''}
      <div class="w bar">${[['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['mes', 'Este mês'], ['ant', 'Mês anterior']].map(([k, l]) => `<button type="button" class="btn sm sec" data-at="${k}">${l}</button>`).join('')}</div></form></section>
  <section class="kpis"><div class="kpi" style="--tone:var(--cyan)"><span class="k">Viagens</span><span class="v">${T.length}</span></div><div class="kpi" style="--tone:var(--cyan)"><span class="k">Km rodados</span><span class="v">${nf(km)}</span></div><div class="kpi" style="--tone:var(--warn)"><span class="k">Abastecimentos</span><span class="v">${A.length}</span></div><div class="kpi" style="--tone:var(--warn)"><span class="k">Gasto</span><span class="v">${brl0(tot)}</span></div></section>
  <section class="card"><div class="tabs" role="tablist">${Object.entries(tabs).map(([k, l]) => `<button role="tab" data-rt="${k}" class="${S.relTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}
  <header style="margin:16px 0 0;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
  ${inFrame ? `<div class="msg info" style="flex:1">${ico('file')}<span>Exportação para Excel (no layout "Controle de Utilização Veículo"), CSV no formato do sistema anterior e PDF ficam disponíveis na versão publicada do sistema. Este visualizador de demonstração bloqueia downloads.</span></div>` : `<div class="bar"><button class="btn" id="x-xlsx">${ico('file')}Exportar Excel</button><button class="btn sec" id="x-csv">Exportar CSV</button><button class="btn sec" id="x-pdf">Exportar PDF</button></div>`}
  </header></section>`;
}
function dl(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
// Exportação no modelo original "Controle de Utilização Veículo" (assets/modelo-diario-de-bordo.xlsx):
// a planilha-modelo é preenchida célula a célula, preservando formatação; 19 linhas (4 a 22) por arquivo, como no sistema anterior.
const xmlEsc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function putCell(x, ref, v, num) {
  const re = new RegExp(`<c r="${ref}"( s="\\d+")?(?: t="\\w+")?\\s*(?:/>|>[\\s\\S]*?</c>)`);
  return x.replace(re, (_, st) => num ? `<c r="${ref}"${st || ''}><v>${v}</v></c>` : `<c r="${ref}"${st || ''} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`);
}
const serial = d => { const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? Math.round((Date.UTC(+m[1], m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 864e5) : null; };
const linhaAb = a => `${fd(a.data)} — ${a.hora} — ${nf(a.litros, 2)} litros — R$ ${nf(a.total, 2)}.`;
function itensExport(t, a) { // viagens com seus abastecimentos na coluna J; abastecimentos avulsos em linha própria, em ordem cronológica
  const porT = new Map(); a.filter(x => x.trip_id && t.some(r => r.id === x.trip_id)).forEach(x => porT.set(x.trip_id, [...(porT.get(x.trip_id) || []), x]));
  const it = [...t.map(r => ({ k: r.data + (r.hora_saida || ''), t: r, f: porT.get(r.id) || [] })), ...a.filter(x => !(x.trip_id && porT.has(x.trip_id))).map(x => ({ k: x.data + x.hora, t: null, f: [x] }))];
  return it.sort((p, q) => p.k.localeCompare(q.k));
}
async function exportXlsx() {
  if (!window.JSZip) return toast('Biblioteca de Excel indisponível sem conexão.');
  try {
    const tpl = await (await fetch('assets/modelo-diario-de-bordo.xlsx')).arrayBuffer(), { T, A } = relData(), out = [];
    for (const v of DB.vehicles().filter(v => !S.rel.vid || v.id === S.rel.vid)) {
      const I = itensExport(T.filter(x => x.vehicle_id === v.id), A.filter(x => x.vehicle_id === v.id)); if (!I.length) continue;
      const partes = Math.ceil(I.length / 19), lk = DB.lastKm(v.id).km;
      for (let p = 0; p < partes; p++) {
        const z = await JSZip.loadAsync(tpl); let x = await z.file('xl/worksheets/sheet1.xml').async('string'), soma = 0;
        x = putCell(x, 'A2', 'Veículo: ' + v.nome.toUpperCase()); x = putCell(x, 'C2', 'Placa: ' + v.placa); x = putCell(x, 'F2', 'Km Final: ' + (lk ?? ''));
        x = putCell(x, 'G2', 'Data Início:  ' + fd(S.rel.ini)); x = putCell(x, 'I2', 'Data Final: ' + fd(S.rel.fim));
        x = putCell(x, 'J1', 'KM Troca Óleo:' + (v.km_troca_oleo ? ' ' + v.km_troca_oleo : '')); x = putCell(x, 'J2', 'Data Troca Óleo:' + (v.data_troca_oleo ? ' ' + fd(v.data_troca_oleo) : ''));
        I.slice(p * 19, p * 19 + 19).forEach((o, i) => {
          const n = 4 + i, r = o.t;
          if (r) { const sd = serial(r.data); if (sd) x = putCell(x, 'A' + n, sd, 1); x = putCell(x, 'B' + n, r.km_saida, 1); x = putCell(x, 'C' + n, r.km_chegada, 1); soma += r.km_chegada;
            [['D', r.hora_saida], ['E', r.hora_chegada], ['F', r.origem_destino], ['G', r.motorista], ['H', r.visto ? 'OK' : ''], ['I', r.finalidade]].forEach(([c, val]) => { if (val) x = putCell(x, c + n, val); }); }
          if (o.f.length) x = putCell(x, 'J' + n, o.f.map(linhaAb).join('\n'));
        });
        x = x.replace('<f>SUM(C4:C22)</f><v>0</v>', `<f>SUM(C4:C22)</f><v>${soma}</v>`);
        z.file('xl/worksheets/sheet1.xml', x);
        out.push([`diario-bordo-${S.rel.ini}_${S.rel.fim}-${v.placa.replace(/\W/g, '')}${partes > 1 ? '-parte' + (p + 1) : ''}.xlsx`, await z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })]);
      }
    }
    if (!out.length) return toast('Nenhum registro no período para exportar.');
    if (out.length === 1) return dl(out[0][1], out[0][0]);
    const zz = new JSZip(); out.forEach(([n, b]) => zz.file(n, b)); dl(await zz.generateAsync({ type: 'blob' }), `diario-bordo-${S.rel.ini}_${S.rel.fim}.zip`);
    toast(`${out.length} planilhas geradas no .zip (uma por veículo e por bloco de 19 linhas).`);
  } catch (e) { toast('Falha ao exportar o Excel: ' + e.message); }
}
function exportCsv() { // mesmo layout do "Exportar CSV" do sistema anterior (reimportável)
  const { T, A } = relData(), q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const R = [['Veículo', 'Placa', 'DATA', 'KM SAÍDA', 'KM CHEGADA', 'HORA SAÍDA', 'HORA CHEGADA', 'ORIGEM / DESTINO', 'NOME MOTORISTA (legível)', 'VISTO MOTORISTA', 'FINALIDADE', 'USUÁRIO', 'KM RODADO']];
  T.forEach(r => { const v = DB.veh(r.vehicle_id); R.push([v.nome, v.placa, fd(r.data), r.km_saida, r.km_chegada, r.hora_saida, r.hora_chegada, r.origem_destino, r.motorista, r.visto ? 'OK' : '', r.finalidade, r.usuario_texto, r.km_chegada - r.km_saida]); });
  R.push([], ['Abastecimentos'], ['Veículo', 'Placa', 'Data', 'Hora', 'KM', 'Posto', 'Combustível', 'Litros', 'R$/litro', 'Total', 'Obs.', 'Modalidade']);
  A.forEach(a => { const v = DB.veh(a.vehicle_id); R.push([v.nome, v.placa, fd(a.data), a.hora, a.km ?? '', a.posto, a.combustivel, a.litros, a.preco_litro, a.total, a.obs, a.modalidade === 'req' ? 'Requisição de combustível Masters' : a.modalidade === 'func' ? 'Abastecimento pago pelo Funcionário' : 'Avulso']); });
  dl(new Blob(['﻿' + R.map(l => l.map(q).join(';')).join('\r\n')], { type: 'text/csv' }), `diario-bordo-${S.rel.ini}-a-${S.rel.fim}.csv`);
}

/* ───────────── 6. Usuários ───────────── */
function rUsuarios() {
  afterRender.usuarios = () => {
    $('#nu').onclick = () => userDialog();
    $$('[data-edu]').forEach(b => b.onclick = () => userDialog(DB.user(b.dataset.edu)));
  };
  return `<section class="card"><header><h2>Usuários</h2><span class="grow"></span><button class="btn" id="nu">${ico('plus')}Novo usuário</button></header>
  ${table([
    { h: 'Nome', f: u => `<b>${esc(u.nome)}</b>` }, { h: 'Usuário', f: u => `<span class="mono">${esc(u.usuario)}</span>` },
    { h: 'Perfil', f: u => u.papel === 'admin' ? '<span class="pill p-info">Administrador</span>' : '<span class="pill p-mute">Funcionário</span>' },
    { h: 'Veículos autorizados', f: u => u.papel === 'admin' ? '<span class="muted">Não opera veículos</span>' : DB.d.vehicles.filter(v => v.responsavel === u.id || (v.autorizados || []).includes(u.id)).map(v => `<span class="plate">${esc(v.placa)}</span>`).join(' ') || '—' },
    { h: 'Com veículo', f: u => { const x = DB.d.usage.find(z => z.user_id === u.id && z.status === 'ativa'); return x ? esc(DB.veh(x.vehicle_id).nome) : '—'; } },
    { h: 'Situação', f: u => u.ativo ? '<span class="pill p-ok">Ativo</span>' : '<span class="pill p-mute">Inativo</span>' },
    { h: '', f: u => u.papel === 'admin' ? '' : `<button class="btn sm sec" data-edu="${u.id}">Editar</button>` },
  ], DB.d.users)}
  <p class="muted" style="font-size:12px;margin:10px 0 0">MASTERS é o único administrador e não pode ser responsável por veículo. Na versão oficial, o novo usuário recebe um convite por e-mail do Supabase Auth para definir a própria senha (etapa de consolidação).</p></section>`;
}
function userDialog(u) {
  dialog(`<form id="uf"><div class="dh"><h2>${u ? 'Editar usuário' : 'Novo usuário'}</h2></div><div class="dialog-body">
    <label class="fld">Usuário (login)<input id="u-us" value="${esc(u?.usuario)}" ${u ? 'readonly' : ''} placeholder="Ex.: JOAO"></label>
    <label class="fld">Nome completo<input id="u-nm" value="${esc(u?.nome)}"></label>
    ${u ? `<label class="check"><input type="checkbox" id="u-at" ${u.ativo ? 'checked' : ''}> Usuário ativo</label>` : '<p class="muted" style="margin:0;font-size:12px">Perfil: Funcionário. Autorize veículos em Alocação de veículos.</p>'}
    <div id="u-err"></div></div><div class="dialog-foot"><button type="button" class="btn sec" id="c">Cancelar</button><button class="btn">Salvar</button></div></form>`, d => {
    $('#c', d).onclick = closeDlg;
    $('#uf', d).onsubmit = async e => { e.preventDefault(); try { await DB.saveUser({ id: u?.id, usuario: $('#u-us').value, nome: $('#u-nm').value, ativo: u ? $('#u-at').checked : true }); closeDlg(); toast('Usuário salvo.'); route(); } catch (x) { $('#u-err').innerHTML = `<div class="msg err">${esc(x.message)}</div>`; } };
  });
}

/* ───────────── 7. Liberações ───────────── */
function rLiberacoes() {
  const V = DB.d.vehicles, H = DB.d.usage.slice().sort((a, b) => b.inicio.localeCompare(a.inicio));
  afterRender.liberacoes = () => $$('[data-adm]').forEach(b => b.onclick = () => {
    const v = DB.veh(b.dataset.adm), u = DB.activeUse(v.id);
    dialog(`<form id="lf2"><div class="dh"><h2>Liberação administrativa</h2></div><div class="dialog-body">
      <p style="margin:0">${vehLabel(v)} está com <b>${esc(DB.user(u.user_id).nome)}</b> desde ${fdt(u.inicio)}.</p>
      <label class="fld">Justificativa (obrigatória)<textarea id="lj" rows="3" placeholder="Ex.: funcionário encerrou o expediente sem liberar o veículo."></textarea></label>
      <label class="check"><input type="checkbox" id="lc"> Confirmo a liberação. A operação ficará registrada na auditoria.</label><div id="l-err"></div></div>
      <div class="dialog-foot"><button type="button" class="btn sec" id="c">Cancelar</button><button class="btn danger">Liberar veículo</button></div></form>`, d => {
      $('#c', d).onclick = closeDlg;
      $('#lf2', d).onsubmit = async e => { e.preventDefault(); if (!$('#lc').checked) { $('#l-err').innerHTML = '<div class="msg err">Marque a confirmação.</div>'; return; } try { await DB.liberar(v.id, $('#lj').value.trim()); closeDlg(); toast('Veículo liberado e registrado na auditoria.'); route(); } catch (x) { $('#l-err').innerHTML = `<div class="msg err">${esc(x.message)}</div>`; } };
    });
  });
  return `<section class="card"><header><h2>Situação dos veículos</h2></header>
  ${table([{ h: 'Veículo', f: v => `<b>${esc(v.nome)}</b>` }, { h: 'Modelo', f: v => esc(v.modelo) }, { h: 'Placa', f: v => `<span class="plate">${esc(v.placa)}</span>` },
    { h: 'Responsável no momento', f: v => esc(DB.user(DB.activeUse(v.id)?.user_id)?.nome || '—') }, { h: 'Situação', f: v => { const s = statusOf(v); return `<span class="pill ${s.cls}">${s.txt}</span>`; } },
    { h: 'Desde', f: v => fdt(DB.activeUse(v.id)?.inicio) || '—' }, { h: '', f: v => DB.activeUse(v.id) ? `<button class="btn sm danger" data-adm="${v.id}">${ico('key')}Liberar</button>` : '' }], V)}</section>
  <section class="card"><header><h2>Histórico de uso</h2></header>
  ${table([{ h: 'Veículo', f: u => vehLabel(DB.veh(u.vehicle_id)) }, { h: 'Funcionário', f: u => esc(DB.user(u.user_id)?.nome) }, { h: 'Início', f: u => fdt(u.inicio) }, { h: 'Fim', f: u => fdt(u.fim) || '—' },
    { h: 'Liberado por', f: u => u.status === 'ativa' ? '<span class="pill p-info">Em uso</span>' : esc(DB.user(u.liberado_por)?.nome || '') + (u.liberado_por && u.liberado_por !== u.user_id ? ' <span class="pill p-warn">Admin</span>' : '') }, { h: 'Justificativa', f: u => esc(u.justificativa) }], H)}</section>`;
}

/* ───────────── 8. Alocação ───────────── */
function rAlocacao() {
  const U = DB.d.users.filter(u => u.papel !== 'admin' && u.ativo), H = DB.d.audit.filter(a => a.acao === 'ALOCACAO');
  afterRender.alocacao = () => $$('[data-save]').forEach(b => b.onclick = async () => {
    const vid = b.dataset.save, box = b.closest('.veh');
    try { await DB.alocar(vid, $('select', box).value, $$('input[type=checkbox]:checked', box).map(c => c.value)); toast('Alocação salva.'); route(); } catch (x) { toast(x.message); }
  });
  return `<div class="msg info">${ico('shield')}<span>O responsável padrão e os autorizados podem assumir o veículo. Uso simultâneo é bloqueado: um veículo só pode estar com uma pessoa por vez. MASTERS não aparece nas opções.</span></div>
  <div class="fleet" style="grid-template-columns:repeat(auto-fill,minmax(290px,1fr))">${DB.d.vehicles.map(v => { const s = statusOf(v); return `<article class="veh">
    <div class="row"><b>${esc(v.nome)}</b><span class="plate">${esc(v.placa)}</span></div><div><span class="pill ${s.cls}">${s.txt}${s.u ? ' · ' + esc(DB.user(s.u.user_id)?.nome) : ''}</span></div>
    <label class="fld">Responsável padrão<select>${['<option value="">Sem responsável (remover atribuição)</option>', ...U.map(u => `<option value="${u.id}" ${v.responsavel === u.id ? 'selected' : ''}>${esc(u.nome)}</option>`)].join('')}</select></label>
    <div style="display:grid;gap:4px"><span class="muted" style="font-size:12px;font-weight:600">Também autorizados</span>${U.map(u => `<label class="check"><input type="checkbox" value="${u.id}" ${(v.autorizados || []).includes(u.id) ? 'checked' : ''}> ${esc(u.nome)}</label>`).join('')}</div>
    <div class="bar"><button class="btn sm" data-save="${v.id}">Salvar alocação</button></div></article>`; }).join('')}</div>
  <section class="card"><header><h2>Histórico de alocações</h2></header>${table([{ h: 'Quando', f: a => fdt(a.em) }, { h: 'Por', f: a => esc(DB.user(a.user_id)?.nome || a.user_id) }, { h: 'Alteração', f: a => esc(a.detalhes) }], H, 'Nenhuma alteração de alocação registrada ainda.')}</section>`;
}

/* ───────────── Importação (layout do sistema anterior) ───────────── */
function csvLer(txt) { // mesmo parser do sistema anterior: separador ";", aspas duplas
  const L = []; let l = [], c = '', q = false;
  for (let i = 0; i < txt.length; i++) { const ch = txt[i]; if (ch === '"') { if (q && txt[i + 1] === '"') { c += '"'; i++; } else q = !q; } else if (ch === ';' && !q) { l.push(c); c = ''; } else if ((ch === '\n' || ch === '\r') && !q) { if (ch === '\r' && txt[i + 1] === '\n') i++; l.push(c); L.push(l); l = []; c = ''; } else c += ch; }
  l.push(c); L.push(l); return L;
}
const impData = v => { if (typeof v === 'number') { const d = new Date(Math.round((v - 25569) * 864e5)); return d.toISOString().slice(0, 10); } v = String(v || '').trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); return m ? `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
const impNum = v => { if (typeof v === 'number') return v; v = String(v ?? '').trim(); if (!v) return null; if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.'); const n = Number(v); return Number.isFinite(n) ? n : null; };
const impHora = v => { if (typeof v === 'number') { const m = Math.round(v * 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; } return String(v ?? '').trim(); };
const chaveViagem = (r, placa) => [npl(placa), r.data, r.km_saida, r.km_chegada, r.hora_saida, r.hora_chegada, r.origem_destino, r.motorista].join('|').toLowerCase();
const chaveAb = (a, placa) => [npl(placa), a.data, a.hora, a.km ?? '', a.posto, a.total].join('|').toLowerCase();

function parseCsvAntigo(text) {
  const rows = csvLer(text.replace(/^﻿/, '')); let sec = 'v'; const V = [], A = [], rej = [];
  rows.forEach((row, i) => {
    const c = row.map(x => String(x ?? '').trim()), ln = i + 1; if (!c.some(Boolean)) return;
    if (c[0] === 'Abastecimentos') { sec = 'a'; return; }
    if (c[0] === 'Veículo' || c[0] === 'DATA' || c[0] === 'Data') return;
    if (sec === 'v') {
      if (c.length < 12) return rej.push({ ln, tipo: 'Viagem', motivo: 'Linha com menos de 12 colunas', raw: c.join(' | ') });
      V.push({ ln, veiculo: c[0], placa: c[1], data: impData(c[2]), km_saida: impNum(c[3]), km_chegada: impNum(c[4]), hora_saida: c[5], hora_chegada: c[6], origem_destino: c[7], motorista: c[8], visto: /^(OK|SIM|TRUE|1)$/i.test(c[9]), finalidade: c[10], usuario_texto: c[11] });
    } else {
      if (c.length < 10) return rej.push({ ln, tipo: 'Abastecimento', motivo: 'Linha com menos de 10 colunas', raw: c.join(' | ') });
      const m = (c[11] || '').toLowerCase();
      A.push({ ln, veiculo: c[0], placa: c[1], data: impData(c[2]), hora: c[3], km: impNum(c[4]), posto: c[5], combustivel: c[6] || 'Outro', litros: impNum(c[7]), preco_litro: impNum(c[8]), total: impNum(c[9]), obs: c[10] || '', modalidade: m.includes('requisição') ? 'req' : m.includes('funcionário') ? 'func' : 'avulso' });
    }
  });
  return { V, A, rej };
}
const RX_AB = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[—–-]\s*(\d{1,2}:\d{2})\s*[—–-]\s*([\d.,]+)\s*litros?\s*[—–-]\s*R\$\s*([\d.,]+)/gi;
function parseXlsxModelo(wb) { // planilha "Controle de Utilização Veículo": A2 veículo, C2 placa, cabeçalho na linha 3, abastecimentos na coluna J
  const V = [], A = [], rej = [];
  for (const nm of wb.SheetNames) {
    const g = XLSX.utils.sheet_to_json(wb.Sheets[nm], { header: 1, raw: true, defval: '' });
    const veiculo = String(g[1]?.[0] || '').replace(/^Ve[ií]culo:\s*/i, '').trim(), placa = String(g[1]?.[2] || '').replace(/^Placa:\s*/i, '').trim();
    const hi = g.findIndex(r => String(r[0]).trim().toUpperCase() === 'DATA'); if (hi < 0) { rej.push({ ln: '-', tipo: 'Planilha', motivo: `Aba "${nm}" sem cabeçalho DATA / KM SAÍDA`, raw: '' }); continue; }
    for (let i = hi + 1; i < g.length; i++) {
      const r = g[i], ln = `${nm}!${i + 1}`, jt = String(r[9] ?? '').trim();
      if (jt) { let m, ok = 0; RX_AB.lastIndex = 0;
        while ((m = RX_AB.exec(jt))) { ok++; const litros = impNum(m[3]), total = impNum(m[4]); A.push({ ln: ln + ' (J)', veiculo, placa, data: impData(m[1]), hora: m[2].padStart(5, '0'), km: null, posto: '', combustivel: 'Outro', litros, preco_litro: litros > 0 ? Math.round(total / litros * 1000) / 1000 : null, total, obs: 'Importado da coluna ABASTECIMENTO', modalidade: 'avulso' }); }
        if (!ok) rej.push({ ln: ln + ' (J)', tipo: 'Abastecimento', motivo: 'Texto fora do padrão "dd/mm/aaaa — hh:mm — N litros — R$ V."', raw: jt });
      }
      if (!r.slice(0, 9).some(x => String(x).trim())) continue;
      const data = impData(r[0]); if (!data && (String(r[1]).trim() === '' || impNum(r[1]) == null)) continue; // linhas de total/observação
      V.push({ ln, veiculo, placa, data, km_saida: impNum(r[1]), km_chegada: impNum(r[2]), hora_saida: impHora(r[3]), hora_chegada: impHora(r[4]), origem_destino: String(r[5]).trim(), motorista: String(r[6]).trim(), visto: /^(OK|SIM|X|TRUE|1)$/i.test(String(r[7]).trim()), finalidade: String(r[8]).trim(), usuario_texto: '' });
    }
  }
  return { V, A, rej };
}
function classify({ V, A, rej }) {
  const byPl = p => DB.d.vehicles.find(v => npl(v.placa) === npl(p)), out = [];
  const exT = new Set(DB.d.trips.map(t => chaveViagem(t, DB.veh(t.vehicle_id).placa))), exA = new Set(DB.d.fuelings.map(a => chaveAb(a, DB.veh(a.vehicle_id).placa))), seen = new Set();
  rej.forEach(r => out.push({ ...r, st: 'rejeitado' }));
  for (const r of V) {
    const v = byPl(r.placa) || DB.d.vehicles.find(x => !npl(r.placa) && npl(x.nome) === npl(r.veiculo)); const base = { ln: r.ln, tipo: 'Viagem', raw: `${r.placa || r.veiculo} · ${fd(r.data)} · ${r.km_saida ?? '?'} → ${r.km_chegada ?? '?'} · ${r.origem_destino}`, rec: r, v };
    if (!r.data) { out.push({ ...base, st: 'rejeitado', motivo: 'Data inválida' }); continue; }
    if (r.km_saida == null || r.km_chegada == null) { out.push({ ...base, st: 'rejeitado', motivo: 'KM de saída ou chegada ausente' }); continue; }
    if (r.km_chegada < r.km_saida) { out.push({ ...base, st: 'rejeitado', motivo: 'KM de chegada menor que a de saída' }); continue; }
    if (!v) { out.push({ ...base, st: 'conflitante', motivo: `Placa "${r.placa}" sem veículo cadastrado. Cadastre o veículo antes de importar.` }); continue; }
    const k = chaveViagem(r, v.placa);
    if (exT.has(k)) { out.push({ ...base, st: 'existente', motivo: 'Já está no sistema' }); continue; }
    if (seen.has(k)) { out.push({ ...base, st: 'duplicado', motivo: 'Repetida dentro do arquivo' }); continue; }
    seen.add(k);
    const sem = DB.d.trips.find(t => t.vehicle_id === v.id && t.data === r.data && t.km_saida === r.km_saida);
    if (sem) { out.push({ ...base, st: 'conflitante', motivo: `Já existe viagem deste veículo em ${fd(r.data)} saindo com ${nf(r.km_saida)} km, com dados diferentes.` }); continue; }
    out.push({ ...base, st: 'novo', motivo: 'Será importada' });
  }
  for (const a of A) {
    const v = byPl(a.placa), base = { ln: a.ln, tipo: 'Abastecimento', raw: `${a.placa} · ${fd(a.data)} ${a.hora} · ${a.posto} · ${a.total != null ? brl(a.total) : '?'}`, rec: a, v };
    if (!a.data) { out.push({ ...base, st: 'rejeitado', motivo: 'Data inválida' }); continue; }
    if (!(a.total > 0) || !(a.preco_litro > 0) || !(a.litros > 0)) { out.push({ ...base, st: 'rejeitado', motivo: 'Valor, preço ou litros inválidos' }); continue; }
    if (!v) { out.push({ ...base, st: 'conflitante', motivo: `Placa "${a.placa}" sem veículo cadastrado.` }); continue; }
    const k = chaveAb(a, v.placa);
    if (exA.has(k)) { out.push({ ...base, st: 'existente', motivo: 'Já está no sistema' }); continue; }
    if (seen.has(k)) { out.push({ ...base, st: 'duplicado', motivo: 'Repetido dentro do arquivo' }); continue; }
    seen.add(k); out.push({ ...base, st: 'novo', motivo: 'Será importado' });
  }
  return out;
}
const ST = { novo: ['p-ok', 'Novo'], existente: ['p-mute', 'Existente'], duplicado: ['p-cyan', 'Duplicado'], conflitante: ['p-warn', 'Conflitante'], rejeitado: ['p-crit', 'Rejeitado'] };
function rImportacao() {
  const P = S.importPreview, cnt = k => P ? P.rows.filter(r => r.st === k).length : 0;
  afterRender.importacao = () => {
    $('#imp-file').onchange = async e => {
      const fs = [...(e.target.files || [])]; e.target.value = ''; if (!fs.length) return;
      try {
        const parsed = { V: [], A: [], rej: [] };
        for (const f of fs) {
          const p = /\.xlsx?$/i.test(f.name) ? (window.XLSX ? parseXlsxModelo(XLSX.read(await f.arrayBuffer(), { type: 'array' })) : (() => { throw Error('Leitor de Excel indisponível sem conexão.'); })()) : parseCsvAntigo(await f.text());
          const tag = fs.length > 1 ? f.name.replace(/\.\w+$/, '') + ' · ' : '';
          ['V', 'A', 'rej'].forEach(k => p[k].forEach(r => parsed[k].push({ ...r, ln: tag + r.ln })));
        }
        if (!parsed.V.length && !parsed.A.length && !parsed.rej.length) throw Error('Não encontrei viagens ou abastecimentos no layout do Diário de Bordo.');
        S.importPreview = { nome: fs.length > 1 ? `${fs.length} arquivos` : fs[0].name, rows: classify(parsed) }; route();
      } catch (x) { toast(x.message); }
    };
    $('#imp-ok')?.addEventListener('click', () => dialog(`<div class="dh"><h2>Confirmar importação?</h2></div><div class="dialog-body"><p>Serão gravados <b>${cnt('novo')}</b> registros novos na <b>base de demonstração</b>. Existentes, duplicados, conflitantes e rejeitados não serão gravados.</p></div><div class="dialog-foot"><button class="btn sec" id="c">Cancelar</button><button class="btn" id="o">Importar</button></div>`, d => { $('#c', d).onclick = closeDlg; $('#o', d).onclick = async () => { closeDlg(); try { await doImport(); } catch (x) { toast(x.message); } }; }));
    $('#imp-cancel')?.addEventListener('click', () => { S.importPreview = null; route(); });
  };
  return `<section class="card"><header><h2>Importar arquivo do Diário de Bordo</h2></header>
    <div class="grid g2">
      <div style="display:grid;gap:10px;align-content:start">
        <p style="margin:0">Aceita os mesmos arquivos do sistema anterior, sem mudar o formato:</p>
        <ul style="margin:0;padding-left:18px;display:grid;gap:4px"><li><b>CSV</b> gerado em "Exportar CSV" (separador ponto e vírgula, seções de viagens e de abastecimentos).</li><li><b>Planilha Excel</b> "Controle de Utilização Veículo" (veículo em A2, placa em C2, cabeçalho DATA / KM SAÍDA na linha 3, viagens nas linhas seguintes e abastecimentos na coluna ABASTECIMENTO no formato "dd/mm/aaaa — hh:mm — N litros — R$ V."). Pode enviar vários arquivos de uma vez (partes 1, 2, 3…).</li></ul>
        <p class="muted" style="margin:0;font-size:12px">Nada é gravado antes da sua confirmação. Duplicidade é verificada pela mesma chave do sistema anterior: placa, data, km de saída e chegada, horários, origem/destino e motorista.</p>
        <label class="btn" style="justify-self:start">${ico('upload')}Selecionar arquivo<input id="imp-file" type="file" multiple accept=".csv,.xlsx,.xls,text/csv" hidden></label>
      </div>
      <div class="tw"><table><thead><tr><th>Seção</th><th>Colunas preservadas</th></tr></thead><tbody>
        <tr><td>Viagens</td><td style="font-size:12px">Veículo; Placa; DATA; KM SAÍDA; KM CHEGADA; HORA SAÍDA; HORA CHEGADA; ORIGEM / DESTINO; NOME MOTORISTA (legível); VISTO MOTORISTA; FINALIDADE; USUÁRIO; KM RODADO</td></tr>
        <tr><td>Abastecimentos</td><td style="font-size:12px">Veículo; Placa; Data; Hora; KM; Posto; Combustível; Litros; R$/litro; Total; Obs.; Modalidade</td></tr>
        <tr><td>Planilha</td><td style="font-size:12px">DATA, KM SAÍDA, KM CHEGADA, HORA SAÍDA, HORA CHEGADA, ORIGEM / DESTINO, NOME MOTORISTA, VISTO MOTORISTA, FINALIDADE, ABASTECIMENTO</td></tr></tbody></table></div>
    </div></section>
  ${P ? `<section class="card"><header><h2>Prévia · ${esc(P.nome)}</h2><span class="grow"></span><button class="btn sec" id="imp-cancel">Descartar</button><button class="btn" id="imp-ok" ${cnt('novo') ? '' : 'disabled'}>${ico('check')}Importar ${cnt('novo')} novos</button></header>
    <div class="kpis" style="margin-bottom:14px">${Object.entries(ST).map(([k, [c, l]]) => `<div class="kpi"><span class="k"><span class="pill ${c}">${l}</span></span><span class="v">${cnt(k)}</span></div>`).join('')}</div>
    ${table([{ h: 'Linha', f: r => `<span class="mono">${esc(r.ln)}</span>` }, { h: 'Tipo', f: r => esc(r.tipo) }, { h: 'Situação', f: r => `<span class="pill ${ST[r.st][0]}">${ST[r.st][1]}</span>` }, { h: 'Registro', f: r => esc(r.raw) }, { h: 'Motivo', f: r => esc(r.motivo) }], P.rows)}</section>` : ''}`;
}
function doImport() {
  const P = S.importPreview; let nv = 0, na = 0;
  for (const r of P.rows.filter(x => x.st === 'novo')) {
    const u = DB.d.users.find(x => x.usuario === npl(r.rec.usuario_texto) || npl(x.nome) === npl(r.rec.motorista));
    if (r.tipo === 'Viagem') { DB.d.trips.push({ id: uid(), vehicle_id: r.v.id, user_id: u?.id || null, data: r.rec.data, hora_saida: r.rec.hora_saida, hora_chegada: r.rec.hora_chegada, km_saida: r.rec.km_saida, km_chegada: r.rec.km_chegada, origem_destino: r.rec.origem_destino, motorista: r.rec.motorista, finalidade: r.rec.finalidade, visto: r.rec.visto, usuario_texto: r.rec.usuario_texto, origem: 'importacao', criado_em: new Date().toISOString() }); nv++; }
    else { DB.d.fuelings.push({ id: uid(), vehicle_id: r.v.id, user_id: u?.id || null, trip_id: null, data: r.rec.data, hora: r.rec.hora, km: r.rec.km, posto: r.rec.posto, combustivel: r.rec.combustivel, litros: r.rec.litros, preco_litro: r.rec.preco_litro, total: r.rec.total, modalidade: r.rec.modalidade, obs: r.rec.obs, origem: 'importacao', criado_em: new Date().toISOString() }); na++; }
  }
  DB.audit('IMPORTACAO', 'importacao', '', `${P.nome}: ${nv} viagens e ${na} abastecimentos importados; ${P.rows.length - nv - na} não gravados.`); DB.save();
  S.importPreview = null; toast(`Importação concluída: ${nv} viagens e ${na} abastecimentos.`); route();
}

/* ───────────── Auditoria ───────────── */
function rAuditoria() {
  return `<section class="card"><header><h2>Registro de operações</h2><span class="grow"></span><span class="muted" style="font-size:12px">${DB.d.audit.length} eventos</span></header>
  ${table([{ h: 'Quando', f: a => `<span class="mono">${fdt(a.em)}</span>` }, { h: 'Usuário', f: a => esc(DB.user(a.user_id)?.nome || a.user_id) }, { h: 'Ação', f: a => `<span class="pill ${/ADMIN|IMPORT/.test(a.acao) ? 'p-warn' : 'p-info'}">${esc(a.acao.replace(/_/g, ' ').toLowerCase())}</span>` }, { h: 'Detalhes', f: a => esc(a.detalhes) }], DB.d.audit.slice(0, 200))}
  <p class="muted" style="font-size:12px;margin:10px 0 0">Na versão oficial, a auditoria é gravada pelo próprio banco (gatilhos no Supabase), inclusive o estado antes e depois de cada alteração, e só o administrador pode consultá-la.</p></section>`;
}

/* ───────────── Início ───────────── */
(async function boot() {
  if (window.CLOUD) { // modo oficial: aguarda a verificação da sessão antes de decidir entre login e aplicativo
    $('#demoBand').hidden = true;
    $('#root').innerHTML = `<div style="min-height:80vh;display:grid;place-items:center;color:var(--muted)">Verificando acesso…</div>`;
    CLOUD.install(); DB.d = { users: [], vehicles: [], trips: [], fuelings: [], usage: [], audit: [] };
    try { S.user = await CLOUD.start(); } catch (x) { S.user = null; toast(x.message); }
    return S.user ? renderShell() : renderLogin();
  }
  DB.load();
  { const id = store.get(SESSION_KEY); S.user = DB.d.users.find(u => u.id === id && u.ativo) || null; }
  S.user ? renderShell() : renderLogin();
})();
