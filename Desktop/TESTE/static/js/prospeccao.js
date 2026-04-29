/* SIGMS Prospecção Module */
import { get, post, put, patch, del } from './api.js';
import { toast, formatDate, formatAKZ, debounce } from './utils.js';

let currentPage = 1;
let currentFilters = {};
let editingId = null;
let seguradoras = [];
let ramos = [];

const ESTADOS = [
  { value: 'Nova', color: '#6366f1', emoji: '🆕' },
  { value: 'Cotação Enviada', color: '#0ea5e9', emoji: '📤' },
  { value: 'Aguarda Seguradora', color: '#f59e0b', emoji: '⏳' },
  { value: 'Aguarda Cliente', color: '#f97316', emoji: '📞' },
  { value: 'Aguarda Pagamento', color: '#8b5cf6', emoji: '💳' },
  { value: 'Convertida', color: '#22c55e', emoji: '✅' },
  { value: 'Perdida', color: '#ef4444', emoji: '❌' },
  { value: 'Cancelada', color: '#6b7280', emoji: '🚫' },
];

function estadoInfo(estado) {
  return ESTADOS.find(e => e.value === estado) || { color: '#6b7280', emoji: '•' };
}

function estadoBadgeProsp(estado) {
  const info = estadoInfo(estado);
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;background:${info.color}22;color:${info.color}">${info.emoji} ${estado}</span>`;
}

