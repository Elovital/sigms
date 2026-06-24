/* SIGMS — Mapa Comparativo de Cotações (Saúde + Automóvel + Multirisco + Acidente de Trabalho) */
import { get, post, put, del } from './api.js';

/* ═══════════════════════════ CONSTANTES ═══════════════════════════ */

const COBERTURAS_SAUDE = [
  { id: 'hospitalizacao', label: 'Hospitalização / Internamento', peso: 1.5, icon: '🏥' },
  { id: 'ambulatorio',    label: 'Ambulatório',                   peso: 1.3, icon: '🩺' },
  { id: 'medicamentos',   label: 'Medicamentos',                  peso: 1.2, icon: '💊' },
  { id: 'maternidade',    label: 'Maternidade',                   peso: 1.1, icon: '🤱' },
  { id: 'estomatologia',  label: 'Estomatologia',                 peso: 1.0, icon: '🦷' },
  { id: 'oculos',         label: 'Óculos, Próteses e Ortóteses',  peso: 0.9, icon: '👓' },
  { id: 'evacuacao',      label: 'Evacuação e Repatriamento',     peso: 1.2, icon: '🚁' },
  { id: 'viagem',         label: 'Assistência Médica em Viagem',  peso: 0.8, icon: '✈️' },
  { id: 'medicina_prev',  label: 'Medicina Preventiva',           peso: 1.0, icon: '🔬' },
  { id: 'cuidados_opt',   label: 'Cuidados Ópticos',              peso: 0.7, icon: '👁️' },
];

const COBERTURAS_AUTO = [
  { id: 'rc_obrig',    label: 'RC Obrigatória',             peso: 2.0, icon: '📋', obrig: true },
  { id: 'danos_prop',  label: 'Danos Próprios',             peso: 1.8, icon: '🔧' },
  { id: 'furto_roubo', label: 'Furto / Roubo',              peso: 1.5, icon: '🔐' },
  { id: 'incendio',    label: 'Incêndio / Explosão',        peso: 1.3, icon: '🔥' },
  { id: 'vidros',      label: 'Quebra de Vidros',           peso: 0.8, icon: '🪟' },
  { id: 'assistencia', label: 'Assistência em Viagem 24h',  peso: 1.0, icon: '🛣️' },
  { id: 'ocupantes',   label: 'Proteção de Ocupantes',      peso: 1.2, icon: '👥' },
  { id: 'rc_facult',   label: 'RC Facultativa',             peso: 1.1, icon: '⚖️' },
  { id: 'reboque',     label: 'Reboque',                    peso: 0.7, icon: '🚛' },
  { id: 'carro_sub',   label: 'Carro de Substituição',      peso: 0.9, icon: '🚗' },
];

const CORES = [
  { primary: '#1a56db', light: '#e8f0fe' },
  { primary: '#057a55', light: '#def7ec' },
  { primary: '#7e3af2', light: '#ede9fe' },
  { primary: '#b45309', light: '#fef3c7' },
];
const MEDAL = ['🥇', '🥈', '🥉', '🏅'];
const TIPOS_COBERTURA_AUTO = ['RC Obrigatória', 'RC + Danos Próprios', 'Todos os Riscos', 'RC + Furto/Incêndio'];

const COBERTURAS_MULTI = [
  { id: 'incendio_nat',  label: 'Incêndio e Elementos da Natureza', peso: 2.0, icon: '🔥', obrig: true },
  { id: 'danos_agua',    label: 'Danos por Água',                   peso: 1.6, icon: '💧' },
  { id: 'rc',            label: 'Responsabilidade Civil',            peso: 1.5, icon: '⚖️' },
  { id: 'furto_van',     label: 'Furto, Roubo e Vandalismo',         peso: 1.4, icon: '🔐' },
  { id: 'vidros',        label: 'Quebra de Vidros',                  peso: 0.9, icon: '🪟' },
  { id: 'avaria_elec',   label: 'Avaria de Equipamentos Electrónicos', peso: 1.1, icon: '💻' },
  { id: 'perda_rendas',  label: 'Perda de Rendas',                   peso: 1.0, icon: '🏠' },
  { id: 'remocao',       label: 'Remoção de Escombros / Demolição',  peso: 0.8, icon: '🏗️' },
  { id: 'assist_24h',    label: 'Assistência ao Lar 24h',            peso: 1.2, icon: '🛠️' },
  { id: 'danos_esteticos', label: 'Danos Estéticos',                 peso: 0.7, icon: '🎨' },
];

const COBERTURAS_AT = [
  { id: 'morte_ac',      label: 'Morte por Acidente',                peso: 2.0, icon: '💼', obrig: true },
  { id: 'ipt',           label: 'Incapacidade Permanente Total',     peso: 2.0, icon: '🩼', obrig: true },
  { id: 'ipp',           label: 'Incapacidade Permanente Parcial',   peso: 1.8, icon: '🦽' },
  { id: 'itt',           label: 'Incapacidade Temporária',           peso: 1.5, icon: '🛏️' },
  { id: 'desp_medicas',  label: 'Despesas Médicas e Hospitalares',   peso: 1.6, icon: '🏥' },
  { id: 'desp_transp',   label: 'Despesas de Transporte e Resgate',  peso: 1.0, icon: '🚑' },
  { id: 'reabilitacao',  label: 'Reabilitação Profissional',         peso: 1.2, icon: '🔄' },
  { id: 'cap_adicional', label: 'Capital Adicional por Invalidez',   peso: 1.1, icon: '💰' },
  { id: 'assist_jur',    label: 'Assistência Jurídica',              peso: 0.9, icon: '📋' },
  { id: 'doencas_prof',  label: 'Doenças Profissionais',             peso: 1.3, icon: '🔬' },
];

const TIPOS_IMOVEL = ['Habitação', 'Escritório / Serviços', 'Comércio / Retalho', 'Indústria / Armazém', 'Misto'];
const SECTORES_AT  = ['Construção Civil', 'Indústria', 'Comércio', 'Serviços', 'Saúde', 'Educação', 'Transportes', 'Agricultura', 'Outro'];

/* ═══════════════════════════ ESTADO ═══════════════════════════ */
let state = {
  tab: 'saude',   // 'saude' | 'auto' | 'multi' | 'at'
  saude: { segs: [], radarChart: null, cliente: '' },
  auto:  { segs: [], radarChart: null, veiculo: {}, cliente: '' },
  multi: { segs: [], radarChart: null, imovel: {}, cliente: '' },
  at:    { segs: [], radarChart: null, empresa: {}, cliente: '' },
};

/* ═══════════════════════════ ENTRY POINT ═══════════════════════════ */
export async function renderCotacoes(container) {
  let segList = [];
  try { segList = (await get('/apolices/lookup/seguradoras')).map(s => s.nome); } catch {}

  state.saude.segs    = [0,1,2,3].map(() => newSegSaude());
  state.auto.segs     = [0,1,2,3].map(() => newSegAuto());
  state.multi.segs    = [0,1,2,3].map(() => newSegMulti());
  state.at.segs       = [0,1,2,3].map(() => newSegAT());
  state.auto.veiculo  = { tipo_cobertura: '', marca: '', modelo: '', ano: '', valor: '' };
  state.multi.imovel  = { tipo: '', localizacao: '', area: '', valor_imovel: '', valor_recheio: '' };
  state.at.empresa    = { sector: '', num_trabalhadores: '', capital_por_trabalhador: '' };
  state.saude.radarChart = null;
  state.auto.radarChart  = null;
  state.multi.radarChart = null;
  state.at.radarChart    = null;
  state.saude.cliente = '';
  state.auto.cliente  = '';
  state.multi.cliente = '';
  state.at.cliente    = '';

  container.innerHTML = buildRoot();
  bindTabEvents(segList);
  renderTab(segList);
}

function newSegSaude() {
  return { nome: '', plano: '', premio: '', carencia: '', copag_fora_rede: '',
    coberturas: Object.fromEntries(COBERTURAS_SAUDE.map(c => [c.id, { incluida: false, copag: '', limite: '' }])) };
}
function newSegMulti() {
  return { nome: '', plano: '', premio_anual: 0, premio_semestral: 0, premio_trimestral: 0, franquia: 0,
    coberturas: Object.fromEntries(COBERTURAS_MULTI.map(c => [c.id, { incluida: c.obrig||false }])) };
}
function newSegAT() {
  return { nome: '', plano: '', premio_anual: 0, premio_semestral: 0, premio_trimestral: 0, capital_morte: 0,
    coberturas: Object.fromEntries(COBERTURAS_AT.map(c => [c.id, { incluida: c.obrig||false }])) };
}

function newSegAuto() {
  return { nome: '', plano: '', premio_anual: '', premio_semestral: '', premio_trimestral: '', franquia: '',
    coberturas: Object.fromEntries(COBERTURAS_AUTO.map(c => [c.id, { incluida: c.obrig || false, franquia: '' }])) };
}

/* ═══════════════════════════ LAYOUT RAIZ ═══════════════════════════ */
function buildRoot() {
  return `
<div class="page-content" id="cot-root">
  <!-- Header -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <span style="font-size:28px">📊</span>
        <h2 style="font-size:20px;font-weight:700;color:var(--gray-900);margin:0">Mapa Comparativo de Cotações</h2>
      </div>
      <p style="font-size:13px;color:var(--gray-500);margin:0">Compare até 4 seguradoras · Avaliação inteligente de custo-benefício</p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button id="btn-limpar" class="btn btn-secondary" style="font-size:13px">🗑️ Limpar</button>
      <button id="btn-pdf" class="btn btn-secondary" style="font-size:13px;background:#dc2626;color:#fff;border-color:#dc2626">📄 PDF</button>
      <button id="btn-email" class="btn btn-primary" style="font-size:13px">✉️ Email</button>
    </div>
  </div>

  <!-- Tabs -->
  <div style="display:flex;gap:4px;margin-bottom:20px;border-bottom:2px solid var(--gray-200);padding-bottom:0">
    <button id="tab-saude" class="cot-tab active" data-tab="saude"
      style="padding:10px 20px;font-size:13px;font-weight:600;border:none;border-bottom:3px solid var(--primary);background:none;color:var(--primary);cursor:pointer;margin-bottom:-2px">
      🏥 Seguro de Saúde
    </button>
    <button id="tab-auto" class="cot-tab" data-tab="auto"
      style="padding:10px 20px;font-size:13px;font-weight:600;border:none;border-bottom:3px solid transparent;background:none;color:var(--gray-500);cursor:pointer;margin-bottom:-2px">
      🚗 Seguro Automóvel
    </button>
    <button id="tab-multi" class="cot-tab" data-tab="multi"
      style="padding:10px 20px;font-size:13px;font-weight:600;border:none;border-bottom:3px solid transparent;background:none;color:var(--gray-500);cursor:pointer;margin-bottom:-2px">
      🏠 Multirisco
    </button>
    <button id="tab-at" class="cot-tab" data-tab="at"
      style="padding:10px 20px;font-size:13px;font-weight:600;border:none;border-bottom:3px solid transparent;background:none;color:var(--gray-500);cursor:pointer;margin-bottom:-2px">
      👷 Acidente de Trabalho
    </button>
    <button id="tab-historico" class="cot-tab" data-tab="historico"
      style="padding:10px 20px;font-size:13px;font-weight:600;border:none;border-bottom:3px solid transparent;background:none;color:var(--gray-500);cursor:pointer;margin-bottom:-2px">
      📋 Histórico
    </button>
  </div>

  <!-- Conteúdo da tab -->
  <div id="cot-tab-content"></div>

  <!-- Modal Email -->
  <div id="modal-email" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999;align-items:center;justify-content:center">
    <div style="background:white;border-radius:12px;padding:32px;width:100%;max-width:440px;box-shadow:var(--shadow-lg)">
      <h3 style="margin:0 0 16px;font-size:16px">✉️ Enviar Mapa Comparativo</h3>
      <label style="font-size:13px;font-weight:600;color:var(--gray-700);display:block;margin-bottom:6px">Email de destino</label>
      <input id="email-dest" type="email" class="form-control" placeholder="cliente@empresa.ao" style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;color:var(--gray-700);display:block;margin-bottom:6px">Mensagem (opcional)</label>
      <textarea id="email-msg" class="form-control" rows="3" style="margin-bottom:20px;resize:none"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="modal-cancel" class="btn btn-secondary">Cancelar</button>
        <button id="modal-send" class="btn btn-primary">📤 Enviar</button>
      </div>
    </div>
  </div>
</div>`;
}

