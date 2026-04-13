/* SIGMS — Mapa Comparativo de Cotações (Saúde + Automóvel) */
import { get, post } from './api.js';

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
];
const MEDAL = ['🥇', '🥈', '🥉'];
const TIPOS_COBERTURA_AUTO = ['RC Obrigatória', 'RC + Danos Próprios', 'Todos os Riscos', 'RC + Furto/Incêndio'];

/* ═══════════════════════════ ESTADO ═══════════════════════════ */
let state = {
  tab: 'saude',   // 'saude' | 'auto'
  saude: { segs: [], radarChart: null },
  auto:  { segs: [], radarChart: null, veiculo: {} },
};

/* ═══════════════════════════ ENTRY POINT ═══════════════════════════ */
export async function renderCotacoes(container) {
  let segList = [];
  try { segList = (await get('/apolices/lookup/seguradoras')).map(s => s.nome); } catch {}

  state.saude.segs = [0,1,2].map(() => newSegSaude());
  state.auto.segs  = [0,1,2].map(() => newSegAuto());
  state.auto.veiculo = { tipo_cobertura: '', marca: '', modelo: '', ano: '', valor: '' };
  state.saude.radarChart = null;
  state.auto.radarChart  = null;

  container.innerHTML = buildRoot();
  bindTabEvents(segList);
  renderTab(segList);
}

function newSegSaude() {
  return { nome: '', plano: '', premio: '',
    coberturas: Object.fromEntries(COBERTURAS_SAUDE.map(c => [c.id, { incluida: false, copag: '', limite: '' }])) };
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
      <p style="font-size:13px;color:var(--gray-500);margin:0">Compare 3 seguradoras · Avaliação inteligente de custo-benefício</p>
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
  } else {
    el.innerHTML = buildAutoLayout(segList);
    bindAutoEvents(segList);
    updateAuto();
  }
}

