/* SIGMS — Mapa Comparativo de Cotações (Seguro de Saúde) */
import { get, post } from './api.js';

const COBERTURAS = [
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

const CORES = [
  { primary: '#1a56db', light: '#e8f0fe', name: 'blue'   },
  { primary: '#057a55', light: '#def7ec', name: 'green'  },
  { primary: '#7e3af2', light: '#ede9fe', name: 'purple' },
];

const MEDAL = ['🥇', '🥈', '🥉'];

let state = {
  seguradoras: [],
  radarChart: null,
};

/* ─────────────────────────── ENTRY POINT ─────────────────────────── */
export async function renderCotacoes(container) {
  let segList = [];
  try { segList = (await get('/apolices/lookup/seguradoras')).map(s => s.nome); } catch {}

  // Inicializa 3 seguradoras vazias
  state.seguradoras = [1, 2, 3].map((_, i) => newSeg(i));
  state.radarChart = null;

  container.innerHTML = buildLayout(segList);
  bindEvents(segList);
  updateAll();
}

function newSeg(i) {
  return {
    nome: '',
    plano: '',
    premio: '',
    coberturas: Object.fromEntries(
      COBERTURAS.map(c => [c.id, { incluida: false, copag: '', limite: '' }])
    ),
  };
}

/* ─────────────────────────── LAYOUT ─────────────────────────── */
function buildLayout(segList) {
  return `
<div class="page-content" id="cotacoes-root">
  <!-- Header -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <span style="font-size:28px">📊</span>
        <h2 style="font-size:20px;font-weight:700;color:var(--gray-900);margin:0">Mapa Comparativo de Cotações</h2>
      </div>
      <p style="font-size:13px;color:var(--gray-500);margin:0">Compare até 3 seguradoras · Avaliação inteligente de custo-benefício</p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button id="btn-limpar" class="btn btn-secondary" style="font-size:13px">
        🗑️ Limpar Tudo
      </button>
      <button id="btn-pdf" class="btn btn-secondary" style="font-size:13px;background:#dc2626;color:#fff;border-color:#dc2626">
        📄 Exportar PDF
      </button>
      <button id="btn-email" class="btn btn-primary" style="font-size:13px">
        ✉️ Enviar por Email
      </button>
    </div>
  </div>

  <!-- Cards de Input das 3 Seguradoras -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px" id="seg-cards">
    ${[0,1,2].map(i => buildSegCard(i, segList)).join('')}
  </div>

  <!-- Tabela Comparativa -->
  <div class="card" style="margin-bottom:24px" id="tabela-card">
    <div class="card-header" style="background:var(--gray-900);color:white;border-radius:8px 8px 0 0">
      <span class="card-title" style="color:white;font-size:14px;font-weight:700">📋 Tabela Comparativa de Coberturas</span>
    </div>
    <div class="card-body" style="padding:0;overflow-x:auto">
      <div id="tabela-comp"></div>
    </div>
  </div>

  <!-- AI Analysis -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px" id="ia-section">
    <div class="card">
      <div class="card-header">
        <span class="card-title">🧠 Avaliação IA — Custo-Benefício</span>
      </div>
      <div class="card-body" id="ia-scores"></div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">📡 Radar de Cobertura</span>
      </div>
      <div class="card-body" style="position:relative;height:300px">
        <canvas id="radar-chart"></canvas>
      </div>
    </div>
  </div>

  <!-- Recomendação IA -->
  <div id="ia-recomendacao" style="margin-bottom:24px"></div>

  <!-- Modal Email -->
  <div id="modal-email" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:999;display:none;align-items:center;justify-content:center">
    <div style="background:white;border-radius:12px;padding:32px;width:100%;max-width:440px;box-shadow:var(--shadow-lg)">
      <h3 style="margin:0 0 16px;font-size:16px">✉️ Enviar Mapa Comparativo</h3>
      <label style="font-size:13px;font-weight:600;color:var(--gray-700);display:block;margin-bottom:6px">Endereço de Email</label>
      <input id="email-dest" type="email" class="form-control" placeholder="cliente@empresa.ao" style="margin-bottom:16px">
      <label style="font-size:13px;font-weight:600;color:var(--gray-700);display:block;margin-bottom:6px">Mensagem (opcional)</label>
      <textarea id="email-msg" class="form-control" rows="3" placeholder="Em anexo segue o mapa comparativo de cotações..." style="margin-bottom:20px;resize:none"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="modal-cancel" class="btn btn-secondary">Cancelar</button>
        <button id="modal-send" class="btn btn-primary">📤 Enviar</button>
      </div>
    </div>
  </div>
</div>`;
}

function buildSegCard(i, segList) {
  const cor = CORES[i];
  const datalistId = `seg-list-${i}`;
  return `
<div class="card" style="border-top:3px solid ${cor.primary};min-width:0">
  <div class="card-header" style="background:${cor.light};padding:12px 16px">
    <div style="font-size:12px;font-weight:700;color:${cor.primary};text-transform:uppercase;letter-spacing:.5px">Seguradora ${i+1}</div>
  </div>
  <div class="card-body" style="padding:16px">
    <datalist id="${datalistId}">
      ${segList.map(s => `<option value="${esc(s)}">`).join('')}
    </datalist>
    <div style="margin-bottom:12px">
      <label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:4px">Nome da Seguradora</label>
      <input type="text" class="form-control" id="seg-nome-${i}" list="${datalistId}" placeholder="Ex: ENSA — Seguros de Angola" style="font-size:13px">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div>
        <label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:4px">Plano</label>
        <input type="text" class="form-control" id="seg-plano-${i}" placeholder="Ex: Plano Gold" style="font-size:13px">
      </div>
      <div>
        <label style="font-size:11px;font-weight:600;color:var(--gray-600);text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:4px">Prémio Anual (AOA)</label>
        <input type="number" class="form-control" id="seg-premio-${i}" placeholder="0" min="0" style="font-size:13px">
      </div>
    </div>

    <div style="font-size:11px;font-weight:700;color:var(--gray-700);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--gray-200)">
      Coberturas
    </div>
    ${COBERTURAS.map(c => `
    <div style="display:grid;grid-template-columns:auto 1fr 1fr;align-items:center;gap:6px;margin-bottom:8px;padding:6px 8px;border-radius:6px;background:var(--gray-50)" data-cob="${c.id}">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;min-width:0">
        <input type="checkbox" id="seg-${i}-${c.id}-inc" style="accent-color:${cor.primary};width:14px;height:14px;flex-shrink:0">
        <span style="font-size:12px;color:var(--gray-700);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(c.label)}">${c.icon} ${esc(c.label)}</span>
      </label>
      <input type="number" class="form-control" id="seg-${i}-${c.id}-cop" placeholder="CO-PAG%" min="0" max="100"
             style="font-size:11px;padding:4px 6px;height:28px;text-align:center" title="Co-pagamento %">
      <input type="text" class="form-control" id="seg-${i}-${c.id}-lim" placeholder="Limite"
             style="font-size:11px;padding:4px 6px;height:28px" title="Limite / Valor">
    </div>`).join('')}
  </div>
</div>`;
}

/* ─────────────────────────── EVENTS ─────────────────────────── */
function bindEvents(segList) {
  // Inputs das seguradoras
  [0,1,2].forEach(i => {
    document.getElementById(`seg-nome-${i}`).addEventListener('input',  () => { readSeg(i); updateAll(); });
    document.getElementById(`seg-plano-${i}`).addEventListener('input', () => { readSeg(i); updateAll(); });
    document.getElementById(`seg-premio-${i}`).addEventListener('input',() => { readSeg(i); updateAll(); });
    COBERTURAS.forEach(c => {
      document.getElementById(`seg-${i}-${c.id}-inc`).addEventListener('change', () => { readSeg(i); updateAll(); });
      document.getElementById(`seg-${i}-${c.id}-cop`).addEventListener('input',  () => { readSeg(i); updateAll(); });
      document.getElementById(`seg-${i}-${c.id}-lim`).addEventListener('input',  () => { readSeg(i); updateAll(); });
    });
  });

  // Botões
  document.getElementById('btn-limpar').addEventListener('click', () => {
    [0,1,2].forEach(i => {
      state.seguradoras[i] = newSeg(i);
      document.getElementById(`seg-nome-${i}`).value = '';
      document.getElementById(`seg-plano-${i}`).value = '';
      document.getElementById(`seg-premio-${i}`).value = '';
      COBERTURAS.forEach(c => {
        document.getElementById(`seg-${i}-${c.id}-inc`).checked = false;
        document.getElementById(`seg-${i}-${c.id}-cop`).value = '';
        document.getElementById(`seg-${i}-${c.id}-lim`).value = '';
      });
    });
    updateAll();
  });

  document.getElementById('btn-pdf').addEventListener('click', gerarPDF);
  document.getElementById('btn-email').addEventListener('click', () => {
    const modal = document.getElementById('modal-email');
    modal.style.display = 'flex';
  });
  document.getElementById('modal-cancel').addEventListener('click', () => {
    document.getElementById('modal-email').style.display = 'none';
  });
  document.getElementById('modal-send').addEventListener('click', enviarEmail);
}

function readSeg(i) {
  const s = state.seguradoras[i];
  s.nome   = document.getElementById(`seg-nome-${i}`).value.trim();
  s.plano  = document.getElementById(`seg-plano-${i}`).value.trim();
  s.premio = parseFloat(document.getElementById(`seg-premio-${i}`).value) || 0;
  COBERTURAS.forEach(c => {
    s.coberturas[c.id] = {
      incluida: document.getElementById(`seg-${i}-${c.id}-inc`).checked,
      copag:    document.getElementById(`seg-${i}-${c.id}-cop`).value,
      limite:   document.getElementById(`seg-${i}-${c.id}-lim`).value.trim(),
    };
  });
}

/* ─────────────────────────── UPDATE ─────────────────────────── */
function updateAll() {
  updateTabela();
  const scores = calcScores();
  updateIAScores(scores);
  updateRadar(scores);
  updateRecomendacao(scores);
}

/* ─────────────────────────── TABELA ─────────────────────────── */
function updateTabela() {
  const segs = state.seguradoras;
  const labels = segs.map((s, i) => s.nome || `Seguradora ${i+1}`);

  const rows = COBERTURAS.map(c => {
    const cells = segs.map((s, i) => {
      const cob = s.coberturas[c.id];
      if (!cob.incluida) return `<td style="text-align:center;color:var(--gray-400);font-size:13px">—</td>`;
      const cop  = cob.copag  ? `<span style="font-size:11px;color:var(--warning);font-weight:600">${cob.copag}%</span>` : `<span style="font-size:11px;color:var(--success)">0%</span>`;
      const lim  = cob.limite ? `<br><span style="font-size:10px;color:var(--gray-500)">${esc(cob.limite)}</span>` : '';
      return `<td style="text-align:center;background:${CORES[i].light};padding:8px 6px">
        <span style="color:${CORES[i].primary};font-weight:700;font-size:15px">✓</span><br>${cop}${lim}
      </td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid var(--gray-100)">
      <td style="padding:8px 14px;font-size:13px;font-weight:500;color:var(--gray-700);white-space:nowrap">${c.icon} ${c.label}</td>
      ${cells}
    </tr>`;
  }).join('');

  const premios = segs.map((s, i) => {
    if (!s.premio) return `<td style="text-align:center;color:var(--gray-400);font-size:13px">—</td>`;
    return `<td style="text-align:center;background:${CORES[i].light};padding:10px">
      <span style="font-size:13px;font-weight:700;color:${CORES[i].primary}">${fmtNum(s.premio)} AOA</span>
    </td>`;
  }).join('');

  document.getElementById('tabela-comp').innerHTML = `
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:var(--gray-800)">
        <th style="padding:12px 14px;font-size:12px;font-weight:600;color:white;text-align:left;width:30%">COBERTURA</th>
        ${labels.map((l, i) => `
        <th style="padding:12px 8px;font-size:12px;font-weight:600;color:white;text-align:center;width:23%;border-left:1px solid rgba(255,255,255,.1)">
          <div style="color:${CORES[i].light}">${esc(l)}</div>
          ${segs[i].plano ? `<div style="font-size:10px;color:var(--gray-400);font-weight:400;margin-top:2px">${esc(segs[i].plano)}</div>` : ''}
        </th>`).join('')}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr style="background:var(--gray-100)">
        <td style="padding:10px 14px;font-size:12px;font-weight:700;color:var(--gray-700);text-transform:uppercase">Prémio Anual</td>
        ${premios}
      </tr>
    </tfoot>
  </table>`;
}

/* ─────────────────────────── IA SCORES ─────────────────────────── */
function calcScores() {
  const segs = state.seguradoras;
  const premios = segs.map(s => s.premio || 0);
  const maxPremio = Math.max(...premios.filter(p => p > 0)) || 1;
  const minPremio = Math.min(...premios.filter(p => p > 0)) || 1;

  return segs.map((s, i) => {
    // 1. Score de Cobertura (0–40)
    const totalPeso = COBERTURAS.reduce((acc, c) => acc + c.peso, 0);
    const pesoIncluido = COBERTURAS.reduce((acc, c) =>
      acc + (s.coberturas[c.id].incluida ? c.peso : 0), 0);
    const cobScore = (pesoIncluido / totalPeso) * 40;

    // 2. Score de Co-pagamento (0–30) — menor copag = melhor
    const cobsIncluidas = COBERTURAS.filter(c => s.coberturas[c.id].incluida);
    let copagScore = 30;
    if (cobsIncluidas.length > 0) {
      const avgCopag = cobsIncluidas.reduce((acc, c) => {
        const v = parseFloat(s.coberturas[c.id].copag) || 0;
        return acc + v;
      }, 0) / cobsIncluidas.length;
      copagScore = Math.max(0, 30 - (avgCopag / 100) * 30);
    }

    // 3. Score de Prémio (0–30) — menor prémio relativo = melhor
    let premioScore = 15; // neutro se sem prémio
    if (s.premio > 0 && premios.filter(p => p > 0).length > 1) {
      premioScore = ((maxPremio - s.premio) / (maxPremio - minPremio || 1)) * 30;
    } else if (s.premio > 0) {
      premioScore = 20;
    }

    const total = Math.round(cobScore + copagScore + premioScore);

    // Dimensões para radar (0–10 cada)
    return {
      idx: i,
      nome: s.nome || `Seguradora ${i+1}`,
      total: Math.min(100, total),
      dims: {
        cobertura: parseFloat((pesoIncluido / totalPeso * 10).toFixed(1)),
        copagamento: parseFloat((copagScore / 30 * 10).toFixed(1)),
        premio: parseFloat((premioScore / 30 * 10).toFixed(1)),
        maternidade: s.coberturas['maternidade'].incluida ? 10 : 0,
        hospitalizacao: s.coberturas['hospitalizacao'].incluida ? 10 : 0,
        evacuacao: s.coberturas['evacuacao'].incluida ? 10 : 0,
      },
    };
  });
}

function updateIAScores(scores) {
  const sorted = [...scores].sort((a, b) => b.total - a.total);

  const html = scores.map((sc, i) => {
    const rank = sorted.findIndex(s => s.idx === i);
    const cor  = CORES[i];
    const pct  = sc.total;
    const cor_score = pct >= 70 ? 'var(--success)' : pct >= 45 ? 'var(--warning)' : 'var(--danger)';

    return `
    <div style="padding:14px;border:1px solid var(--gray-200);border-radius:8px;margin-bottom:10px;border-left:4px solid ${cor.primary}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div>
          <span style="font-size:14px;font-weight:700;color:var(--gray-900)">${MEDAL[rank]} ${esc(sc.nome)}</span>
          ${scores[i] && state.seguradoras[i].plano ? `<span style="font-size:11px;color:var(--gray-500);margin-left:6px">${esc(state.seguradoras[i].plano)}</span>` : ''}
        </div>
        <span style="font-size:22px;font-weight:800;color:${cor_score}">${pct}</span>
      </div>
      <div style="height:8px;border-radius:4px;background:var(--gray-200);overflow:hidden;margin-bottom:8px">
        <div style="height:100%;border-radius:4px;background:${cor.primary};width:${pct}%;transition:width .6s ease-out"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;font-size:11px">
        <div style="text-align:center;background:var(--gray-50);border-radius:4px;padding:4px">
          <div style="color:var(--gray-500)">Cobertura</div>
          <div style="font-weight:700;color:var(--gray-800)">${sc.dims.cobertura}/10</div>
        </div>
        <div style="text-align:center;background:var(--gray-50);border-radius:4px;padding:4px">
          <div style="color:var(--gray-500)">Co-pag.</div>
          <div style="font-weight:700;color:var(--gray-800)">${sc.dims.copagamento}/10</div>
        </div>
        <div style="text-align:center;background:var(--gray-50);border-radius:4px;padding:4px">
          <div style="color:var(--gray-500)">Prémio</div>
          <div style="font-weight:700;color:var(--gray-800)">${sc.dims.premio}/10</div>
        </div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('ia-scores').innerHTML = html || `<div style="color:var(--gray-400);text-align:center;padding:20px;font-size:13px">Preencha os dados das seguradoras para ver a avaliação</div>`;
}

/* ─────────────────────────── RADAR ─────────────────────────── */
function updateRadar(scores) {
  const ctx = document.getElementById('radar-chart');
  if (!ctx) return;

  const labels = ['Cobertura', 'Co-Pag.', 'Prémio', 'Maternidade', 'Hospitaliz.', 'Evacuação'];

  const datasets = scores.map((sc, i) => ({
    label: sc.nome,
    data: [
      sc.dims.cobertura,
      sc.dims.copagamento,
      sc.dims.premio,
      sc.dims.maternidade,
      sc.dims.hospitalizacao,
      sc.dims.evacuacao,
    ],
    backgroundColor: CORES[i].primary + '22',
    borderColor: CORES[i].primary,
    borderWidth: 2,
    pointBackgroundColor: CORES[i].primary,
    pointRadius: 4,
  }));

  if (state.radarChart) {
    state.radarChart.data.datasets = datasets;
    state.radarChart.data.datasets.forEach((ds, i) => { ds.label = scores[i].nome; });
    state.radarChart.update();
  } else {
    state.radarChart = new Chart(ctx, {
      type: 'radar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } },
        scales: {
          r: {
            min: 0, max: 10,
            ticks: { stepSize: 2, font: { size: 10 }, color: '#9ca3af' },
            grid: { color: '#e5e7eb' },
            pointLabels: { font: { size: 11 }, color: '#374151' },
          },
        },
      },
    });
  }
}

/* ─────────────────────────── RECOMENDAÇÃO ─────────────────────── */
function updateRecomendacao(scores) {
  const sorted = [...scores].sort((a, b) => b.total - a.total);
  const best = sorted[0];
  const el = document.getElementById('ia-recomendacao');

  if (best.total === 0) { el.innerHTML = ''; return; }

  const cor = CORES[best.idx];
  const segs = state.seguradoras;
  const difPremio = segs[sorted[0].idx].premio && segs[sorted[1]?.idx]?.premio
    ? Math.abs(segs[sorted[0].idx].premio - segs[sorted[1].idx].premio)
    : null;

  const ncobs = COBERTURAS.filter(c => segs[best.idx].coberturas[c.id].incluida).length;

  el.innerHTML = `
  <div style="background:linear-gradient(135deg,${cor.primary}15,${cor.light});border:1px solid ${cor.primary}40;border-radius:12px;padding:20px 24px;display:flex;align-items:flex-start;gap:16px">
    <div style="font-size:36px;flex-shrink:0">🏆</div>
    <div>
      <div style="font-size:13px;font-weight:700;color:${cor.primary};text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Recomendação IA</div>
      <div style="font-size:16px;font-weight:800;color:var(--gray-900);margin-bottom:6px">
        ${esc(best.nome)} ${segs[best.idx].plano ? `· ${esc(segs[best.idx].plano)}` : ''}
        <span style="background:${cor.primary};color:white;font-size:12px;padding:2px 10px;border-radius:20px;margin-left:8px;font-weight:700">${best.total} pts</span>
      </div>
      <div style="font-size:13px;color:var(--gray-600);line-height:1.6">
        Esta seguradora apresenta a melhor relação custo-benefício com <strong>${ncobs} coberturas incluídas</strong>
        ${difPremio ? ` e poupança estimada de <strong>${fmtNum(Math.round(difPremio))} AOA/ano</strong> face à alternativa` : ''}.
        Score global de <strong>${best.total}/100</strong> calculado com base em amplitude de cobertura, co-pagamentos e valor do prémio.
      </div>
    </div>
  </div>`;
}

/* ─────────────────────────── PDF ─────────────────────────── */
async function gerarPDF() {
  const btn = document.getElementById('btn-pdf');
  btn.disabled = true;
  btn.textContent = '⏳ A gerar...';

  try {
    const html = buildPDFHtml();
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); btn.disabled = false; btn.innerHTML = '📄 Exportar PDF'; }, 600);
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = '📄 Exportar PDF';
    alert('Erro ao gerar PDF: ' + e.message);
  }
}

function buildPDFHtml() {
  const segs  = state.seguradoras;
  const scores = calcScores();
  const sorted = [...scores].sort((a, b) => b.total - a.total);
  const best = sorted[0];

  const rows = COBERTURAS.map(c => {
    const cells = segs.map((s, i) => {
      const cob = s.coberturas[c.id];
      if (!cob.incluida) return `<td style="text-align:center;color:#9ca3af">—</td>`;
      const cop = cob.copag ? `${cob.copag}%` : '0%';
      const lim = cob.limite ? `<br><small style="color:#6b7280">${esc(cob.limite)}</small>` : '';
      return `<td style="text-align:center;background:${CORES[i].light}">✓ <span style="color:${CORES[i].primary};font-size:11px">${cop}</span>${lim}</td>`;
    }).join('');
    return `<tr><td style="padding:7px 12px;font-size:12px">${c.icon} ${c.label}</td>${cells}</tr>`;
  }).join('');

  const scoreRows = scores.map((sc, i) => {
    const rank = sorted.findIndex(s => s.idx === i);
    return `<tr>
      <td style="padding:8px 12px">${MEDAL[rank]} <strong>${esc(sc.nome)}</strong></td>
      <td style="text-align:center">${sc.dims.cobertura}/10</td>
      <td style="text-align:center">${sc.dims.copagamento}/10</td>
      <td style="text-align:center">${sc.dims.premio}/10</td>
      <td style="text-align:center;font-weight:800;color:${CORES[i].primary}">${sc.total}/100</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Mapa Comparativo de Cotações — SIGMS ELOVITAL</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#111827;margin:0;padding:20px}
    h1{font-size:18px;color:#1a56db;margin:0}
    h2{font-size:13px;color:#374151;margin:16px 0 8px;border-bottom:2px solid #1a56db;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th{background:#1f2937;color:white;padding:8px 12px;font-size:11px;text-align:left}
    td{border-bottom:1px solid #e5e7eb;padding:6px 12px;font-size:12px}
    tr:nth-child(even) td{background:#f9fafb}
    .rec{background:#eff6ff;border:1px solid #1a56db40;border-radius:8px;padding:14px 18px;margin-top:16px}
    @media print{@page{margin:15mm} body{padding:0}}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #1a56db">
    <div>
      <h1>📊 Mapa Comparativo de Cotações</h1>
      <p style="margin:4px 0 0;font-size:11px;color:#6b7280">Seguro de Saúde · SIGMS ELOVITAL · ${new Date().toLocaleDateString('pt-AO')}</p>
    </div>
  </div>
  <h2>Coberturas Comparadas</h2>
  <table>
    <thead>
      <tr><th>COBERTURA</th>
        ${segs.map((s, i) => `<th style="background:${CORES[i].primary}">${esc(s.nome || `Seg. ${i+1}`)}${s.plano ? ` · ${esc(s.plano)}` : ''}</th>`).join('')}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr style="background:#f3f4f6">
        <td style="font-weight:700;padding:8px 12px">Prémio Anual (AOA)</td>
        ${segs.map(s => `<td style="font-weight:700;text-align:center">${s.premio ? fmtNum(s.premio) : '—'}</td>`).join('')}
      </tr>
    </tfoot>
  </table>
  <h2>Avaliação IA — Custo-Benefício</h2>
  <table>
    <thead><tr><th>Seguradora</th><th style="text-align:center">Cobertura</th><th style="text-align:center">Co-Pag.</th><th style="text-align:center">Prémio</th><th style="text-align:center">Score Total</th></tr></thead>
    <tbody>${scoreRows}</tbody>
  </table>
  <div class="rec">
    <strong>🏆 Recomendação IA:</strong> <strong>${esc(best.nome)}</strong> apresenta a melhor relação custo-benefício com score de <strong>${best.total}/100</strong>.
    Calculado com base em amplitude de cobertura (35%), qualidade dos co-pagamentos (30%) e valor do prémio (35%).
  </div>
  </body></html>`;
}

/* ─────────────────────────── EMAIL ─────────────────────────── */
async function enviarEmail() {
  const email = document.getElementById('email-dest').value.trim();
  const msg   = document.getElementById('email-msg').value.trim();
  if (!email) { alert('Insira um endereço de email válido.'); return; }

  const btn = document.getElementById('modal-send');
  btn.disabled = true;
  btn.textContent = '⏳ A enviar...';

  try {
    const html = buildPDFHtml();
    await post('/cotacoes/enviar-email', {
      email,
      mensagem: msg,
      html_content: html,
      seguradoras: state.seguradoras.map((s, i) => ({
        nome: s.nome || `Seguradora ${i+1}`,
        plano: s.plano,
        premio: s.premio,
      })),
    });
    document.getElementById('modal-email').style.display = 'none';
    showToast('Email enviado com sucesso!', 'success');
  } catch (e) {
    showToast('Erro ao enviar email: ' + e.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = '📤 Enviar';
  }
}

/* ─────────────────────────── UTILS ─────────────────────────── */
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function fmtNum(n) {
  return Number(n).toLocaleString('pt-AO');
}
function showToast(msg, type = 'success') {
  const tc = document.getElementById('toast-container');
  if (!tc) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