/* ═══════════════════════════ TABS ═══════════════════════════ */
function bindTabEvents(segList) {
  document.querySelectorAll('.cot-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      document.querySelectorAll('.cot-tab').forEach(b => {
        const active = b.dataset.tab === state.tab;
        b.style.borderBottom = active ? '3px solid var(--primary)' : '3px solid transparent';
        b.style.color = active ? 'var(--primary)' : 'var(--gray-500)';
      });
      // Botões PDF/Email/Limpar apenas nas abas de cotação
      const isHist = state.tab === 'historico';
      ['btn-limpar','btn-pdf','btn-email'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isHist ? 'none' : '';
      });
      renderTab(segList);
    });
  });
  document.getElementById('btn-limpar').addEventListener('click', () => limpar(segList));
  document.getElementById('btn-pdf').addEventListener('click', gerarPDF);
  document.getElementById('btn-email').addEventListener('click', () => { document.getElementById('modal-email').style.display = 'flex'; });
  document.getElementById('modal-cancel').addEventListener('click', () => { document.getElementById('modal-email').style.display = 'none'; });
  document.getElementById('modal-send').addEventListener('click', enviarEmail);
}

function renderTab(segList) {
  const el = document.getElementById('cot-tab-content');
  if (state.tab === 'saude') {
    el.innerHTML = buildSaudeLayout(segList);
    bindSaudeEvents(segList);
    updateSaude();
  } else if (state.tab === 'auto') {
    el.innerHTML = buildAutoLayout(segList);
    bindAutoEvents(segList);
    updateAuto();
  } else if (state.tab === 'multi') {
    el.innerHTML = buildMultiLayout(segList);
    bindMultiEvents(segList);
    updateMulti();
  } else if (state.tab === 'at') {
    el.innerHTML = buildATLayout(segList);
    bindATEvents(segList);
    updateAT();
  } else {
    renderHistorico();
  }
}

/* ══════════════════════════════════════════════════════════════
   SAÚDE
══════════════════════════════════════════════════════════════ */
function buildSaudeLayout(segList) {
  return `
  <!-- Cliente -->
  <div class="card" style="margin-bottom:16px;border-top:3px solid #1a56db">
    <div class="card-body" style="padding:12px 16px;display:flex;align-items:center;gap:16px">
      <span style="font-size:20px">👤</span>
      <div style="flex:1">
        <label style="font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Nome do Cliente</label>
        <input type="text" class="form-control" id="s-cliente" placeholder="Nome completo do cliente ou empresa" value="${esc(state.saude.cliente)}" style="font-size:13px;max-width:480px">
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px" id="seg-cards-saude">
    ${[0,1,2,3].map(i => buildSegCardSaude(i, segList)).join('')}
  </div>
  <div class="card" style="margin-bottom:24px">
    <div class="card-header" style="background:var(--gray-900);color:white;border-radius:8px 8px 0 0">
      <span class="card-title" style="color:white;font-size:14px;font-weight:700">📋 Tabela Comparativa de Coberturas</span>
    </div>
    <div class="card-body" style="padding:0;overflow-x:auto"><div id="tabela-saude"></div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
    <div class="card"><div class="card-header"><span class="card-title">🧠 Avaliação IA</span></div><div class="card-body" id="ia-scores-saude"></div></div>
    <div class="card"><div class="card-header"><span class="card-title">📡 Radar de Cobertura</span></div>
      <div class="card-body" style="position:relative;height:300px"><canvas id="radar-saude"></canvas></div></div>
  </div>
  <div id="recomendacao-saude" style="margin-bottom:24px"></div>`;
}

function buildSegCardSaude(i, segList) {
  const cor = CORES[i];
  return `
<div class="card" style="border-top:3px solid ${cor.primary};min-width:0">
  <div class="card-header" style="background:${cor.light};padding:12px 16px">
    <div style="font-size:12px;font-weight:700;color:${cor.primary};text-transform:uppercase;letter-spacing:.5px">Seguradora ${i+1}</div>
  </div>
  <div class="card-body" style="padding:14px">
    <datalist id="sl-s-${i}">${segList.map(s=>`<option value="${esc(s)}">`).join('')}</datalist>
    <div style="margin-bottom:10px">
      <label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Seguradora</label>
      <input type="text" class="form-control" id="s-nome-${i}" list="sl-s-${i}" placeholder="Nome da seguradora" style="font-size:13px">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Plano</label>
        <input type="text" class="form-control" id="s-plano-${i}" placeholder="Plano" style="font-size:13px"></div>
      <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Prémio Anual (AOA)</label>
        <input type="number" class="form-control" id="s-premio-${i}" placeholder="0" style="font-size:13px"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">⏳ Carência (dias)</label>
        <input type="number" class="form-control" id="s-carencia-${i}" placeholder="Ex: 90" min="0" style="font-size:13px"></div>
      <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">🌐 Co-pag. Fora Rede (%)</label>
        <input type="number" class="form-control" id="s-copag-fora-${i}" placeholder="Ex: 30" min="0" max="100" style="font-size:13px"></div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--gray-700);text-transform:uppercase;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--gray-200)">Coberturas</div>
    ${COBERTURAS_SAUDE.map(c => `
    <div style="display:grid;grid-template-columns:auto 1fr 1fr;align-items:center;gap:5px;margin-bottom:6px;padding:5px 7px;border-radius:5px;background:var(--gray-50)">
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;min-width:0">
        <input type="checkbox" id="s-${i}-${c.id}-inc" style="accent-color:${cor.primary};width:14px;height:14px;flex-shrink:0">
        <span style="font-size:11px;color:var(--gray-700);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(c.label)}">${c.icon} ${esc(c.label)}</span>
      </label>
      <input type="number" class="form-control" id="s-${i}-${c.id}-cop" placeholder="CO-PAG%" min="0" max="100" style="font-size:11px;padding:3px 5px;height:26px;text-align:center">
      <input type="text" class="form-control" id="s-${i}-${c.id}-lim" placeholder="Limite" style="font-size:11px;padding:3px 5px;height:26px">
    </div>`).join('')}
  </div>
</div>`;
}

function bindSaudeEvents(segList) {
  document.getElementById('s-cliente')?.addEventListener('input', e => { state.saude.cliente = e.target.value; });
  [0,1,2,3].forEach(i => {
    ['nome','plano','premio','carencia'].forEach(f => document.getElementById(`s-${f}-${i}`)?.addEventListener('input', () => { readSegSaude(i); updateSaude(); }));
    document.getElementById(`s-copag-fora-${i}`)?.addEventListener('input', () => { readSegSaude(i); updateSaude(); });
    COBERTURAS_SAUDE.forEach(c => {
      [`s-${i}-${c.id}-inc`,`s-${i}-${c.id}-cop`,`s-${i}-${c.id}-lim`].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.type==='checkbox'?'change':'input', () => { readSegSaude(i); updateSaude(); });
      });
    });
  });
}

function readSegSaude(i) {
  const s = state.saude.segs[i];
  s.nome           = v(`s-nome-${i}`);
  s.plano          = v(`s-plano-${i}`);
  s.premio         = parseFloat(v(`s-premio-${i}`)) || 0;
  s.carencia       = parseInt(v(`s-carencia-${i}`)) || 0;
  s.copag_fora_rede = parseFloat(v(`s-copag-fora-${i}`)) || 0;
  COBERTURAS_SAUDE.forEach(c => {
    s.coberturas[c.id] = { incluida: chk(`s-${i}-${c.id}-inc`), copag: v(`s-${i}-${c.id}-cop`), limite: v(`s-${i}-${c.id}-lim`) };
  });
}

function updateSaude() {
  updateTabelaSaude();
  const scores = calcScoresSaude();
  updateIAScores('ia-scores-saude', scores, state.saude.segs);
  updateRadar('radar-saude', scores, state.saude, ['Cobertura','Co-Pag.','Prémio','Maternidade','Hospitaliz.','Evacuação'],
    s => [s.dims.cobertura, s.dims.copagamento, s.dims.premio, s.dims.maternidade, s.dims.hospitalizacao, s.dims.evacuacao]);
  updateRecomendacao('recomendacao-saude', scores, state.saude.segs, s => s.premio);
}