export async function renderProspeccao(container) {
  container.innerHTML = `
<div class="page-content">
  <div class="card" style="margin-bottom:16px">
    <div id="prosp-stats" style="display:flex;gap:12px;flex-wrap:wrap;padding:4px 0"></div>
  </div>
  <div class="card">
    <div class="card-header">
      <span class="card-title">🎯 Prospecção</span>
      <div class="flex gap-2 items-center">
        <div class="search-bar">
          <span>🔍</span>
          <input type="text" id="prosp-search" placeholder="Pesquisar...">
        </div>
        <select id="filter-estado-prosp" style="max-width:180px">
          <option value="">Todos estados</option>
          ${ESTADOS.map(e => `<option value="${e.value}">${e.emoji} ${e.value}</option>`).join('')}
        </select>
        <button class="btn btn-secondary" id="btn-new-comparacao">📊 Nova Comparação</button>
        <button class="btn btn-primary" id="btn-new-prosp">+ Nova Prospecção</button>
      </div>
    </div>
    <div id="prosp-table-container">
      <div class="loading"><div class="spinner"></div> A carregar...</div>
    </div>
    <div id="prosp-pagination" class="pagination hidden"></div>
  </div>
</div>

<!-- Prospecção Modal -->
<div class="modal-overlay hidden" id="prosp-modal">
  <div class="modal modal-lg">
    <div class="modal-header">
      <span class="modal-title" id="prosp-modal-title">Nova Prospecção</span>
      <button class="btn btn-icon btn-secondary" onclick="document.getElementById('prosp-modal').classList.add('hidden')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Título / Descrição *</label>
        <input type="text" id="p-titulo" placeholder="ex: Seguro Automóvel Toyota Hilux 2024">
      </div>
      <div class="form-group">
        <label>Cliente *</label>
        <input type="text" id="p-client-search" placeholder="Pesquisar cliente por nome ou NIF...">
        <input type="hidden" id="p-client-id">
        <div id="p-client-suggestions" style="border:1px solid var(--gray-200);border-radius:6px;max-height:150px;overflow-y:auto;display:none;background:white;position:absolute;z-index:100;width:calc(100% - 48px)"></div>
        <div class="field-hint" id="p-client-selected"></div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Seguradora</label>
          <select id="p-seguradora">
            <option value="">— Não definida —</option>
          </select>
        </div>
        <div class="form-group">
          <label>Ramo</label>
          <select id="p-ramo">
            <option value="">— Não definido —</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Estado</label>
          <select id="p-estado">
            ${ESTADOS.map(e => `<option value="${e.value}">${e.emoji} ${e.value}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Data de Seguimento</label>
          <input type="date" id="p-data-seguimento">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Prémio Estimado (Kz)</label>
          <input type="number" id="p-premio" step="0.01" min="0" placeholder="0.00">
        </div>
        <div class="form-group">
          <label>Comissão (%)</label>
          <input type="number" id="p-comissao-pct" step="0.01" min="0" max="100" placeholder="ex: 10">
        </div>
      </div>
      <div class="form-group">
        <label>Próteses e Ortoses</label>
        <select id="p-proteses-ortoses">
          <option value="">— Não especificado —</option>
          <option value="Incluída">✅ Incluída</option>
          <option value="Excluída">❌ Excluída</option>
          <option value="Limitada">⚠️ Limitada</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Copagamento Fora da Rede (%)</label>
          <input type="number" id="p-copagamento" step="0.01" min="0" max="100" placeholder="ex: 20">
        </div>
        <div class="form-group">
          <label>Período de Carência (dias)</label>
          <input type="number" id="p-carencia" step="1" min="0" placeholder="ex: 90">
        </div>
      </div>
      <div class="form-group">
        <label>Notas</label>
        <textarea id="p-notas" rows="3" placeholder="Observações, condições especiais, histórico..."></textarea>
      </div>
      <div id="prosp-form-error" class="alert alert-danger hidden" style="margin-top:12px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('prosp-modal').classList.add('hidden')">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-prosp">Guardar</button>
    </div>
  </div>
</div>

<!-- Estado Rápido Modal -->
<div class="modal-overlay hidden" id="prosp-estado-modal">
  <div class="modal" style="max-width:400px">
    <div class="modal-header">
      <span class="modal-title">Alterar Estado</span>
      <button class="btn btn-icon btn-secondary" onclick="document.getElementById('prosp-estado-modal').classList.add('hidden')">✕</button>
    </div>
    <div class="modal-body">
      <div id="prosp-estado-titulo" style="font-weight:600;margin-bottom:16px;color:var(--gray-700)"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="estado-buttons"></div>
    </div>
  </div>
</div>

<!-- Comparação Modal -->
<div class="modal-overlay hidden" id="comparacao-modal">
  <div class="modal modal-lg">
    <div class="modal-header">
      <span class="modal-title" id="comparacao-modal-title">Nova Comparação</span>
      <button class="btn btn-icon btn-secondary" onclick="document.getElementById('comparacao-modal').classList.add('hidden')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Título da Comparação *</label>
        <input type="text" id="c-titulo" placeholder="ex: Seguros de Saúde - Três Planos">
      </div>
      <div class="form-group">
        <label>Cliente *</label>
        <input type="text" id="c-client-search" placeholder="Pesquisar cliente por nome ou NIF...">
        <input type="hidden" id="c-client-id">
        <div id="c-client-suggestions" style="border:1px solid var(--gray-200);border-radius:6px;max-height:150px;overflow-y:auto;display:none;background:white;position:absolute;z-index:100;width:calc(100% - 48px)"></div>
        <div class="field-hint" id="c-client-selected"></div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Data de Seguimento</label>
          <input type="date" id="c-data-seguimento">
        </div>
      </div>
      <div class="form-group">
        <label>Notas</label>
        <textarea id="c-notas" rows="2" placeholder="Observações..."></textarea>
      </div>
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--gray-200)">
        <h4 style="margin-bottom:12px">Planos a Comparar (máx. 4)</h4>
        <div id="comparacao-planos-list" style="margin-bottom:12px;max-height:300px;overflow-y:auto"></div>
        <button class="btn btn-secondary btn-sm" id="btn-add-plano" style="width:100%">+ Adicionar Plano</button>
      </div>
      <div id="comparacao-form-error" class="alert alert-danger hidden" style="margin-top:12px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('comparacao-modal').classList.add('hidden')">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-comparacao">Guardar Comparação</button>
    </div>
  </div>
</div>