/* ══════════════════════════════════════════════════════════════
   SAÚDE
══════════════════════════════════════════════════════════════ */
function buildSaudeLayout(segList) {
  return `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px" id="seg-cards-saude">
    ${[0,1,2].map(i => buildSegCardSaude(i, segList)).join('')}
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
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Plano</label>
        <input type="text" class="form-control" id="s-plano-${i}" placeholder="Plano" style="font-size:13px"></div>
      <div><label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;display:block;margin-bottom:3px">Prémio Anual (AOA)</label>
        <input type="number" class="form-control" id="s-premio-${i}" placeholder="0" style="font-size:13px"></div>
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
  [0,1,2].forEach(i => {
    ['nome','plano','premio'].forEach(f => document.getElementById(`s-${f}-${i}`)?.addEventListener('input', () => { readSegSaude(i); updateSaude(); }));
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
  s.nome   = v(`s-nome-${i}`);
  s.plano  = v(`s-plano-${i}`);
  s.premio = parseFloat(v(`s-premio-${i}`)) || 0;
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
  document.getElementById('tabela-saude').innerHTML = buildTableHtml(labels, segs, rows, premios, 'Prémio Anual');
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
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px" id="seg-cards-auto">
    ${[0,1,2].map(i => buildSegCardAuto(i, segList)).join('')}
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
  ['a-tipo-cob','a-marca','a-modelo','a-ano','a-valor'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => { readVeiculo(); updateAuto(); });
  });
  [0,1,2].forEach(i => {
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
function buildTableHtml(labels, segs, rows, extraRow, extraLabel) {
  return `
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:var(--gray-800)">
        <th style="padding:12px 14px;font-size:12px;font-weight:600;color:white;text-align:left;width:30%">COBERTURA</th>
        ${labels.map((l,i)=>`<th style="padding:12px 8px;font-size:12px;font-weight:600;color:white;text-align:center;width:23%;border-left:1px solid rgba(255,255,255,.1)">
          <div style="color:${CORES[i].light}">${esc(l)}</div>
          ${segs[i].plano?`<div style="font-size:10px;color:var(--gray-400);font-weight:400">${esc(segs[i].plano)}</div>`:''}
        </th>`).join('')}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot><tr style="background:var(--gray-100)">
      <td style="padding:9px 14px;font-size:12px;font-weight:700;color:var(--gray-700);text-transform:uppercase">${extraLabel}</td>${extraRow}
    </tr></tfoot>
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
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:11px">
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
   LIMPAR
══════════════════════════════════════════════════════════════ */
function limpar(segList) {
  if (state.tab==='saude') {
    state.saude.segs = [0,1,2].map(()=>newSegSaude());
  } else {
    state.auto.segs = [0,1,2].map(()=>newSegAuto());
    state.auto.veiculo = {};
  }
  renderTab(segList);
}

/* ══════════════════════════════════════════════════════════════
   PDF
══════════════════════════════════════════════════════════════ */
function gerarPDF() {
  const btn = document.getElementById('btn-pdf');
  btn.disabled = true; btn.textContent = '⏳ A gerar...';
  const html = state.tab === 'saude' ? buildPDFSaude() : buildPDFAuto();
  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(html); w.document.close();
  setTimeout(() => { w.focus(); w.print(); btn.disabled=false; btn.innerHTML='📄 PDF'; }, 600);
}

function pdfStyle() {
  return `<style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0;padding:18px}
h2{font-size:16px;color:#1a56db;margin:0}h3{font-size:13px;color:#374151;margin:14px 0 6px;border-bottom:2px solid #1a56db;padding-bottom:3px}
table{width:100%;border-collapse:collapse;margin-bottom:14px}th{background:#1f2937;color:white;padding:7px 10px;font-size:11px;text-align:left}
td{border-bottom:1px solid #e5e7eb;padding:5px 10px;font-size:11px}tr:nth-child(even)td{background:#f9fafb}
.rec{background:#eff6ff;border:1px solid #1a56db40;border-radius:8px;padding:12px 16px;margin-top:14px}
@media print{@page{margin:12mm}body{padding:0}}</style>`;
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
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comparativo Saúde</title>${pdfStyle()}</head><body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:3px solid #1a56db">
    <div><h2>📊 Mapa Comparativo — Seguro de Saúde</h2>
    <p style="margin:3px 0 0;font-size:11px;color:#6b7280">SIGMS ELOVITAL · ${new Date().toLocaleDateString('pt-AO')}</p></div>
  </div>
  <h3>Coberturas</h3>
  <table><thead><tr><th>COBERTURA</th>${segs.map((s,i)=>`<th style="background:${CORES[i].primary}">${esc(s.nome||`Seg. ${i+1}`)}${s.plano?` · ${esc(s.plano)}`:''}</th>`).join('')}</tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td style="font-weight:700">Prémio Anual (AOA)</td>${segs.map(s=>`<td style="font-weight:700;text-align:center">${s.premio?fmtN(s.premio):'—'}</td>`).join('')}</tr></tfoot></table>
  <h3>Avaliação IA</h3>
  <table><thead><tr><th>Seguradora</th><th style="text-align:center">Cobertura</th><th style="text-align:center">Co-Pag.</th><th style="text-align:center">Prémio</th><th style="text-align:center">Score</th></tr></thead>
  <tbody>${scores.map((sc,i)=>{const r=sorted.findIndex(s=>s.idx===i);return`<tr><td>${MEDAL[r]} <strong>${esc(sc.nome)}</strong></td><td style="text-align:center">${sc.dims.cobertura}/10</td><td style="text-align:center">${sc.dims.copagamento}/10</td><td style="text-align:center">${sc.dims.premio}/10</td><td style="text-align:center;font-weight:800;color:${CORES[i].primary}">${sc.total}/100</td></tr>`;}).join('')}</tbody></table>
  <div class="rec">🏆 <strong>Recomendação IA:</strong> <strong>${esc(sorted[0].nome)}</strong> — Score <strong>${sorted[0].total}/100</strong>.</div>
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
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comparativo Automóvel</title>${pdfStyle()}</head><body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:3px solid #1a56db">
    <div><h2>🚗 Mapa Comparativo — Seguro Automóvel</h2>
    <p style="margin:3px 0 0;font-size:11px;color:#6b7280">${veic.tipo_cobertura||''}${veic.marca?' · '+veic.marca:''} ${veic.modelo||''} ${veic.ano||''} · SIGMS ELOVITAL · ${new Date().toLocaleDateString('pt-AO')}</p></div>
  </div>
  <h3>Coberturas & Prémios</h3>
  <table><thead><tr><th>COBERTURA / PRÉMIO</th>${segs.map((s,i)=>`<th style="background:${CORES[i].primary}">${esc(s.nome||`Seg. ${i+1}`)}${s.plano?` · ${esc(s.plano)}`:''}</th>`).join('')}</tr></thead>
  <tbody>${cobRows}${premRows}</tbody></table>
  <h3>Avaliação IA</h3>
  <table><thead><tr><th>Seguradora</th><th style="text-align:center">Cobertura</th><th style="text-align:center">Prémio</th><th style="text-align:center">Franquia</th><th style="text-align:center">Score</th></tr></thead>
  <tbody>${scores.map((sc,i)=>{const r=sorted.findIndex(s=>s.idx===i);return`<tr><td>${MEDAL[r]} <strong>${esc(sc.nome)}</strong></td><td style="text-align:center">${sc.dims.cobertura}/10</td><td style="text-align:center">${sc.dims.premio}/10</td><td style="text-align:center">${sc.dims.franquia}/10</td><td style="text-align:center;font-weight:800;color:${CORES[i].primary}">${sc.total}/100</td></tr>`;}).join('')}</tbody></table>
  <div class="rec">🏆 <strong>Recomendação IA:</strong> <strong>${esc(sorted[0].nome)}</strong> — Score <strong>${sorted[0].total}/100</strong>.</div>
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
    const html = state.tab==='saude' ? buildPDFSaude() : buildPDFAuto();
    const tipo = state.tab==='saude' ? 'Seguro de Saúde' : 'Seguro Automóvel';
    await post('/cotacoes/enviar-email', { email, mensagem: msg, html_content: html,
      seguradoras: (state.tab==='saude'?state.saude.segs:state.auto.segs).map((s,i)=>({ nome:s.nome||`Seguradora ${i+1}`, plano:s.plano, premio:s.premio_anual||s.premio||0 })) });
    document.getElementById('modal-email').style.display='none';
    showToast(`Email enviado — ${tipo}`, 'success');
  } catch(e) { showToast('Erro ao enviar: '+e.message,'danger'); }
  finally { btn.disabled=false; btn.textContent='📤 Enviar'; }
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