function updateTabelaSaude() {
  const segs   = state.saude.segs;
  const labels = segs.map((s,i) => s.nome || `Seguradora ${i+1}`);
  const rows   = COBERTURAS_SAUDE.map(c => {
    const cells = segs.map((s,i) => {
      const cob = s.coberturas[c.id];
      if (!cob.incluida) return `<td style="text-align:center;color:var(--gray-400)">—</td>`;
      const cop = cob.copag ? `<span style="font-size:11px;color:var(--warning);font-weight:600">${cob.copag}%</span>` : `<span style="font-size:11px;color:var(--success)">0%</span>`;
      const lim = cob.limite ? `<br><span style="font-size:10px;color:var(--gray-500)">${esc(cob.limite)}</span>` : '';
      return `<td style="text-align:center;background:${CORES[i].light};padding:7px 5px"><span style="color:${CORES[i].primary};font-weight:700;font-size:14px">✓</span><br>${cop}${lim}</td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid var(--gray-100)"><td style="padding:7px 14px;font-size:13px;font-weight:500">${c.icon} ${c.label}</td>${cells}</tr>`;
  }).join('');
  const premios = segs.map((s,i) => !s.premio ? `<td style="text-align:center;color:var(--gray-400)">—</td>` :
    `<td style="text-align:center;background:${CORES[i].light};padding:8px"><span style="font-size:13px;font-weight:700;color:${CORES[i].primary}">${fmtN(s.premio)} AOA</span></td>`).join('');
  const carencias = segs.map((s,i) => !s.carencia ? `<td style="text-align:center;color:var(--gray-400)">—</td>` :
    `<td style="text-align:center;background:${CORES[i].light};padding:8px"><span style="font-size:13px;font-weight:700;color:${CORES[i].primary}">${s.carencia} dias</span></td>`).join('');
  const copagsFora = segs.map((s,i) => !s.copag_fora_rede ? `<td style="text-align:center;color:var(--gray-400)">—</td>` :
    `<td style="text-align:center;background:${CORES[i].light};padding:8px"><span style="font-size:13px;font-weight:700;color:${CORES[i].primary}">${s.copag_fora_rede}%</span></td>`).join('');
  document.getElementById('tabela-saude').innerHTML = buildTableHtml(labels, segs, rows, premios, 'Prémio Anual', carencias, copagsFora);
}

function calcScoresSaude() {
  const segs = state.saude.segs;
  const premios = segs.map(s => s.premio || 0);
  const maxP = Math.max(...premios.filter(p=>p>0)) || 1;
  const minP = Math.min(...premios.filter(p=>p>0)) || 1;
  return segs.map((s,i) => {
    const totalPeso = COBERTURAS_SAUDE.reduce((a,c)=>a+c.peso,0);
    const pesoInc   = COBERTURAS_SAUDE.reduce((a,c)=>a+(s.coberturas[c.id].incluida?c.peso:0),0);
    const cobScore  = pesoInc/totalPeso*40;
    const cobsInc   = COBERTURAS_SAUDE.filter(c=>s.coberturas[c.id].incluida);
    let copagScore  = 30;
    if (cobsInc.length>0) { const avg = cobsInc.reduce((a,c)=>a+(parseFloat(s.coberturas[c.id].copag)||0),0)/cobsInc.length; copagScore = Math.max(0,30-(avg/100)*30); }
    let premioScore = 15;
    if (s.premio>0 && premios.filter(p=>p>0).length>1) premioScore = ((maxP-s.premio)/(maxP-minP||1))*30;
    else if (s.premio>0) premioScore = 20;
    return { idx:i, nome:s.nome||`Seguradora ${i+1}`, total:Math.min(100,Math.round(cobScore+copagScore+premioScore)),
      dims:{ cobertura:+(pesoInc/totalPeso*10).toFixed(1), copagamento:+(copagScore/30*10).toFixed(1), premio:+(premioScore/30*10).toFixed(1),
             maternidade:s.coberturas['maternidade'].incluida?10:0, hospitalizacao:s.coberturas['hospitalizacao'].incluida?10:0, evacuacao:s.coberturas['evacuacao'].incluida?10:0 } };
  });
}

/* ══════════════════════════════════════════════════════════════
   AUTOMÓVEL
══════════════════════════════════════════════════════════════ */
function buildAutoLayout(segList) {
  return `
  <!-- Cliente -->
  <div class="card" style="margin-bottom:16px;border-top:3px solid #1a56db">
    <div class="card-body" style="padding:12px 16px;display:flex;align-items:center;gap:16px">
      <span style="font-size:20px">👤</span>
      <div style="flex:1">
        <label style="font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Nome do Cliente</label>
        <input type="text" class="form-control" id="a-cliente" placeholder="Nome completo do cliente ou empresa" value="${esc(state.auto.cliente)}" style="font-size:13px;max-width:480px">
      </div>
    </div>
  </div>

  <!-- Info do Veículo -->
  <div class="card" style="margin-bottom:16px;border-top:3px solid #f59e0b">
    <div class="card-header" style="background:#fef3c7;padding:12px 16px">
      <span class="card-title" style="color:#92400e;font-size:13px;font-weight:700">🚗 DADOS DO VEÍCULO / RISCO</span>
    </div>
    <div class="card-body" style="padding:14px">
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Tipo de Cobertura</label>
          <select class="form-control" id="a-tipo-cob" style="font-size:12px">
            <option value="">Seleccionar...</option>
            ${TIPOS_COBERTURA_AUTO.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}
          </select></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Marca</label>
          <input type="text" class="form-control" id="a-marca" placeholder="Ex: Toyota" style="font-size:12px"></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Modelo</label>
          <input type="text" class="form-control" id="a-modelo" placeholder="Ex: Hilux" style="font-size:12px"></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Ano</label>
          <input type="number" class="form-control" id="a-ano" placeholder="2020" style="font-size:12px"></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Valor Veículo (AOA)</label>
          <input type="number" class="form-control" id="a-valor" placeholder="0" style="font-size:12px"></div>
      </div>
    </div>
  </div>

  <!-- 3 colunas de seguradoras -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px" id="seg-cards-auto">
    ${[0,1,2,3].map(i => buildSegCardAuto(i, segList)).join('')}
  </div>

  <!-- Tabela comparativa -->
  <div class="card" style="margin-bottom:24px">
    <div class="card-header" style="background:var(--gray-900);color:white;border-radius:8px 8px 0 0">
      <span class="card-title" style="color:white;font-size:14px;font-weight:700">📋 Tabela Comparativa</span>
    </div>
    <div class="card-body" style="padding:0;overflow-x:auto"><div id="tabela-auto"></div></div>
  </div>

  <!-- IA + Radar -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
    <div class="card"><div class="card-header"><span class="card-title">🧠 Avaliação IA</span></div><div class="card-body" id="ia-scores-auto"></div></div>
    <div class="card"><div class="card-header"><span class="card-title">📡 Radar de Cobertura</span></div>
      <div class="card-body" style="position:relative;height:300px"><canvas id="radar-auto"></canvas></div></div>
  </div>
  <div id="recomendacao-auto" style="margin-bottom:24px"></div>`;
}

function buildSegCardAuto(i, segList) {
  const cor = CORES[i];
  return `
<div class="card" style="border-top:3px solid ${cor.primary};min-width:0">
  <div class="card-header" style="background:${cor.light};padding:12px 16px">
    <div style="font-size:12px;font-weight:700;color:${cor.primary};text-transform:uppercase;letter-spacing:.5px">Seguradora ${i+1}</div>
  </div>
  <div class="card-body" style="padding:14px">
    <datalist id="sl-a-${i}">${segList.map(s=>`<option value="${esc(s)}">`).join('')}</datalist>
    <div style="margin-bottom:10px">
      <label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Seguradora</label>
      <input type="text" class="form-control" id="a-nome-${i}" list="sl-a-${i}" placeholder="Nome" style="font-size:13px">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Plano / Produto</label>
        <input type="text" class="form-control" id="a-plano-${i}" placeholder="Ex: Auto Plus" style="font-size:12px"></div>
      <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Franquia Geral (AOA)</label>
        <input type="number" class="form-control" id="a-franquia-${i}" placeholder="0" style="font-size:12px"></div>
    </div>

    <!-- Prémios -->
    <div style="background:${cor.light};border-radius:6px;padding:10px;margin-bottom:10px">
      <div style="font-size:11px;font-weight:700;color:${cor.primary};text-transform:uppercase;margin-bottom:8px">💰 PRÉMIOS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${[['a-p-anual-'+i,'Prémio Anual'],['a-p-semestral-'+i,'Prémio Semestral'],['a-p-trimestral-'+i,'Prémio Trimestral'],['a-p-mensal-'+i,'Prémio Mensal']].map(([id,lbl])=>`
        <div><label style="font-size:10px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:2px">${lbl} (AOA)</label>
          <input type="number" class="form-control" id="${id}" placeholder="0" style="font-size:12px;padding:4px 8px;height:30px"></div>`).join('')}
      </div>
    </div>

    <!-- Coberturas -->
    <div style="font-size:11px;font-weight:700;color:var(--gray-700);text-transform:uppercase;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--gray-200)">Coberturas Incluídas</div>
    ${COBERTURAS_AUTO.map(c => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:5px 7px;border-radius:5px;background:${c.obrig?'#fef3c7':'var(--gray-50)'}">
      <input type="checkbox" id="a-${i}-${c.id}-inc" ${c.obrig?'checked disabled':''} style="accent-color:${cor.primary};width:14px;height:14px;flex-shrink:0">
      <span style="font-size:12px;color:var(--gray-700);flex:1">${c.icon} ${esc(c.label)}${c.obrig?' <span style="font-size:10px;color:#92400e">(obrigatória)</span>':''}</span>
    </div>`).join('')}
  </div>
</div>`;
}

function bindAutoEvents(segList) {
  document.getElementById('a-cliente')?.addEventListener('input', e => { state.auto.cliente = e.target.value; });
  ['a-tipo-cob','a-marca','a-modelo','a-ano','a-valor'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => { readVeiculo(); updateAuto(); });
  });
  [0,1,2,3].forEach(i => {
    [`a-nome-${i}`,'a-plano-'+i,'a-franquia-'+i,'a-p-anual-'+i,'a-p-semestral-'+i,'a-p-trimestral-'+i,'a-p-mensal-'+i].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => { readSegAuto(i); updateAuto(); });
    });
    COBERTURAS_AUTO.forEach(c => {
      const el = document.getElementById(`a-${i}-${c.id}-inc`);
      if (el && !c.obrig) el.addEventListener('change', () => { readSegAuto(i); updateAuto(); });
    });
  });
}

function readVeiculo() {
  state.auto.veiculo = { tipo_cobertura: v('a-tipo-cob'), marca: v('a-marca'), modelo: v('a-modelo'), ano: v('a-ano'), valor: parseFloat(v('a-valor'))||0 };
}

function readSegAuto(i) {
  const s = state.auto.segs[i];
  s.nome           = v(`a-nome-${i}`);
  s.plano          = v(`a-plano-${i}`);
  s.franquia       = parseFloat(v(`a-franquia-${i}`))||0;
  s.premio_anual   = parseFloat(v(`a-p-anual-${i}`))||0;
  s.premio_semestral   = parseFloat(v(`a-p-semestral-${i}`))||0;
  s.premio_trimestral  = parseFloat(v(`a-p-trimestral-${i}`))||0;
  s.premio_mensal      = parseFloat(v(`a-p-mensal-${i}`))||0;
  COBERTURAS_AUTO.forEach(c => { s.coberturas[c.id].incluida = c.obrig || chk(`a-${i}-${c.id}-inc`); });
}

function updateAuto() {
  updateTabelaAuto();
  const scores = calcScoresAuto();
  updateIAScores('ia-scores-auto', scores, state.auto.segs, true);
  updateRadar('radar-auto', scores, state.auto, ['Cobertura','Prémio','Franquia','Furto/Roubo','Danos Próprios','Assistência'],
    s => [s.dims.cobertura, s.dims.premio, s.dims.franquia, s.dims.furto, s.dims.danos, s.dims.assistencia]);
  updateRecomendacao('recomendacao-auto', scores, state.auto.segs, s => s.premio_anual);
}

function updateTabelaAuto() {
  const segs   = state.auto.segs;
  const labels = segs.map((s,i) => s.nome || `Seguradora ${i+1}`);
  const veic   = state.auto.veiculo;

  const cobRows = COBERTURAS_AUTO.map(c => {
    const cells = segs.map((s,i) => {
      const inc = s.coberturas[c.id]?.incluida;
      return `<td style="text-align:center;${inc?`background:${CORES[i].light}`:''}">
        <span style="font-size:15px;font-weight:700;color:${inc?CORES[i].primary:'var(--gray-300)'}">${inc?'✓':'—'}</span>
      </td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid var(--gray-100)"><td style="padding:7px 14px;font-size:13px;font-weight:500">${c.icon} ${c.label}</td>${cells}</tr>`;
  }).join('');

  const premioRows = [
    ['Prémio Anual',      s => s.premio_anual],
    ['Prémio Semestral',  s => s.premio_semestral],
    ['Prémio Trimestral', s => s.premio_trimestral],
    ['Prémio Mensal',     s => s.premio_mensal],
    ['Franquia',          s => s.franquia],
  ].map(([lbl, fn]) => {
    const cells = segs.map((s,i) => {
      const val = fn(s);
      if (!val) return `<td style="text-align:center;color:var(--gray-400)">—</td>`;
      return `<td style="text-align:center;background:${CORES[i].light};padding:7px"><span style="font-size:12px;font-weight:700;color:${CORES[i].primary}">${fmtN(val)} AOA</span></td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid var(--gray-100)"><td style="padding:7px 14px;font-size:13px;font-weight:600;color:var(--gray-700)">${lbl}</td>${cells}</tr>`;
  }).join('');

  document.getElementById('tabela-auto').innerHTML = `
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:var(--gray-800)">
        <th style="padding:10px 14px;font-size:12px;font-weight:600;color:white;text-align:left;width:30%">
          ${veic.tipo_cobertura ? `🚗 ${esc(veic.tipo_cobertura)}` : 'COBERTURA / PRÉMIO'}
          ${veic.marca||veic.modelo ? `<br><span style="font-size:10px;color:var(--gray-400);font-weight:400">${esc(veic.marca)} ${esc(veic.modelo)} ${veic.ano||''}</span>` : ''}
        </th>
        ${labels.map((l,i) => `<th style="padding:10px 8px;font-size:12px;font-weight:600;color:white;text-align:center;border-left:1px solid rgba(255,255,255,.1)">
          <div style="color:${CORES[i].light}">${esc(l)}</div>
          ${segs[i].plano?`<div style="font-size:10px;color:var(--gray-400);font-weight:400">${esc(segs[i].plano)}</div>`:''}
        </th>`).join('')}
      </tr>
      <tr style="background:#374151"><td colspan="4" style="padding:6px 14px;font-size:11px;font-weight:700;color:var(--gray-300);text-transform:uppercase;letter-spacing:.5px">Coberturas</td></tr>
    </thead>
    <tbody>${cobRows}
      <tr style="background:#374151"><td colspan="4" style="padding:6px 14px;font-size:11px;font-weight:700;color:var(--gray-300);text-transform:uppercase;letter-spacing:.5px">Prémios & Condições</td></tr>
      ${premioRows}
    </tbody>
  </table>`;
}

function calcScoresAuto() {
  const segs  = state.auto.segs;
  const anual = segs.map(s => s.premio_anual || 0);
  const maxA  = Math.max(...anual.filter(p=>p>0)) || 1;
  const minA  = Math.min(...anual.filter(p=>p>0)) || 1;
  const maxF  = Math.max(...segs.map(s=>s.franquia||0)) || 1;

  return segs.map((s,i) => {
    const totalPeso = COBERTURAS_AUTO.reduce((a,c)=>a+c.peso,0);
    const pesoInc   = COBERTURAS_AUTO.reduce((a,c)=>a+(s.coberturas[c.id]?.incluida?c.peso:0),0);
    const cobScore  = pesoInc/totalPeso*40;

    let premioScore = 15;
    if (s.premio_anual>0 && anual.filter(p=>p>0).length>1) premioScore = ((maxA-s.premio_anual)/(maxA-minA||1))*35;
    else if (s.premio_anual>0) premioScore = 20;

    let franquiaScore = 15;
    if (s.franquia>0) franquiaScore = Math.max(0, 15 - (s.franquia/maxF)*15);
    else if (s.franquia===0 && s.premium_anual>0) franquiaScore = 15;

    const total = Math.min(100, Math.round(cobScore+premioScore+franquiaScore));
    return { idx:i, nome:s.nome||`Seguradora ${i+1}`, total,
      dims:{ cobertura:+(pesoInc/totalPeso*10).toFixed(1), premio:+(premioScore/35*10).toFixed(1), franquia:+(franquiaScore/15*10).toFixed(1),
             furto:s.coberturas['furto_roubo']?.incluida?10:0, danos:s.coberturas['danos_prop']?.incluida?10:0, assistencia:s.coberturas['assistencia']?.incluida?10:0 } };
  });
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTES PARTILHADOS
══════════════════════════════════════════════════════════════ */
function buildTableHtml(labels, segs, rows, extraRow, extraLabel, carencias='', copagsFora='') {
  return `
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:var(--gray-800)">
        <th style="padding:12px 14px;font-size:12px;font-weight:600;color:white;text-align:left;width:25%">COBERTURA</th>
        ${labels.map((l,i)=>`<th style="padding:12px 8px;font-size:12px;font-weight:600;color:white;text-align:center;width:18.75%;border-left:1px solid rgba(255,255,255,.1)">
          <div style="color:${CORES[i].light}">${esc(l)}</div>
          ${segs[i].plano?`<div style="font-size:10px;color:var(--gray-400);font-weight:400">${esc(segs[i].plano)}</div>`:''}
        </th>`).join('')}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      ${carencias ? `<tr style="background:var(--gray-50)">
        <td style="padding:9px 14px;font-size:12px;font-weight:700;color:var(--gray-700);text-transform:uppercase">⏳ Período de Carência</td>${carencias}
      </tr>` : ''}
      ${copagsFora ? `<tr style="background:var(--gray-100)">
        <td style="padding:9px 14px;font-size:12px;font-weight:700;color:var(--gray-700);text-transform:uppercase">🌐 Co-pag. Fora da Rede</td>${copagsFora}
      </tr>` : ''}
      <tr style="background:var(--gray-100)">
        <td style="padding:9px 14px;font-size:12px;font-weight:700;color:var(--gray-700);text-transform:uppercase">💰 ${extraLabel}</td>${extraRow}
      </tr>
    </tfoot>
  </table>`;
}

function updateIAScores(elId, scores, segs, isAuto=false) {
  const sorted = [...scores].sort((a,b)=>b.total-a.total);
  const html = scores.map((sc,i) => {
    const rank  = sorted.findIndex(s=>s.idx===i);
    const cor   = CORES[i];
    const pct   = sc.total;
    const corS  = pct>=70?'var(--success)':pct>=45?'var(--warning)':'var(--danger)';
    const dims  = isAuto
      ? [['Cobertura',sc.dims.cobertura],['Prémio',sc.dims.premio],['Franquia',sc.dims.franquia]]
      : [['Cobertura',sc.dims.cobertura],['Co-Pag.',sc.dims.copagamento],['Prémio',sc.dims.premio]];
    return `
    <div style="padding:12px;border:1px solid var(--gray-200);border-radius:8px;margin-bottom:10px;border-left:4px solid ${cor.primary}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
        <span style="font-size:14px;font-weight:700;color:var(--gray-900)">${MEDAL[rank]} ${esc(sc.nome)}</span>
        <span style="font-size:22px;font-weight:800;color:${corS}">${pct}</span>
      </div>
      <div style="height:7px;border-radius:4px;background:var(--gray-200);overflow:hidden;margin-bottom:8px">
        <div style="height:100%;border-radius:4px;background:${cor.primary};width:${pct}%;transition:width .5s"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:11px">
        ${dims.map(([l,v])=>`<div style="text-align:center;background:var(--gray-50);border-radius:4px;padding:4px">
          <div style="color:var(--gray-500)">${l}</div><div style="font-weight:700;color:var(--gray-800)">${v}/10</div></div>`).join('')}
      </div>
    </div>`;
  }).join('');
  const el = document.getElementById(elId);
  if (el) el.innerHTML = html || `<div style="color:var(--gray-400);text-align:center;padding:20px;font-size:13px">Preencha os dados para ver a avaliação</div>`;
}

function updateRadar(canvasId, scores, stateRef, labels, dimsFn) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const datasets = scores.map((sc,i) => ({
    label: sc.nome, data: dimsFn(sc),
    backgroundColor: CORES[i].primary+'22', borderColor: CORES[i].primary,
    borderWidth:2, pointBackgroundColor: CORES[i].primary, pointRadius:4,
  }));
  if (stateRef.radarChart) {
    stateRef.radarChart.data.datasets = datasets;
    stateRef.radarChart.data.datasets.forEach((ds,i) => { ds.label = scores[i].nome; });
    stateRef.radarChart.update();
  } else {
    stateRef.radarChart = new Chart(ctx, {
      type: 'radar', data: { labels, datasets },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{ font:{size:11}, padding:12 } } },
        scales:{ r:{ min:0, max:10, ticks:{ stepSize:2, font:{size:10}, color:'#9ca3af' }, grid:{color:'#e5e7eb'}, pointLabels:{font:{size:11},color:'#374151'} } } },
    });
  }
}