<!-- Quadro Comparativo Modal -->
<div class="modal-overlay hidden" id="quadro-comparacao-modal">
  <div class="modal" style="max-width:90vw;max-height:90vh;overflow:auto">
    <div class="modal-header">
      <span class="modal-title" id="quadro-titulo">Quadro Comparativo</span>
      <button class="btn btn-icon btn-secondary" onclick="document.getElementById('quadro-comparacao-modal').classList.add('hidden')">✕</button>
    </div>
    <div class="modal-body" id="quadro-comparacao-content" style="overflow-x:auto"></div>
  </div>
</div>`;

  // Load lookups
  [seguradoras, ramos] = await Promise.all([
    get('/apolices/lookup/seguradoras').catch(() => []),
    get('/apolices/lookup/ramos').catch(() => []),
  ]);

  const segSelect = document.getElementById('p-seguradora');
  seguradoras.forEach(s => segSelect.innerHTML += `<option value="${s.id}">${s.nome}</option>`);
  const ramoSelect = document.getElementById('p-ramo');
  ramos.forEach(r => ramoSelect.innerHTML += `<option value="${r.id}">${r.nome}</option>`);

  // Client search
  const clientSearch = document.getElementById('p-client-search');
  clientSearch.addEventListener('input', debounce(async e => {
    const q = e.target.value;
    if (q.length < 2) { document.getElementById('p-client-suggestions').style.display = 'none'; return; }
    const data = await get(`/clients?q=${q}&size=5`);
    const sugg = document.getElementById('p-client-suggestions');
    sugg.innerHTML = data.items.map(c =>
      `<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--gray-100)" onmousedown="selectProspClient(${c.id},'${c.nome}','${c.nif}')">${c.nome} <span class="font-mono text-sm text-gray">${c.nif}</span></div>`
    ).join('');
    sugg.style.display = data.items.length ? 'block' : 'none';
  }));

  window.selectProspClient = (id, nome, nif) => {
    document.getElementById('p-client-id').value = id;
    document.getElementById('p-client-search').value = `${nome} (${nif})`;
    document.getElementById('p-client-suggestions').style.display = 'none';
  };

  document.getElementById('btn-new-prosp').addEventListener('click', () => openProspModal());
  document.getElementById('btn-save-prosp').addEventListener('click', saveProspeccao);
  document.getElementById('btn-new-comparacao').addEventListener('click', () => openComparacaoModal());
  document.getElementById('prosp-search').addEventListener('input', debounce(e => {
    currentFilters.q = e.target.value; currentPage = 1; loadTable();
  }));
  document.getElementById('filter-estado-prosp').addEventListener('change', e => {
    currentFilters.estado = e.target.value; currentPage = 1; loadTable();
  });

  // Client search para comparação
  const clientSearchComp = document.getElementById('c-client-search');
  clientSearchComp.addEventListener('input', debounce(async e => {
    const q = e.target.value;
    if (q.length < 2) { document.getElementById('c-client-suggestions').style.display = 'none'; return; }
    const data = await get(`/clients?q=${q}&size=5`);
    const sugg = document.getElementById('c-client-suggestions');
    sugg.innerHTML = data.items.map(c =>
      `<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--gray-100)" onmousedown="selectCompClient(${c.id},'${c.nome}','${c.nif}')">${c.nome} <span class="font-mono text-sm text-gray">${c.nif}</span></div>`
    ).join('');
    sugg.style.display = data.items.length ? 'block' : 'none';
  }));

  window.selectCompClient = (id, nome, nif) => {
    document.getElementById('c-client-id').value = id;
    document.getElementById('c-client-search').value = `${nome} (${nif})`;
    document.getElementById('c-client-suggestions').style.display = 'none';
  };

  document.getElementById('btn-add-plano').addEventListener('click', addPlanoRow);
  document.getElementById('btn-save-comparacao').addEventListener('click', saveComparacao);

  loadStats();
  loadTable();
}

async function loadStats() {
  try {
    const stats = await get('/prospeccao/stats');
    const container = document.getElementById('prosp-stats');
    if (!container) return;
    const active = ESTADOS.filter(e => !['Convertida','Perdida','Cancelada'].includes(e.value));
    container.innerHTML = active.map(e => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:${e.color}11;border-radius:8px;border:1px solid ${e.color}33">
        <span style="font-size:18px">${e.emoji}</span>
        <div>
          <div style="font-size:20px;font-weight:700;color:${e.color}">${stats[e.value] || 0}</div>
          <div style="font-size:11px;color:var(--gray-500)">${e.value}</div>
        </div>
      </div>`).join('') +
      `<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:#22c55e11;border-radius:8px;border:1px solid #22c55e33">
        <span style="font-size:18px">✅</span>
        <div>
          <div style="font-size:20px;font-weight:700;color:#22c55e">${stats['Convertida'] || 0}</div>
          <div style="font-size:11px;color:var(--gray-500)">Convertidas</div>
        </div>
      </div>`;
  } catch {}
}

async function loadTable() {
  const container = document.getElementById('prosp-table-container');
  container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const params = new URLSearchParams({ page: currentPage, size: 20 });
    if (currentFilters.q) params.set('q', currentFilters.q);
    if (currentFilters.estado) params.set('estado', currentFilters.estado);
    const data = await get(`/prospeccao?${params}`);
    const { total, items } = data;

    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-title">Nenhuma prospecção encontrada</div></div>`;
      return;
    }

    container.innerHTML = `
    <div class="table-wrapper"><table>
      <thead><tr><th>Título</th><th>Cliente</th><th>Seguradora</th><th>Ramo</th><th>Prémio Est.</th><th>Seguimento</th><th>Estado</th><th>Ações</th></tr></thead>
      <tbody>
        ${items.map(p => `
        <tr>
          <td><strong>${p.titulo}</strong></td>
          <td>${p.client_nome || '-'}</td>
          <td style="font-size:12px">${p.seguradora || '-'}</td>
          <td>${p.ramo || '-'}</td>
          <td>${p.premio_estimado ? formatAKZ(p.premio_estimado) : '-'}</td>
          <td>${p.data_seguimento ? formatDate(p.data_seguimento) : '-'}</td>
          <td>${estadoBadgeProsp(p.estado)}</td>
          <td>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-secondary" onclick="editProsp(${p.id})" title="Editar">✏️</button>
              <button class="btn btn-sm btn-secondary" onclick="changeProspEstado(${p.id},'${p.titulo.replace(/'/g,"\\'")}','${p.estado}')" title="Alterar estado">🔄</button>
              <button class="btn btn-sm btn-danger" onclick="deleteProsp(${p.id})" title="Eliminar">🗑️</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;

    const pag = document.getElementById('prosp-pagination');
    const totalPages = Math.ceil(total / 20);
    if (totalPages > 1) {
      pag.classList.remove('hidden');
      pag.innerHTML = `
        <span class="pagination-info">${total} prospecções</span>
        <div class="pagination-btns">
          <button class="btn btn-sm btn-secondary" ${currentPage<=1?'disabled':''} onclick="changeProspPage(${currentPage-1})">← Anterior</button>
          <button class="btn btn-sm btn-secondary" ${currentPage>=totalPages?'disabled':''} onclick="changeProspPage(${currentPage+1})">Próxima →</button>
        </div>`;
    } else {
      pag.classList.add('hidden');
    }
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
  }
}

window.changeProspPage = p => { currentPage = p; loadTable(); };

window.editProsp = async (id) => {
  try { const p = await get(`/prospeccao/${id}`); openProspModal(p); } catch (e) { toast(e.message, 'error'); }
};

window.deleteProsp = async (id) => {
  if (!confirm('Eliminar esta prospecção?')) return;
  try {
    await del(`/prospeccao/${id}`);
    toast('Prospecção eliminada');
    loadTable();
    loadStats();
  } catch (e) { toast(e.message, 'error'); }
};

window.changeProspEstado = (id, titulo, estadoAtual) => {
  document.getElementById('prosp-estado-titulo').textContent = titulo;
  const btns = document.getElementById('estado-buttons');
  btns.innerHTML = ESTADOS.map(e => `
    <button class="btn btn-sm" style="background:${e.color}22;color:${e.color};border:1px solid ${e.color}44;${e.value===estadoAtual?'border-width:2px;font-weight:700':''}"
      onclick="applyEstado(${id},'${e.value}')">${e.emoji} ${e.value}</button>`).join('');
  document.getElementById('prosp-estado-modal').classList.remove('hidden');
};