function updateRecomendacao(elId, scores, segs, premioFn) {
  const sorted = [...scores].sort((a,b)=>b.total-a.total);
  const best = sorted[0];
  const el = document.getElementById(elId);
  if (!el || best.total===0) { if (el) el.innerHTML=''; return; }
  const cor = CORES[best.idx];
  const difPremio = premioFn(segs[sorted[0].idx]) && premioFn(segs[sorted[1]?.idx])
    ? Math.abs(premioFn(segs[sorted[0].idx]) - premioFn(segs[sorted[1].idx])) : null;
  const ncobs = Object.values(segs[best.idx].coberturas||{}).filter(c=>c.incluida).length;
  el.innerHTML = `
  <div style="background:linear-gradient(135deg,${cor.primary}15,${cor.light});border:1px solid ${cor.primary}40;border-radius:12px;padding:18px 22px;display:flex;align-items:flex-start;gap:14px">
    <div style="font-size:34px;flex-shrink:0">🏆</div>
    <div>
      <div style="font-size:12px;font-weight:700;color:${cor.primary};text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Recomendação IA</div>
      <div style="font-size:15px;font-weight:800;color:var(--gray-900);margin-bottom:5px">
        ${esc(best.nome)} ${segs[best.idx].plano?`· ${esc(segs[best.idx].plano)}`:''}
        <span style="background:${cor.primary};color:white;font-size:11px;padding:2px 9px;border-radius:20px;margin-left:7px;font-weight:700">${best.total} pts</span>
      </div>
      <div style="font-size:13px;color:var(--gray-600);line-height:1.6">
        Melhor relação custo-benefício com <strong>${ncobs} coberturas incluídas</strong>
        ${difPremio?` e poupança estimada de <strong>${fmtN(Math.round(difPremio))} AOA/ano</strong>`:''}. Score <strong>${best.total}/100</strong>.
      </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   MULTIRISCO
══════════════════════════════════════════════════════════════ */
function buildMultiLayout(segList) {
  return `
  <div class="card" style="margin-bottom:16px;border-top:3px solid #1a56db">
    <div class="card-body" style="padding:12px 16px;display:flex;align-items:center;gap:16px">
      <span style="font-size:20px">👤</span>
      <div style="flex:1">
        <label style="font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Nome do Cliente</label>
        <input type="text" class="form-control" id="m-cliente" placeholder="Nome completo do cliente ou empresa" value="${esc(state.multi.cliente)}" style="font-size:13px;max-width:480px">
      </div>
    </div>
  </div>
  <div class="card" style="margin-bottom:16px;border-top:3px solid #f59e0b">
    <div class="card-header" style="background:#fef3c7;padding:12px 16px">
      <span class="card-title" style="color:#92400e;font-size:13px;font-weight:700">🏠 DADOS DO IMÓVEL / RISCO</span>
    </div>
    <div class="card-body" style="padding:14px">
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Tipo de Imóvel</label>
          <select class="form-control" id="m-tipo" style="font-size:12px">
            <option value="">Seleccionar...</option>
            ${TIPOS_IMOVEL.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}
          </select></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Localização</label>
          <input type="text" class="form-control" id="m-local" placeholder="Ex: Luanda" style="font-size:12px"></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Área (m²)</label>
          <input type="number" class="form-control" id="m-area" placeholder="0" style="font-size:12px"></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Valor Imóvel (AOA)</label>
          <input type="number" class="form-control" id="m-val-imovel" placeholder="0" style="font-size:12px"></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Valor Recheio (AOA)</label>
          <input type="number" class="form-control" id="m-val-recheio" placeholder="0" style="font-size:12px"></div>
      </div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px" id="seg-cards-multi">
    ${[0,1,2,3].map(i => buildSegCardMulti(i, segList)).join('')}
  </div>
  <div class="card" style="margin-bottom:24px">
    <div class="card-header" style="background:var(--gray-900);color:white;border-radius:8px 8px 0 0">
      <span class="card-title" style="color:white;font-size:14px;font-weight:700">📋 Tabela Comparativa</span>
    </div>
    <div class="card-body" style="padding:0;overflow-x:auto"><div id="tabela-multi"></div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
    <div class="card"><div class="card-header"><span class="card-title">🧠 Avaliação IA</span></div><div class="card-body" id="ia-scores-multi"></div></div>
    <div class="card"><div class="card-header"><span class="card-title">📡 Radar de Cobertura</span></div>
      <div class="card-body" style="position:relative;height:300px"><canvas id="radar-multi"></canvas></div></div>
  </div>
  <div id="recomendacao-multi" style="margin-bottom:24px"></div>`;
}

function buildSegCardMulti(i, segList) {
  const cor = CORES[i];
  return `
<div class="card" style="border-top:3px solid ${cor.primary};min-width:0">
  <div class="card-header" style="background:${cor.light};padding:12px 16px">
    <div style="font-size:12px;font-weight:700;color:${cor.primary};text-transform:uppercase;letter-spacing:.5px">Seguradora ${i+1}</div>
  </div>
  <div class="card-body" style="padding:14px">
    <datalist id="sl-m-${i}">${segList.map(s=>`<option value="${esc(s)}">`).join('')}</datalist>
    <div style="margin-bottom:10px">
      <label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Seguradora</label>
      <input type="text" class="form-control" id="m-nome-${i}" list="sl-m-${i}" placeholder="Nome" style="font-size:13px">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Plano / Produto</label>
        <input type="text" class="form-control" id="m-plano-${i}" placeholder="Ex: Multi Total" style="font-size:12px"></div>
      <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Franquia (AOA)</label>
        <input type="number" class="form-control" id="m-franquia-${i}" placeholder="0" style="font-size:12px"></div>
    </div>
    <div style="background:${cor.light};border-radius:6px;padding:10px;margin-bottom:10px">
      <div style="font-size:11px;font-weight:700;color:${cor.primary};text-transform:uppercase;margin-bottom:8px">💰 PRÉMIOS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${[['m-p-anual-'+i,'Prémio Anual'],['m-p-semestral-'+i,'Prémio Semestral'],['m-p-trimestral-'+i,'Prémio Trimestral']].map(([id,lbl])=>`
        <div><label style="font-size:10px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:2px">${lbl} (AOA)</label>
          <input type="number" class="form-control" id="${id}" placeholder="0" style="font-size:12px;padding:4px 8px;height:30px"></div>`).join('')}
      </div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--gray-700);text-transform:uppercase;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--gray-200)">Coberturas Incluídas</div>
    ${COBERTURAS_MULTI.map(c => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:5px 7px;border-radius:5px;background:${c.obrig?'#fef3c7':'var(--gray-50)'}">
      <input type="checkbox" id="m-${i}-${c.id}-inc" ${c.obrig?'checked disabled':''} style="accent-color:${cor.primary};width:14px;height:14px;flex-shrink:0">
      <span style="font-size:12px;color:var(--gray-700);flex:1">${c.icon} ${esc(c.label)}${c.obrig?' <span style="font-size:10px;color:#92400e">(obrigatória)</span>':''}</span>
    </div>`).join('')}
  </div>
</div>`;
}

function bindMultiEvents(segList) {
  document.getElementById('m-cliente')?.addEventListener('input', e => { state.multi.cliente = e.target.value; });
  ['m-tipo','m-local','m-area','m-val-imovel','m-val-recheio'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', () => { readImovel(); updateMulti(); }));
  [0,1,2,3].forEach(i => {
    [`m-nome-${i}`,'m-plano-'+i,'m-franquia-'+i,'m-p-anual-'+i,'m-p-semestral-'+i,'m-p-trimestral-'+i].forEach(id =>
      document.getElementById(id)?.addEventListener('input', () => { readSegMulti(i); updateMulti(); }));
    COBERTURAS_MULTI.forEach(c => {
      const el = document.getElementById(`m-${i}-${c.id}-inc`);
      if (el && !c.obrig) el.addEventListener('change', () => { readSegMulti(i); updateMulti(); });
    });
  });
}

function readImovel() {
  state.multi.imovel = { tipo: v('m-tipo'), localizacao: v('m-local'), area: v('m-area'),
    valor_imovel: parseFloat(v('m-val-imovel'))||0, valor_recheio: parseFloat(v('m-val-recheio'))||0 };
}

function readSegMulti(i) {
  const s = state.multi.segs[i];
  s.nome             = v(`m-nome-${i}`);
  s.plano            = v(`m-plano-${i}`);
  s.franquia         = parseFloat(v(`m-franquia-${i}`))||0;
  s.premio_anual     = parseFloat(v(`m-p-anual-${i}`))||0;
  s.premio_semestral = parseFloat(v(`m-p-semestral-${i}`))||0;
  s.premio_trimestral= parseFloat(v(`m-p-trimestral-${i}`))||0;
  COBERTURAS_MULTI.forEach(c => { s.coberturas[c.id].incluida = c.obrig || chk(`m-${i}-${c.id}-inc`); });
}

function updateMulti() {
  updateTabelaMulti();
  const scores = calcScoresMulti();
  updateIAScores('ia-scores-multi', scores, state.multi.segs, 'multi');
  updateRadar('radar-multi', scores, state.multi,
    ['Cobertura','Prémio','Franquia','RC','Furto/Roubo','Assistência'],
    s => [s.dims.cobertura, s.dims.premio, s.dims.franquia, s.dims.rc, s.dims.furto, s.dims.assistencia]);
  updateRecomendacao('recomendacao-multi', scores, state.multi.segs, s => s.premio_anual);
}

function updateTabelaMulti() {
  const segs   = state.multi.segs;
  const imovel = state.multi.imovel;
  const labels = segs.map((s,i) => s.nome || `Seguradora ${i+1}`);
  const cobRows = COBERTURAS_MULTI.map(c => {
    const cells = segs.map((s,i) => {
      const inc = s.coberturas[c.id]?.incluida;
      return `<td style="text-align:center;${inc?`background:${CORES[i].light}`:''}">
        <span style="font-size:15px;font-weight:700;color:${inc?CORES[i].primary:'var(--gray-300)'}">${inc?'✓':'—'}</span></td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid var(--gray-100)"><td style="padding:7px 14px;font-size:13px;font-weight:500">${c.icon} ${c.label}</td>${cells}</tr>`;
  }).join('');
  const premioRows = [
    ['Prémio Anual', s=>s.premio_anual], ['Prémio Semestral', s=>s.premio_semestral],
    ['Prémio Trimestral', s=>s.premio_trimestral], ['Franquia', s=>s.franquia],
  ].map(([lbl,fn]) => {
    const cells = segs.map((s,i) => {
      const val = fn(s);
      if (!val) return `<td style="text-align:center;color:var(--gray-400)">—</td>`;
      return `<td style="text-align:center;background:${CORES[i].light};padding:7px"><span style="font-size:12px;font-weight:700;color:${CORES[i].primary}">${fmtN(val)} AOA</span></td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid var(--gray-100)"><td style="padding:7px 14px;font-size:13px;font-weight:600;color:var(--gray-700)">${lbl}</td>${cells}</tr>`;
  }).join('');
  const imovelInfo = imovel.tipo ? `🏠 ${esc(imovel.tipo)}${imovel.localizacao?' · '+esc(imovel.localizacao):''}${imovel.area?' · '+imovel.area+'m²':''}` : 'COBERTURA / PRÉMIO';
  document.getElementById('tabela-multi').innerHTML = `
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:var(--gray-800)">
        <th style="padding:10px 14px;font-size:12px;font-weight:600;color:white;text-align:left;width:30%">${imovelInfo}</th>
        ${labels.map((l,i)=>`<th style="padding:10px 8px;font-size:12px;font-weight:600;color:white;text-align:center;border-left:1px solid rgba(255,255,255,.1)">
          <div style="color:${CORES[i].light}">${esc(l)}</div>
          ${segs[i].plano?`<div style="font-size:10px;color:var(--gray-400);font-weight:400">${esc(segs[i].plano)}</div>`:''}
        </th>`).join('')}
      </tr>
      <tr style="background:#374151"><td colspan="4" style="padding:6px 14px;font-size:11px;font-weight:700;color:var(--gray-300);text-transform:uppercase;letter-spacing:.5px">Coberturas</td></tr>
    </thead>
    <tbody>${cobRows}
      <tr style="background:#374151"><td colspan="4" style="padding:6px 14px;font-size:11px;font-weight:700;color:var(--gray-300);text-transform:uppercase;letter-spacing:.5px">Prémios & Condições</td></tr>
      ${premioRows}
    </tbody>
  </table>`;
}

function calcScoresMulti() {
  const segs = state.multi.segs;
  const anual = segs.map(s => s.premio_anual||0);
  const maxA  = Math.max(...anual.filter(p=>p>0))||1;
  const minA  = Math.min(...anual.filter(p=>p>0))||1;
  const maxF  = Math.max(...segs.map(s=>s.franquia||0))||1;
  const totalPeso = COBERTURAS_MULTI.reduce((a,c)=>a+c.peso,0);
  return segs.map((s,i) => {
    const pesoInc = COBERTURAS_MULTI.reduce((a,c)=>a+(s.coberturas[c.id]?.incluida?c.peso:0),0);
    const cobScore = pesoInc/totalPeso*40;
    let premioScore = 15;
    if (s.premio_anual>0 && anual.filter(p=>p>0).length>1) premioScore = ((maxA-s.premio_anual)/(maxA-minA||1))*35;
    else if (s.premio_anual>0) premioScore = 20;
    const franquiaScore = s.franquia>0 ? Math.max(0,15-(s.franquia/maxF)*15) : 15;
    const total = Math.min(100, Math.round(cobScore+premioScore+franquiaScore));
    return { idx:i, nome:s.nome||`Seguradora ${i+1}`, total,
      dims:{ cobertura:+(pesoInc/totalPeso*10).toFixed(1), premio:+(premioScore/35*10).toFixed(1), franquia:+(franquiaScore/15*10).toFixed(1),
             rc:s.coberturas['rc']?.incluida?10:0, furto:s.coberturas['furto_van']?.incluida?10:0, assistencia:s.coberturas['assist_24h']?.incluida?10:0 } };
  });
}

/* ══════════════════════════════════════════════════════════════
   ACIDENTE DE TRABALHO
══════════════════════════════════════════════════════════════ */
function buildATLayout(segList) {
  return `
  <div class="card" style="margin-bottom:16px;border-top:3px solid #1a56db">
    <div class="card-body" style="padding:12px 16px;display:flex;align-items:center;gap:16px">
      <span style="font-size:20px">👤</span>
      <div style="flex:1">
        <label style="font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Nome do Cliente / Empresa</label>
        <input type="text" class="form-control" id="at-cliente" placeholder="Nome da empresa segurada" value="${esc(state.at.cliente)}" style="font-size:13px;max-width:480px">
      </div>
    </div>
  </div>
  <div class="card" style="margin-bottom:16px;border-top:3px solid #f59e0b">
    <div class="card-header" style="background:#fef3c7;padding:12px 16px">
      <span class="card-title" style="color:#92400e;font-size:13px;font-weight:700">👷 DADOS DA EMPRESA / RISCO</span>
    </div>
    <div class="card-body" style="padding:14px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Sector de Actividade</label>
          <select class="form-control" id="at-sector" style="font-size:12px">
            <option value="">Seleccionar...</option>
            ${SECTORES_AT.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}
          </select></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Nº de Trabalhadores</label>
          <input type="number" class="form-control" id="at-num-trab" placeholder="0" style="font-size:12px"></div>
        <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Capital / Trabalhador (AOA)</label>
          <input type="number" class="form-control" id="at-capital-trab" placeholder="0" style="font-size:12px"></div>
      </div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px" id="seg-cards-at">
    ${[0,1,2,3].map(i => buildSegCardAT(i, segList)).join('')}
  </div>
  <div class="card" style="margin-bottom:24px">
    <div class="card-header" style="background:var(--gray-900);color:white;border-radius:8px 8px 0 0">
      <span class="card-title" style="color:white;font-size:14px;font-weight:700">📋 Tabela Comparativa</span>
    </div>
    <div class="card-body" style="padding:0;overflow-x:auto"><div id="tabela-at"></div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
    <div class="card"><div class="card-header"><span class="card-title">🧠 Avaliação IA</span></div><div class="card-body" id="ia-scores-at"></div></div>
    <div class="card"><div class="card-header"><span class="card-title">📡 Radar de Cobertura</span></div>
      <div class="card-body" style="position:relative;height:300px"><canvas id="radar-at"></canvas></div></div>
  </div>
  <div id="recomendacao-at" style="margin-bottom:24px"></div>`;
}

function buildSegCardAT(i, segList) {
  const cor = CORES[i];
  return `
<div class="card" style="border-top:3px solid ${cor.primary};min-width:0">
  <div class="card-header" style="background:${cor.light};padding:12px 16px">
    <div style="font-size:12px;font-weight:700;color:${cor.primary};text-transform:uppercase;letter-spacing:.5px">Seguradora ${i+1}</div>
  </div>
  <div class="card-body" style="padding:14px">
    <datalist id="sl-at-${i}">${segList.map(s=>`<option value="${esc(s)}">`).join('')}</datalist>
    <div style="margin-bottom:10px">
      <label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Seguradora</label>
      <input type="text" class="form-control" id="at-nome-${i}" list="sl-at-${i}" placeholder="Nome" style="font-size:13px">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Plano / Produto</label>
        <input type="text" class="form-control" id="at-plano-${i}" placeholder="Ex: AT Completo" style="font-size:12px"></div>
      <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Capital por Morte (AOA)</label>
        <input type="number" class="form-control" id="at-capital-${i}" placeholder="0" style="font-size:12px"></div>
    </div>
    <div style="background:${cor.light};border-radius:6px;padding:10px;margin-bottom:10px">
      <div style="font-size:11px;font-weight:700;color:${cor.primary};text-transform:uppercase;margin-bottom:8px">💰 PRÉMIOS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${[['at-p-anual-'+i,'Prémio Anual'],['at-p-semestral-'+i,'Prémio Semestral'],['at-p-trimestral-'+i,'Prémio Trimestral']].map(([id,lbl])=>`
        <div><label style="font-size:10px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:2px">${lbl} (AOA)</label>
          <input type="number" class="form-control" id="${id}" placeholder="0" style="font-size:12px;padding:4px 8px;height:30px"></div>`).join('')}
      </div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--gray-700);text-transform:uppercase;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--gray-200)">Coberturas Incluídas</div>
    ${COBERTURAS_AT.map(c => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:5px 7px;border-radius:5px;background:${c.obrig?'#fef3c7':'var(--gray-50)'}">
      <input type="checkbox" id="at-${i}-${c.id}-inc" ${c.obrig?'checked disabled':''} style="accent-color:${cor.primary};width:14px;height:14px;flex-shrink:0">
      <span style="font-size:12px;color:var(--gray-700);flex:1">${c.icon} ${esc(c.label)}${c.obrig?' <span style="font-size:10px;color:#92400e">(obrigatória)</span>':''}</span>
    </div>`).join('')}
  </div>
</div>`;
}

function bindATEvents(segList) {
  document.getElementById('at-cliente')?.addEventListener('input', e => { state.at.cliente = e.target.value; });
  ['at-sector','at-num-trab','at-capital-trab'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', () => { readEmpresa(); updateAT(); }));
  [0,1,2,3].forEach(i => {
    [`at-nome-${i}`,'at-plano-'+i,'at-capital-'+i,'at-p-anual-'+i,'at-p-semestral-'+i,'at-p-trimestral-'+i].forEach(id =>
      document.getElementById(id)?.addEventListener('input', () => { readSegAT(i); updateAT(); }));
    COBERTURAS_AT.forEach(c => {
      const el = document.getElementById(`at-${i}-${c.id}-inc`);
      if (el && !c.obrig) el.addEventListener('change', () => { readSegAT(i); updateAT(); });
    });
  });
}

function readEmpresa() {
  state.at.empresa = { sector: v('at-sector'), num_trabalhadores: v('at-num-trab'), capital_por_trabalhador: parseFloat(v('at-capital-trab'))||0 };
}

function readSegAT(i) {
  const s = state.at.segs[i];
  s.nome              = v(`at-nome-${i}`);
  s.plano             = v(`at-plano-${i}`);
  s.capital_morte     = parseFloat(v(`at-capital-${i}`))||0;
  s.premio_anual      = parseFloat(v(`at-p-anual-${i}`))||0;
  s.premio_semestral  = parseFloat(v(`at-p-semestral-${i}`))||0;
  s.premio_trimestral = parseFloat(v(`at-p-trimestral-${i}`))||0;
  COBERTURAS_AT.forEach(c => { s.coberturas[c.id].incluida = c.obrig || chk(`at-${i}-${c.id}-inc`); });
}

function updateAT() {
  updateTabelaAT();
  const scores = calcScoresAT();
  updateIAScores('ia-scores-at', scores, state.at.segs, 'at');
  updateRadar('radar-at', scores, state.at,
    ['Cobertura','Prémio','Capital','Desp. Médicas','Reabilitação','Invalidez'],
    s => [s.dims.cobertura, s.dims.premio, s.dims.capital, s.dims.desp_med, s.dims.reab, s.dims.inval]);
  updateRecomendacao('recomendacao-at', scores, state.at.segs, s => s.premio_anual);
}

function updateTabelaAT() {
  const segs    = state.at.segs;
  const empresa = state.at.empresa;
  const labels  = segs.map((s,i) => s.nome || `Seguradora ${i+1}`);
  const cobRows = COBERTURAS_AT.map(c => {
    const cells = segs.map((s,i) => {
      const inc = s.coberturas[c.id]?.incluida;
      return `<td style="text-align:center;${inc?`background:${CORES[i].light}`:''}">
        <span style="font-size:15px;font-weight:700;color:${inc?CORES[i].primary:'var(--gray-300)'}">${inc?'✓':'—'}</span></td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid var(--gray-100)"><td style="padding:7px 14px;font-size:13px;font-weight:500">${c.icon} ${c.label}</td>${cells}</tr>`;
  }).join('');
  const premioRows = [
    ['Prémio Anual', s=>s.premio_anual], ['Prémio Semestral', s=>s.premio_semestral],
    ['Prémio Trimestral', s=>s.premio_trimestral], ['Capital por Morte', s=>s.capital_morte],
  ].map(([lbl,fn]) => {
    const cells = segs.map((s,i) => {
      const val = fn(s);
      if (!val) return `<td style="text-align:center;color:var(--gray-400)">—</td>`;
      return `<td style="text-align:center;background:${CORES[i].light};padding:7px"><span style="font-size:12px;font-weight:700;color:${CORES[i].primary}">${fmtN(val)} AOA</span></td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid var(--gray-100)"><td style="padding:7px 14px;font-size:13px;font-weight:600;color:var(--gray-700)">${lbl}</td>${cells}</tr>`;
  }).join('');
  const empInfo = empresa.sector
    ? `👷 ${esc(empresa.sector)}${empresa.num_trabalhadores?' · '+empresa.num_trabalhadores+' trabalhadores':''}`
    : 'COBERTURA / PRÉMIO';
  document.getElementById('tabela-at').innerHTML = `
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:var(--gray-800)">
        <th style="padding:10px 14px;font-size:12px;font-weight:600;color:white;text-align:left;width:30%">${empInfo}</th>
        ${labels.map((l,i)=>`<th style="padding:10px 8px;font-size:12px;font-weight:600;color:white;text-align:center;border-left:1px solid rgba(255,255,255,.1)">
          <div style="color:${CORES[i].light}">${esc(l)}</div>
          ${segs[i].plano?`<div style="font-size:10px;color:var(--gray-400);font-weight:400">${esc(segs[i].plano)}</div>`:''}
        </th>`).join('')}
      </tr>
      <tr style="background:#374151"><td colspan="4" style="padding:6px 14px;font-size:11px;font-weight:700;color:var(--gray-300);text-transform:uppercase;letter-spacing:.5px">Coberturas</td></tr>
    </thead>
    <tbody>${cobRows}
      <tr style="background:#374151"><td colspan="4" style="padding:6px 14px;font-size:11px;font-weight:700;color:var(--gray-300);text-transform:uppercase;letter-spacing:.5px">Prémios & Capitais</td></tr>
      ${premioRows}
    </tbody>
  </table>`;
}

function calcScoresAT() {
  const segs  = state.at.segs;
  const anual = segs.map(s => s.premio_anual||0);
  const maxA  = Math.max(...anual.filter(p=>p>0))||1;
  const minA  = Math.min(...anual.filter(p=>p>0))||1;
  const maxC  = Math.max(...segs.map(s=>s.capital_morte||0))||1;
  const totalPeso = COBERTURAS_AT.reduce((a,c)=>a+c.peso,0);
  return segs.map((s,i) => {
    const pesoInc = COBERTURAS_AT.reduce((a,c)=>a+(s.coberturas[c.id]?.incluida?c.peso:0),0);
    const cobScore = pesoInc/totalPeso*45;
    let premioScore = 15;
    if (s.premio_anual>0 && anual.filter(p=>p>0).length>1) premioScore = ((maxA-s.premio_anual)/(maxA-minA||1))*35;
    else if (s.premio_anual>0) premioScore = 20;
    const capScore = s.capital_morte>0 ? Math.min(20,(s.capital_morte/maxC)*20) : 0;
    const total = Math.min(100, Math.round(cobScore+premioScore+capScore));
    return { idx:i, nome:s.nome||`Seguradora ${i+1}`, total,
      dims:{ cobertura:+(pesoInc/totalPeso*10).toFixed(1), premio:+(premioScore/35*10).toFixed(1), capital:+(capScore/20*10).toFixed(1),
             desp_med:s.coberturas['desp_medicas']?.incluida?10:0, reab:s.coberturas['reabilitacao']?.incluida?10:0, inval:s.coberturas['ipp']?.incluida?10:0 } };
  });
}

/* ══════════════════════════════════════════════════════════════
   LIMPAR
══════════════════════════════════════════════════════════════ */
function limpar(segList) {
  if (state.tab==='saude') {
    state.saude.segs = [0,1,2,3].map(()=>newSegSaude());
  } else if (state.tab==='auto') {
    state.auto.segs = [0,1,2,3].map(()=>newSegAuto());
    state.auto.veiculo = {};
  } else if (state.tab==='multi') {
    state.multi.segs = [0,1,2,3].map(()=>newSegMulti());
    state.multi.imovel = {};
  } else {
    state.at.segs = [0,1,2,3].map(()=>newSegAT());
    state.at.empresa = {};
  }
  renderTab(segList);
}

/* ══════════════════════════════════════════════════════════════
   PDF
══════════════════════════════════════════════════════════════ */
function gerarPDF() {
  const btn = document.getElementById('btn-pdf');
  btn.disabled = true; btn.textContent = '⏳ A gerar...';
  const html = state.tab === 'saude' ? buildPDFSaude()
             : state.tab === 'auto'  ? buildPDFAuto()
             : state.tab === 'multi' ? buildPDFMulti()
             : buildPDFAT();
  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(html); w.document.close();
  setTimeout(() => { w.focus(); w.print(); btn.disabled=false; btn.innerHTML='📄 PDF'; }, 600);
}

function pdfStyle() {
  return `<style>
@page{size:A4 landscape;margin:14mm 12mm 14mm 12mm}
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:0;padding:0}
/* cabeçalho */
.pdf-header{display:flex;justify-content:space-between;align-items:center;
  padding:12px 18px;background:linear-gradient(135deg,#1e429f 0%,#1a56db 100%);color:#fff;margin-bottom:12px;
  border-radius:0}
.pdf-header-left{display:flex;align-items:center;gap:14px}
.pdf-logo{width:50px;height:50px;border-radius:8px;overflow:hidden;background:#fff;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:2px}
.pdf-logo img{width:100%;height:100%;object-fit:contain}
.pdf-brand{display:flex;flex-direction:column}
.pdf-brand-name{font-size:18px;font-weight:900;letter-spacing:.5px;color:#fff;line-height:1}
.pdf-brand-sub{font-size:9px;color:#bfdbfe;margin-top:3px;font-weight:400}
.pdf-header-right{text-align:right}
.pdf-contacts{font-size:9px;color:#bfdbfe;line-height:1.9}
.pdf-cliente-block{margin-top:5px;background:rgba(255,255,255,.15);border-radius:5px;
  padding:4px 10px;font-size:10px;color:#fff;font-weight:600}
.pdf-cliente-label{font-size:8px;font-weight:400;color:#bfdbfe;text-transform:uppercase;letter-spacing:.5px;display:block}
/* título do documento */
.pdf-title-bar{padding:0 4px 8px 4px;border-bottom:3px solid #1a56db;margin-bottom:10px;
  display:flex;justify-content:space-between;align-items:flex-end}
.pdf-title-bar h2{font-size:14px;color:#1e429f;margin:0;font-weight:800}
.pdf-title-bar .pdf-date{font-size:9px;color:#6b7280}
h3{font-size:11px;color:#1e429f;margin:12px 0 5px;border-bottom:2px solid #1a56db;padding-bottom:2px;font-weight:700}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
th{background:linear-gradient(135deg,#1e429f,#1a56db);color:white;padding:6px 8px;font-size:10px;text-align:left}
td{border-bottom:1px solid #e5e7eb;padding:4px 8px;font-size:10px}
tr:nth-child(even)td{background:#f0f5ff}
.rec{background:#e8f0fe;border:1px solid #1a56db60;border-radius:6px;padding:10px 14px;margin-top:12px;font-size:10px;
  border-left:4px solid #1a56db}
/* rodapé */
.pdf-footer{margin-top:14px;padding-top:6px;border-top:1px solid #e5e7eb;
  text-align:center;font-size:8px;color:#9ca3af}
@media print{body{padding:0}
  .pdf-header{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  th{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  tr:nth-child(even)td{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .rec{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>`;
}

function pdfHeader(cliente = '') {
  const logoUrl = `${window.location.origin}/static/img/logo.png`;
  const clienteBlock = cliente
    ? `<div class="pdf-cliente-block"><span class="pdf-cliente-label">Cliente</span>${esc(cliente)}</div>`
    : '';
  return `<div class="pdf-header">
  <div class="pdf-header-left">
    <div class="pdf-logo"><img src="${logoUrl}" alt="ELOVITAL" onerror="this.style.display='none';this.parentNode.innerHTML='🛡️'"></div>
    <div class="pdf-brand">
      <span class="pdf-brand-name">ELOVITAL</span>
      <span class="pdf-brand-sub">Mediação de Seguros · SIGMS</span>
    </div>
  </div>
  <div class="pdf-header-right">
    <div class="pdf-contacts">
      <div>✉ cotacao@elovital-ao.com</div>
      <div>☎ +244 929 494 085</div>
    </div>
    ${clienteBlock}
  </div>
</div>`;
}

function pdfFooter() {
  return `<div class="pdf-footer">ELOVITAL — Mediação de Seguros · cotacao@elovital-ao.com · +244 929 494 085 · Documento gerado em ${new Date().toLocaleDateString('pt-AO')} às ${new Date().toLocaleTimeString('pt-AO',{hour:'2-digit',minute:'2-digit'})}</div>`;
}

function buildPDFSaude() {
  const segs   = state.saude.segs;
  const scores = calcScoresSaude();
  const sorted = [...scores].sort((a,b)=>b.total-a.total);
  const rows   = COBERTURAS_SAUDE.map(c => {
    const cells = segs.map((s,i) => {
      const cob = s.coberturas[c.id];
      if (!cob.incluida) return `<td style="text-align:center;color:#9ca3af">—</td>`;
      return `<td style="text-align:center;background:${CORES[i].light}">✓ <small style="color:${CORES[i].primary}">${cob.copag||'0'}%</small>${cob.limite?`<br><small>${esc(cob.limite)}</small>`:''}`;
    }).join('');
    return `<tr><td>${c.icon} ${c.label}</td>${cells}</tr>`;
  }).join('');
  const clienteSaude = state.saude.cliente || '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comparativo Saúde — ELOVITAL</title>${pdfStyle()}</head><body>
  ${pdfHeader(clienteSaude)}
  <div class="pdf-title-bar">
    <h2>📊 Mapa Comparativo — Seguro de Saúde</h2>
    <span class="pdf-date">Emitido em ${new Date().toLocaleDateString('pt-AO')}</span>
  </div>
  <h3>Coberturas</h3>
  <table><thead><tr><th>COBERTURA</th>${segs.map((s,i)=>`<th style="background:${CORES[i].primary}">${esc(s.nome||`Seg. ${i+1}`)}${s.plano?` · ${esc(s.plano)}`:''}</th>`).join('')}</tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td style="font-weight:700">Prémio Anual (AOA)</td>${segs.map(s=>`<td style="font-weight:700;text-align:center">${s.premio?fmtN(s.premio):'—'}</td>`).join('')}</tr></tfoot></table>
  <h3>Avaliação IA</h3>
  <table><thead><tr><th>Seguradora</th><th style="text-align:center">Cobertura</th><th style="text-align:center">Co-Pag.</th><th style="text-align:center">Prémio</th><th style="text-align:center">Score</th></tr></thead>
  <tbody>${scores.map((sc,i)=>{const r=sorted.findIndex(s=>s.idx===i);return`<tr><td>${MEDAL[r]} <strong>${esc(sc.nome)}</strong></td><td style="text-align:center">${sc.dims.cobertura}/10</td><td style="text-align:center">${sc.dims.copagamento}/10</td><td style="text-align:center">${sc.dims.premio}/10</td><td style="text-align:center;font-weight:800;color:${CORES[i].primary}">${sc.total}/100</td></tr>`;}).join('')}</tbody></table>
  <div class="rec">🏆 <strong>Recomendação IA:</strong> <strong>${esc(sorted[0].nome)}</strong> — Score <strong>${sorted[0].total}/100</strong>.</div>
  ${pdfFooter()}
  </body></html>`;
}

function buildPDFAuto() {
  const segs  = state.auto.segs;
  const veic  = state.auto.veiculo;
  const scores= calcScoresAuto();
  const sorted= [...scores].sort((a,b)=>b.total-a.total);
  const cobRows = COBERTURAS_AUTO.map(c => {
    const cells = segs.map((s,i) => {
      const inc = s.coberturas[c.id]?.incluida;
      return `<td style="text-align:center;${inc?`background:${CORES[i].light}`:'color:#9ca3af'}">${inc?'✓':'—'}</td>`;
    }).join('');
    return `<tr><td>${c.icon} ${c.label}</td>${cells}</tr>`;
  }).join('');
  const premRows = [['Prémio Anual',s=>s.premio_anual],['Prémio Semestral',s=>s.premio_semestral],['Prémio Trimestral',s=>s.premio_trimestral],['Franquia',s=>s.franquia]].map(([l,fn])=>{
    const cells = segs.map(s=>`<td style="text-align:center;font-weight:600">${fn(s)?fmtN(fn(s))+' AOA':'—'}</td>`).join('');
    return `<tr><td style="font-weight:700">${l}</td>${cells}</tr>`;
  }).join('');
  const veicInfo = [veic.tipo_cobertura, veic.marca, veic.modelo, veic.ano].filter(Boolean).join(' · ');
  const clienteAuto = state.auto.cliente || '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comparativo Automóvel — ELOVITAL</title>${pdfStyle()}</head><body>
  ${pdfHeader(clienteAuto)}
  <div class="pdf-title-bar">
    <div>
      <h2>🚗 Mapa Comparativo — Seguro Automóvel</h2>
      ${veicInfo?`<div style="font-size:9px;color:#6b7280;margin-top:2px">${veicInfo}${veic.valor_veiculo?' · Valor: '+fmtN(veic.valor_veiculo)+' AOA':''}</div>`:''}
    </div>
    <span class="pdf-date">Emitido em ${new Date().toLocaleDateString('pt-AO')}</span>
  </div>
  <h3>Coberturas & Prémios</h3>
  <table><thead><tr><th>COBERTURA / PRÉMIO</th>${segs.map((s,i)=>`<th style="background:${CORES[i].primary}">${esc(s.nome||`Seg. ${i+1}`)}${s.plano?` · ${esc(s.plano)}`:''}</th>`).join('')}</tr></thead>
  <tbody>${cobRows}${premRows}</tbody></table>
  <h3>Avaliação IA</h3>
  <table><thead><tr><th>Seguradora</th><th style="text-align:center">Cobertura</th><th style="text-align:center">Prémio</th><th style="text-align:center">Franquia</th><th style="text-align:center">Score</th></tr></thead>
  <tbody>${scores.map((sc,i)=>{const r=sorted.findIndex(s=>s.idx===i);return`<tr><td>${MEDAL[r]} <strong>${esc(sc.nome)}</strong></td><td style="text-align:center">${sc.dims.cobertura}/10</td><td style="text-align:center">${sc.dims.premio}/10</td><td style="text-align:center">${sc.dims.franquia}/10</td><td style="text-align:center;font-weight:800;color:${CORES[i].primary}">${sc.total}/100</td></tr>`;}).join('')}</tbody></table>
  <div class="rec">🏆 <strong>Recomendação IA:</strong> <strong>${esc(sorted[0].nome)}</strong> — Score <strong>${sorted[0].total}/100</strong>.</div>
  ${pdfFooter()}
  </body></html>`;
}

function buildPDFMulti() {
  const segs   = state.multi.segs;
  const imovel = state.multi.imovel;
  const scores = calcScoresMulti();
  const sorted = [...scores].sort((a,b)=>b.total-a.total);
  const cobRows = COBERTURAS_MULTI.map(c => {
    const cells = segs.map((s,i) => {
      const inc = s.coberturas[c.id]?.incluida;
      return `<td style="text-align:center;${inc?`background:${CORES[i].light}`:'color:#9ca3af'}">${inc?'✓':'—'}</td>`;
    }).join('');
    return `<tr><td>${c.icon} ${c.label}${c.obrig?' <small style="color:#dc2626">*</small>':''}</td>${cells}</tr>`;
  }).join('');
  const premRows = [['Prémio Anual',s=>s.premio_anual],['Prémio Semestral',s=>s.premio_semestral],['Prémio Trimestral',s=>s.premio_trimestral],['Franquia',s=>s.franquia]].map(([l,fn])=>{
    const cells = segs.map(s=>`<td style="text-align:center;font-weight:600">${fn(s)?fmtN(fn(s))+' AOA':'—'}</td>`).join('');
    return `<tr><td style="font-weight:700">${l}</td>${cells}</tr>`;
  }).join('');
  const imovelInfo = [imovel.tipo, imovel.localizacao, imovel.area?imovel.area+'m²':''].filter(Boolean).join(' · ');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comparativo Multirisco — ELOVITAL</title>${pdfStyle()}</head><body>
  ${pdfHeader(state.multi.cliente)}
  <div class="pdf-title-bar">
    <div>
      <h2>🏠 Mapa Comparativo — Seguro Multirisco</h2>
      ${imovelInfo?`<div style="font-size:9px;color:#6b7280;margin-top:2px">${esc(imovelInfo)}${imovel.valor_imovel?' · Imóvel: '+fmtN(imovel.valor_imovel)+' AOA':''}</div>`:''}
    </div>
    <span class="pdf-date">Emitido em ${new Date().toLocaleDateString('pt-AO')}</span>
  </div>
  <h3>Coberturas & Prémios</h3>
  <table><thead><tr><th>COBERTURA / PRÉMIO</th>${segs.map((s,i)=>`<th style="background:${CORES[i].primary}">${esc(s.nome||`Seg. ${i+1}`)}${s.plano?` · ${esc(s.plano)}`:''}</th>`).join('')}</tr></thead>
  <tbody>${cobRows}${premRows}</tbody></table>
  <h3>Avaliação IA</h3>
  <table><thead><tr><th>Seguradora</th><th style="text-align:center">Cobertura</th><th style="text-align:center">Prémio</th><th style="text-align:center">Franquia</th><th style="text-align:center">Score</th></tr></thead>
  <tbody>${scores.map((sc,i)=>{const r=sorted.findIndex(s=>s.idx===i);return`<tr><td>${MEDAL[r]} <strong>${esc(sc.nome)}</strong></td><td style="text-align:center">${sc.dims.cobertura}/10</td><td style="text-align:center">${sc.dims.premio}/10</td><td style="text-align:center">${sc.dims.franquia}/10</td><td style="text-align:center;font-weight:800;color:${CORES[i].primary}">${sc.total}/100</td></tr>`;}).join('')}</tbody></table>
  <div class="rec">🏆 <strong>Recomendação IA:</strong> <strong>${esc(sorted[0].nome)}</strong> — Score <strong>${sorted[0].total}/100</strong>.</div>
  ${pdfFooter()}
  </body></html>`;
}

function buildPDFAT() {
  const segs   = state.at.segs;
  const emp    = state.at.empresa;
  const scores = calcScoresAT();
  const sorted = [...scores].sort((a,b)=>b.total-a.total);
  const cobRows = COBERTURAS_AT.map(c => {
    const cells = segs.map((s,i) => {
      const inc = s.coberturas[c.id]?.incluida;
      return `<td style="text-align:center;${inc?`background:${CORES[i].light}`:'color:#9ca3af'}">${inc?'✓':'—'}</td>`;
    }).join('');
    return `<tr><td>${c.icon} ${c.label}${c.obrig?' <small style="color:#dc2626">*</small>':''}</td>${cells}</tr>`;
  }).join('');
  const premRows = [['Prémio Anual',s=>s.premio_anual],['Prémio Semestral',s=>s.premio_semestral],['Prémio Trimestral',s=>s.premio_trimestral],['Capital Morte/Invalidez',s=>s.capital_morte]].map(([l,fn])=>{
    const cells = segs.map(s=>`<td style="text-align:center;font-weight:600">${fn(s)?fmtN(fn(s))+' AOA':'—'}</td>`).join('');
    return `<tr><td style="font-weight:700">${l}</td>${cells}</tr>`;
  }).join('');
  const empInfo = [emp.sector, emp.num_trabalhadores?emp.num_trabalhadores+' trabalhadores':''].filter(Boolean).join(' · ');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comparativo Acidente de Trabalho — ELOVITAL</title>${pdfStyle()}</head><body>
  ${pdfHeader(state.at.cliente)}
  <div class="pdf-title-bar">
    <div>
      <h2>👷 Mapa Comparativo — Seguro de Acidente de Trabalho</h2>
      ${empInfo?`<div style="font-size:9px;color:#6b7280;margin-top:2px">${esc(empInfo)}${emp.capital_por_trabalhador?' · Capital/Trab: '+fmtN(emp.capital_por_trabalhador)+' AOA':''}</div>`:''}
    </div>
    <span class="pdf-date">Emitido em ${new Date().toLocaleDateString('pt-AO')}</span>
  </div>
  <h3>Coberturas & Prémios</h3>
  <table><thead><tr><th>COBERTURA / PRÉMIO</th>${segs.map((s,i)=>`<th style="background:${CORES[i].primary}">${esc(s.nome||`Seg. ${i+1}`)}${s.plano?` · ${esc(s.plano)}`:''}</th>`).join('')}</tr></thead>
  <tbody>${cobRows}${premRows}</tbody></table>
  <h3>Avaliação IA</h3>
  <table><thead><tr><th>Seguradora</th><th style="text-align:center">Cobertura</th><th style="text-align:center">Prémio</th><th style="text-align:center">Capital</th><th style="text-align:center">Score</th></tr></thead>
  <tbody>${scores.map((sc,i)=>{const r=sorted.findIndex(s=>s.idx===i);return`<tr><td>${MEDAL[r]} <strong>${esc(sc.nome)}</strong></td><td style="text-align:center">${sc.dims.cobertura}/10</td><td style="text-align:center">${sc.dims.premio}/10</td><td style="text-align:center">${sc.dims.capital}/10</td><td style="text-align:center;font-weight:800;color:${CORES[i].primary}">${sc.total}/100</td></tr>`;}).join('')}</tbody></table>
  <div class="rec">🏆 <strong>Recomendação IA:</strong> <strong>${esc(sorted[0].nome)}</strong> — Score <strong>${sorted[0].total}/100</strong>.</div>
  ${pdfFooter()}
  </body></html>`;
}

/* ══════════════════════════════════════════════════════════════
   EMAIL
══════════════════════════════════════════════════════════════ */
async function enviarEmail() {
  const email = document.getElementById('email-dest').value.trim();
  const msg   = document.getElementById('email-msg').value.trim();
  if (!email) { alert('Insira um endereço de email válido.'); return; }
  const btn = document.getElementById('modal-send');
  btn.disabled=true; btn.textContent='⏳ A enviar...';
  try {
    const tab = state.tab;
    let html, tipo, segs, cliente, veiculo_info = '';
    if (tab === 'saude') {
      html    = buildPDFSaude();
      tipo    = 'Seguro de Saúde';
      segs    = state.saude.segs.map((s,i)=>({ nome: s.nome||`Seguradora ${i+1}`, plano: s.plano, premio: s.premio||0 }));
      cliente = state.saude.cliente;
    } else if (tab === 'auto') {
      html    = buildPDFAuto();
      tipo    = 'Seguro Automóvel';
      segs    = state.auto.segs.map((s,i)=>({ nome: s.nome||`Seguradora ${i+1}`, plano: s.plano, premio: s.premio_anual||0 }));
      cliente = state.auto.cliente;
      const v = state.auto.veiculo;
      veiculo_info = [v.tipo_cobertura, v.marca, v.modelo, v.ano].filter(Boolean).join(' ');
    } else if (tab === 'multi') {
      html    = buildPDFMulti();
      tipo    = 'Seguro Multirisco';
      segs    = state.multi.segs.map((s,i)=>({ nome: s.nome||`Seguradora ${i+1}`, plano: s.plano, premio: s.premio_anual||0 }));
      cliente = state.multi.cliente;
      const im = state.multi.imovel;
      veiculo_info = [im.tipo, im.localizacao].filter(Boolean).join(' · ');
    } else {
      html    = buildPDFAT();
      tipo    = 'Acidente de Trabalho';
      segs    = state.at.segs.map((s,i)=>({ nome: s.nome||`Seguradora ${i+1}`, plano: s.plano, premio: s.premio_anual||0 }));
      cliente = state.at.cliente;
      const em = state.at.empresa;
      veiculo_info = [em.sector, em.num_trabalhadores?em.num_trabalhadores+' trab.':''].filter(Boolean).join(' · ');
    }
    const resp = await post('/cotacoes/enviar-email', {
      email, mensagem: msg, html_content: html, seguradoras: segs,
      tipo: tab,
      cliente_nome: cliente,
      veiculo_info,
    });
    document.getElementById('modal-email').style.display='none';
    if (resp && resp.email_enviado === false) {
      showToast(`⚠️ Cotação ${resp.numero} registada, mas o email não foi enviado (verifique o SMTP)`, 'danger');
    } else {
      showToast(`✅ Email enviado e cotação registada — ${tipo}`, 'success');
    }
  } catch(e) { showToast('Erro ao enviar: '+e.message,'danger'); }
  finally { btn.disabled=false; btn.textContent='📤 Enviar'; }
}

/* ══════════════════════════════════════════════════════════════
   HISTÓRICO DE COTAÇÕES
══════════════════════════════════════════════════════════════ */
const ESTADO_CORES = {
  'Enviada':       { bg:'#e8f0fe', color:'#1a56db', dot:'#1a56db' },
  'Visualizada':   { bg:'#e0f2fe', color:'#0369a1', dot:'#0369a1' },
  'Interessado':   { bg:'#fef9c3', color:'#854d0e', dot:'#ca8a04' },
  'Em Negociação': { bg:'#fff7ed', color:'#9a3412', dot:'#f97316' },
  'Convertido':    { bg:'#dcfce7', color:'#166534', dot:'#16a34a' },
  'Perdido':       { bg:'#fee2e2', color:'#991b1b', dot:'#dc2626' },
};

function estadoBadgeH(estado) {
  const c = ESTADO_CORES[estado] || { bg:'#f3f4f6', color:'#374151', dot:'#9ca3af' };
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600;background:${c.bg};color:${c.color}">
    <span style="width:6px;height:6px;border-radius:50%;background:${c.dot};flex-shrink:0"></span>${estado}</span>`;
}

async function renderHistorico() {
  const el = document.getElementById('cot-tab-content');
  el.innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <div class="card-header" style="flex-wrap:wrap;gap:8px">
      <span class="card-title">📋 Histórico de Cotações Enviadas</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-left:auto">
        <input type="text" id="hist-search" class="form-control" placeholder="🔍 Cliente, email ou nº..." style="max-width:220px;font-size:13px">
        <select id="hist-tipo" class="form-control" style="max-width:150px;font-size:13px">
          <option value="">Todos os tipos</option>
          <option value="saude">🏥 Saúde</option>
          <option value="auto">🚗 Automóvel</option>
        </select>
        <select id="hist-estado" class="form-control" style="max-width:170px;font-size:13px">
          <option value="">Todos os estados</option>
          ${Object.keys(ESTADO_CORES).map(e=>`<option value="${e}">${e}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" id="hist-refresh" style="font-size:13px">🔄 Actualizar</button>
      </div>
    </div>
    <!-- Stats -->
    <div id="hist-stats" style="display:flex;gap:12px;padding:12px 16px;background:#f8fafc;border-bottom:1px solid var(--gray-200);flex-wrap:wrap"></div>
    <!-- Tabela -->
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse" id="hist-table">
      <thead><tr style="background:#1f2937;color:white">
        <th style="padding:9px 12px;font-size:11px;text-align:left">Nº</th>
        <th style="padding:9px 12px;font-size:11px;text-align:left">Data</th>
        <th style="padding:9px 12px;font-size:11px;text-align:left">Cliente</th>
        <th style="padding:9px 12px;font-size:11px;text-align:left">Email</th>
        <th style="padding:9px 12px;font-size:11px;text-align:left">Tipo</th>
        <th style="padding:9px 12px;font-size:11px;text-align:left">Seguradoras</th>
        <th style="padding:9px 12px;font-size:11px;text-align:left">Estado</th>
        <th style="padding:9px 12px;font-size:11px;text-align:left">Próx. Contacto</th>
        <th style="padding:9px 12px;font-size:11px;text-align:center">Ações</th>
      </tr></thead>
      <tbody id="hist-body"><tr><td colspan="9" style="text-align:center;padding:32px;color:var(--gray-400)">
        <div class="spinner" style="margin:0 auto 8px"></div>A carregar...
      </td></tr></tbody>
    </table></div>
  </div>

  <!-- Modal edição -->
  <div id="hist-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999;align-items:center;justify-content:center">
    <div style="background:white;border-radius:12px;padding:28px;width:100%;max-width:480px;box-shadow:var(--shadow-lg)">
      <h3 style="margin:0 0 20px;font-size:16px">✏️ Editar Cotação <span id="hm-numero" style="color:var(--primary)"></span></h3>
      <input type="hidden" id="hm-id">
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px">NOME DO CLIENTE</label>
        <input type="text" id="hm-cliente" class="form-control" placeholder="Nome do cliente">
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px">ESTADO</label>
        <select id="hm-estado" class="form-control">
          ${Object.keys(ESTADO_CORES).map(e=>`<option value="${e}">${e}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px">PRÓXIMO CONTACTO</label>
        <input type="date" id="hm-prox" class="form-control">
      </div>
      <div style="margin-bottom:20px">
        <label style="font-size:12px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px">NOTAS</label>
        <textarea id="hm-notas" class="form-control" rows="3" style="resize:none"></textarea>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="hm-cancel" class="btn btn-secondary">Cancelar</button>
        <button id="hm-save" class="btn btn-primary">💾 Guardar</button>
      </div>
    </div>
  </div>`;

  await carregarHistorico();
  document.getElementById('hist-search').addEventListener('input', debounce(carregarHistorico, 400));
  document.getElementById('hist-tipo').addEventListener('change', carregarHistorico);
  document.getElementById('hist-estado').addEventListener('change', carregarHistorico);
  document.getElementById('hist-refresh').addEventListener('click', carregarHistorico);
  document.getElementById('hm-cancel').addEventListener('click', () => { document.getElementById('hist-modal').style.display='none'; });
  document.getElementById('hm-save').addEventListener('click', guardarEdicao);
}

async function carregarHistorico() {
  const search = document.getElementById('hist-search')?.value?.trim() || '';
  const tipo   = document.getElementById('hist-tipo')?.value || '';
  const estado = document.getElementById('hist-estado')?.value || '';
  const tbody  = document.getElementById('hist-body');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--gray-400)"><div class="spinner" style="margin:0 auto 8px"></div></td></tr>`;

  try {
    let url = '/cotacoes/historico?limit=100';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (tipo)   url += `&tipo=${encodeURIComponent(tipo)}`;
    if (estado) url += `&estado=${encodeURIComponent(estado)}`;
    const rows = await get(url);

    // Stats
    const stats = await get('/cotacoes/historico/stats');
    const statsEl = document.getElementById('hist-stats');
    if (statsEl) {
      const total = Object.values(stats).reduce((a,b)=>a+b,0);
      statsEl.innerHTML = [
        ['Total', total, '#1f2937'],
        ...Object.entries(ESTADO_CORES).map(([k,c])=>[k, stats[k]||0, c.dot])
      ].map(([lbl,n,cor])=>`
        <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:white;border-radius:8px;border:1px solid var(--gray-200)">
          <span style="width:8px;height:8px;border-radius:50%;background:${cor};flex-shrink:0"></span>
          <span style="font-size:11px;color:var(--gray-600)">${lbl}</span>
          <span style="font-size:14px;font-weight:700;color:var(--gray-900)">${n}</span>
        </div>`).join('');
    }

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--gray-400)">Nenhuma cotação encontrada.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const segs = (r.seguradoras||[]).filter(Boolean).join(' · ') || '—';
      const data = r.created_at ? r.created_at.slice(0,10).split('-').reverse().join('/') : '—';
      const tipoLabel = r.tipo === 'saude' ? '🏥 Saúde' : r.tipo === 'auto' ? '🚗 Auto' : r.tipo === 'multi' ? '🏠 Multirisco' : '👷 Ac. Trabalho';
      const tipo = `<span style="font-size:11px">${tipoLabel}</span>`;
      return `<tr style="border-bottom:1px solid var(--gray-100)" data-id="${r.id}">
        <td style="padding:8px 12px;font-size:12px;font-weight:600;color:var(--primary)">${esc(r.numero)}</td>
        <td style="padding:8px 12px;font-size:12px">${data}</td>
        <td style="padding:8px 12px;font-size:12px;font-weight:500">${esc(r.cliente_nome||'—')}</td>
        <td style="padding:8px 12px;font-size:12px;color:var(--gray-500)">${esc(r.email_destino)}</td>
        <td style="padding:8px 12px">${tipo}</td>
        <td style="padding:8px 12px;font-size:11px;color:var(--gray-600);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(segs)}">${esc(segs)}</td>
        <td style="padding:8px 12px">${estadoBadgeH(r.estado)}</td>
        <td style="padding:8px 12px;font-size:12px;color:var(--gray-500)">${r.proximo_contacto||'—'}</td>
        <td style="padding:8px 12px;text-align:center">
          <button class="btn btn-secondary hist-edit" data-row='${JSON.stringify(r).replace(/'/g,"&#39;")}' style="font-size:11px;padding:4px 8px;margin-right:4px">✏️</button>
          <button class="btn hist-del" data-id="${r.id}" style="font-size:11px;padding:4px 8px;background:#fee2e2;color:#991b1b;border-color:#fca5a5">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    // Bind acções
    document.querySelectorAll('.hist-edit').forEach(btn => {
      btn.addEventListener('click', () => abrirEdicao(JSON.parse(btn.dataset.row)));
    });
    document.querySelectorAll('.hist-del').forEach(btn => {
      btn.addEventListener('click', () => eliminarCotacao(+btn.dataset.id));
    });
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:#dc2626">Erro: ${esc(e.message)}</td></tr>`;
  }
}

function abrirEdicao(row) {
  document.getElementById('hm-id').value      = row.id;
  document.getElementById('hm-numero').textContent = row.numero;
  document.getElementById('hm-cliente').value = row.cliente_nome || '';
  document.getElementById('hm-estado').value  = row.estado || 'Enviada';
  document.getElementById('hm-prox').value    = row.proximo_contacto || '';
  document.getElementById('hm-notas').value   = row.notas || '';
  document.getElementById('hist-modal').style.display = 'flex';
}

async function guardarEdicao() {
  const id     = +document.getElementById('hm-id').value;
  const btn    = document.getElementById('hm-save');
  btn.disabled = true; btn.textContent = '⏳ A guardar...';
  try {
    await put(`/cotacoes/historico/${id}`, {
      estado:           document.getElementById('hm-estado').value,
      notas:            document.getElementById('hm-notas').value,
      proximo_contacto: document.getElementById('hm-prox').value,
      cliente_nome:     document.getElementById('hm-cliente').value,
    });
    document.getElementById('hist-modal').style.display = 'none';
    showToast('Cotação actualizada', 'success');
    await carregarHistorico();
  } catch(e) { showToast('Erro: '+e.message,'danger'); }
  finally { btn.disabled=false; btn.textContent='💾 Guardar'; }
}

async function eliminarCotacao(id) {
  if (!confirm('Eliminar esta cotação do histórico?')) return;
  try {
    await del(`/cotacoes/historico/${id}`);
    showToast('Cotação eliminada', 'success');
    await carregarHistorico();
  } catch(e) { showToast('Erro: '+e.message,'danger'); }
}

function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
}

/* ══════════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════════ */
const v   = id => document.getElementById(id)?.value?.trim() || '';
const chk = id => document.getElementById(id)?.checked || false;
const esc = s  => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmtN = n => Number(n).toLocaleString('pt-AO');
function showToast(msg, type='success') {
  const tc = document.getElementById('toast-container');
  if (!tc) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`; t.textContent = msg;
  tc.appendChild(t); setTimeout(()=>t.remove(), 4000);
}