window.applyEstado = async (id, estado) => {
  try {
    await patch(`/prospeccao/${id}/estado?estado=${encodeURIComponent(estado)}`);
    toast(`Estado alterado para "${estado}"`);
    document.getElementById('prosp-estado-modal').classList.add('hidden');

    if (estado === 'Convertida') {
      // Fetch the prospecção data and pass it to the apólices form
      const prosp = await get(`/prospeccao/${id}`);
      sessionStorage.setItem('convert_prosp', JSON.stringify(prosp));
      window.location.hash = '#/apolices?from_prosp=1';
    } else {
      loadTable();
      loadStats();
    }
  } catch (e) { toast(e.message, 'error'); }
};

function openProspModal(prosp = null) {
  editingId = prosp?.id || null;
  document.getElementById('prosp-modal-title').textContent = prosp ? 'Editar Prospecção' : 'Nova Prospecção';
  document.getElementById('p-titulo').value = prosp?.titulo || '';
  document.getElementById('p-estado').value = prosp?.estado || 'Nova';
  document.getElementById('p-data-seguimento').value = prosp?.data_seguimento || '';
  document.getElementById('p-premio').value = prosp?.premio_estimado || '';
  document.getElementById('p-comissao-pct').value = prosp?.percentagem_comissao || '';
  document.getElementById('p-proteses-ortoses').value = prosp?.proteses_ortoses || '';
  document.getElementById('p-copagamento').value = prosp?.copagamento_fora_rede || '';
  document.getElementById('p-carencia').value = prosp?.periodo_carencia || '';
  document.getElementById('p-notas').value = prosp?.notas || '';
  if (prosp?.seguradora_id) document.getElementById('p-seguradora').value = prosp.seguradora_id;
  else document.getElementById('p-seguradora').value = '';
  if (prosp?.ramo_id) document.getElementById('p-ramo').value = prosp.ramo_id;
  else document.getElementById('p-ramo').value = '';
  if (prosp?.client_id) {
    document.getElementById('p-client-id').value = prosp.client_id;
    document.getElementById('p-client-search').value = prosp.client_nome ? `${prosp.client_nome}${prosp.client_nif ? ' (' + prosp.client_nif + ')' : ''}` : '';
  } else {
    document.getElementById('p-client-id').value = '';
    document.getElementById('p-client-search').value = '';
  }
  document.getElementById('prosp-form-error').classList.add('hidden');
  document.getElementById('prosp-modal').classList.remove('hidden');
}

async function saveProspeccao() {
  const errEl = document.getElementById('prosp-form-error');
  errEl.classList.add('hidden');
  const titulo = document.getElementById('p-titulo').value.trim();
  const client_id = parseInt(document.getElementById('p-client-id').value);
  if (!titulo) { errEl.textContent = 'O título é obrigatório.'; errEl.classList.remove('hidden'); return; }
  if (!client_id) { errEl.textContent = 'Selecione um cliente.'; errEl.classList.remove('hidden'); return; }

  const body = {
    titulo,
    client_id,
    seguradora_id: parseInt(document.getElementById('p-seguradora').value) || null,
    ramo_id: parseInt(document.getElementById('p-ramo').value) || null,
    estado: document.getElementById('p-estado').value,
    data_seguimento: document.getElementById('p-data-seguimento').value || null,
    premio_estimado: parseFloat(document.getElementById('p-premio').value) || null,
    percentagem_comissao: parseFloat(document.getElementById('p-comissao-pct').value) || null,
    proteses_ortoses: document.getElementById('p-proteses-ortoses').value || null,
    copagamento_fora_rede: parseFloat(document.getElementById('p-copagamento').value) || null,
    periodo_carencia: parseInt(document.getElementById('p-carencia').value) || null,
    notas: document.getElementById('p-notas').value || null,
  };

  const btn = document.getElementById('btn-save-prosp');
  btn.disabled = true; btn.textContent = 'A guardar...';
  try {
    if (editingId) { await put(`/prospeccao/${editingId}`, body); toast('Prospecção atualizada'); }
    else { await post('/prospeccao', body); toast('Prospecção criada'); }
    document.getElementById('prosp-modal').classList.add('hidden');
    loadTable();
    loadStats();
  } catch (e) {
    errEl.textContent = e.message; errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar';
  }
}

// ==================== COMPARAÇÃO DE COTAÇÕES ====================

let comparacaoPlanos = []; // Armazena planos temporários durante edição
let editingComparacaoId = null;

function openComparacaoModal(comparacao = null) {
  editingComparacaoId = comparacao?.id || null;
  document.getElementById('comparacao-modal-title').textContent = comparacao ? 'Editar Comparação' : 'Nova Comparação';
  document.getElementById('c-titulo').value = comparacao?.titulo || '';
  document.getElementById('c-data-seguimento').value = comparacao?.data_seguimento || '';
  document.getElementById('c-notas').value = comparacao?.notas || '';

  if (comparacao?.client_id) {
    document.getElementById('c-client-id').value = comparacao.client_id;
    document.getElementById('c-client-search').value = comparacao.client_nome ? `${comparacao.client_nome}${comparacao.client_nif ? ' (' + comparacao.client_nif + ')' : ''}` : '';
  } else {
    document.getElementById('c-client-id').value = '';
    document.getElementById('c-client-search').value = '';
  }

  // Carregar planos existentes ou inicializar vazios
  comparacaoPlanos = comparacao?.prospeccoes ? [...comparacao.prospeccoes] : [];
  renderComparacaoPlanos();

  document.getElementById('comparacao-form-error').classList.add('hidden');
  document.getElementById('comparacao-modal').classList.remove('hidden');
}

function renderComparacaoPlanos() {
  const container = document.getElementById('comparacao-planos-list');
  if (comparacaoPlanos.length === 0) {
    container.innerHTML = '<div style="color:var(--gray-400);padding:12px;text-align:center">Nenhum plano adicionado</div>';
    return;
  }

  container.innerHTML = comparacaoPlanos.map((p, idx) => `
    <div style="padding:12px;border:1px solid var(--gray-200);border-radius:6px;margin-bottom:8px;background:var(--gray-50)">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
        <strong>Plano ${idx + 1}</strong>
        <button class="btn btn-sm btn-danger" onclick="removePlano(${idx})" type="button">🗑️</button>
      </div>
      <div class="form-row" style="gap:8px">
        <select onchange="comparacaoPlanos[${idx}].seguradora_id = this.value; comparacaoPlanos[${idx}].seguradora = this.options[this.selectedIndex].text;" style="flex:1">
          <option value="">— Seguradora —</option>
          ${seguradoras.map(s => `<option value="${s.id}" ${p.seguradora_id == s.id ? 'selected' : ''}>${s.nome}</option>`).join('')}
        </select>
        <select onchange="comparacaoPlanos[${idx}].ramo_id = this.value; comparacaoPlanos[${idx}].ramo = this.options[this.selectedIndex].text;" style="flex:1">
          <option value="">— Ramo —</option>
          ${ramos.map(r => `<option value="${r.id}" ${p.ramo_id == r.id ? 'selected' : ''}>${r.nome}</option>`).join('')}
        </select>
      </div>
      <div class="form-row" style="gap:8px;margin-top:8px">
        <input type="number" placeholder="Prémio Est. (Kz)" value="${p.premio_estimado || ''}" onchange="comparacaoPlanos[${idx}].premio_estimado = parseFloat(this.value) || null;" style="flex:1"/>
        <input type="number" placeholder="Comissão (%)" value="${p.percentagem_comissao || ''}" onchange="comparacaoPlanos[${idx}].percentagem_comissao = parseFloat(this.value) || null;" style="flex:1"/>
      </div>
      <div class="form-row" style="gap:8px;margin-top:8px">
        <select onchange="comparacaoPlanos[${idx}].proteses_ortoses = this.value;" style="flex:1">
          <option value="">Próteses/Ortoses</option>
          <option value="Incluída" ${p.proteses_ortoses === 'Incluída' ? 'selected' : ''}>✅ Incluída</option>
          <option value="Excluída" ${p.proteses_ortoses === 'Excluída' ? 'selected' : ''}>❌ Excluída</option>
          <option value="Limitada" ${p.proteses_ortoses === 'Limitada' ? 'selected' : ''}>⚠️ Limitada</option>
        </select>
        <input type="number" placeholder="Copagamento Fora (%)" value="${p.copagamento_fora_rede || ''}" onchange="comparacaoPlanos[${idx}].copagamento_fora_rede = parseFloat(this.value) || null;" style="flex:1"/>
      </div>
      <div class="form-row" style="gap:8px;margin-top:8px">
        <input type="number" placeholder="Período Carência (dias)" value="${p.periodo_carencia || ''}" onchange="comparacaoPlanos[${idx}].periodo_carencia = parseInt(this.value) || null;" style="flex:1"/>
      </div>
    </div>
  `).join('');
}

window.removePlano = (idx) => {
  comparacaoPlanos.splice(idx, 1);
  renderComparacaoPlanos();
};

function addPlanoRow() {
  if (comparacaoPlanos.length >= 4) {
    alert('Máximo de 4 planos permitidos');
    return;
  }
  comparacaoPlanos.push({
    seguradora_id: null,
    ramo_id: null,
    titulo: '',
    estado: 'Nova',
    premio_estimado: null,
    percentagem_comissao: null,
    proteses_ortoses: null,
    copagamento_fora_rede: null,
    periodo_carencia: null,
  });
  renderComparacaoPlanos();
}

async function saveComparacao() {
  const errEl = document.getElementById('comparacao-form-error');
  errEl.classList.add('hidden');

  const titulo = document.getElementById('c-titulo').value.trim();
  const client_id = parseInt(document.getElementById('c-client-id').value);

  if (!titulo) { errEl.textContent = 'O título é obrigatório.'; errEl.classList.remove('hidden'); return; }
  if (!client_id) { errEl.textContent = 'Selecione um cliente.'; errEl.classList.remove('hidden'); return; }
  if (comparacaoPlanos.length === 0) { errEl.textContent = 'Adicione pelo menos um plano.'; errEl.classList.remove('hidden'); return; }

  const body = {
    titulo,
    client_id,
    data_seguimento: document.getElementById('c-data-seguimento').value || null,
    notas: document.getElementById('c-notas').value || null,
  };

  const btn = document.getElementById('btn-save-comparacao');
  btn.disabled = true; btn.textContent = 'A guardar...';

  try {
    let comparacao;
    if (editingComparacaoId) {
      await put(`/prospeccao/comparacao/${editingComparacaoId}`, body);
      comparacao = await get(`/prospeccao/comparacao/${editingComparacaoId}`);
    } else {
      comparacao = await post('/prospeccao/comparacao', body);
    }

    // Salvar cada plano
    for (let p of comparacaoPlanos) {
      const planoBody = {
        client_id,
        seguradora_id: p.seguradora_id || null,
        ramo_id: p.ramo_id || null,
        comparacao_id: comparacao.id,
        titulo: p.titulo || `Plano - ${p.seguradora || 'N/A'}`,
        estado: 'Cotação Enviada',
        premio_estimado: p.premio_estimado || null,
        percentagem_comissao: p.percentagem_comissao || null,
        proteses_ortoses: p.proteses_ortoses || null,
        copagamento_fora_rede: p.copagamento_fora_rede || null,
        periodo_carencia: p.periodo_carencia || null,
      };
      if (p.id) {
        await put(`/prospeccao/${p.id}`, planoBody);
      } else {
        await post('/prospeccao', planoBody);
      }
    }

    toast('Comparação guardada com sucesso');
    document.getElementById('comparacao-modal').classList.add('hidden');
    loadTable();
    loadStats();
  } catch (e) {
    errEl.textContent = e.message; errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar Comparação';
  }
}
