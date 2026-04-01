/* SIGMS Apólices Module */
import { get, post, put, patch, del } from './api.js';
import { toast, formatDate, formatAKZ, estadoBadge, ramoBadge, debounce } from './utils.js';

let currentPage = 1;
let currentQuery = '';
let currentFilters = {};
let editingId = null;
let seguradoras = [];
let ramos = [];
let _currentUser = null;

export async function renderApolices(container, params = {}, currentUser = null) {
  _currentUser = currentUser;
  currentFilters = params;
  container.innerHTML = `
<div class="page-content">
  <div class="card">
    <div class="card-header">
      <span class="card-title">📋 Apólices</span>
      <div class="flex gap-2 items-center">
        <div class="search-bar">
          <span>🔍</span>
          <input type="text" id="apolice-search" placeholder="Número da apólice...">
        </div>
        <select id="filter-estado" style="max-width:140px">
          <option value="">Todos estados</option>
          <option value="Ativa">Ativa</option>
          <option value="Suspensa">Suspensa</option>
          <option value="Cancelada">Cancelada</option>
          <option value="Caducada">Caducada</option>
        </select>
        <select id="filter-ramo" style="max-width:150px">
          <option value="">Todos ramos</option>
        </select>
        <button class="btn btn-primary" id="btn-new-apolice">+ Nova Apólice</button>
      </div>
    </div>
    <div id="apolices-table-container">
      <div class="loading"><div class="spinner"></div> A carregar...</div>
    </div>
    <div id="apolices-pagination" class="pagination hidden"></div>
  </div>
</div>

<!-- Delete Modal -->
<div class="modal-overlay hidden" id="apolice-delete-modal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">Eliminar Apólice</span>
      <button class="btn btn-icon btn-secondary" onclick="document.getElementById('apolice-delete-modal').classList.add('hidden')">✕</button>
    </div>
    <div class="modal-body">
      <div class="alert alert-danger" style="margin-bottom:16px">Esta ação é irreversível. A apólice ficará desativada e um registo de auditoria será criado.</div>
      <div class="form-group">
        <label>Motivo da eliminação <span style="color:var(--danger)">*</span> <span style="color:var(--gray-400);font-weight:400">(mín. 10 caracteres)</span></label>
        <textarea id="delete-motivo" rows="3" placeholder="Descreva o motivo para eliminar esta apólice..."></textarea>
        <div class="field-error hidden" id="delete-motivo-error">O motivo deve ter pelo menos 10 caracteres.</div>
      </div>
      <div id="delete-apolice-info" style="font-size:13px;color:var(--gray-600);margin-top:8px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('apolice-delete-modal').classList.add('hidden')">Cancelar</button>
      <button class="btn btn-danger" id="btn-confirm-delete">Eliminar</button>
    </div>
  </div>
</div>

<!-- Apolice Modal -->
<div class="modal-overlay hidden" id="apolice-modal">
  <div class="modal modal-lg">
    <div class="modal-header">
      <span class="modal-title" id="apolice-modal-title">Nova Apólice</span>
      <button class="btn btn-icon btn-secondary" onclick="document.getElementById('apolice-modal').classList.add('hidden')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label>Número da Apólice *</label>
          <input type="text" id="a-numero" placeholder="APL-2026-000001">
        </div>
        <div class="form-group">
          <label>Estado</label>
          <select id="a-estado">
            <option value="Ativa">Ativa</option>
            <option value="Suspensa">Suspensa</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Vendedor</label>
          <input type="text" id="a-vendedor-display" readonly style="background:var(--gray-50);color:var(--gray-600)">
          <input type="hidden" id="a-vendedor-id">
        </div>
        <div class="form-group" id="a-vendedor-change-group" style="display:none">
          <label>Alterar Vendedor <span style="color:var(--gray-400);font-size:11px">(admin)</span></label>
          <select id="a-vendedor-select"></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Seguradora *</label>
          <select id="a-seguradora"></select>
        </div>
        <div class="form-group">
          <label>Ramo *</label>
          <select id="a-ramo" id="a-ramo"></select>
        </div>
      </div>
      <div class="form-group">
        <label>Cliente *</label>
        <input type="text" id="a-client-search" placeholder="Pesquisar cliente por nome ou NIF...">
        <input type="hidden" id="a-client-id">
        <div id="a-client-suggestions" style="border:1px solid var(--gray-200);border-radius:6px;max-height:150px;overflow-y:auto;display:none;background:white;position:absolute;z-index:100;width:calc(100% - 48px)"></div>
        <div class="field-hint" id="a-client-selected"></div>
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label>Data de Início *</label>
          <input type="date" id="a-data-inicio">
        </div>
        <div class="form-group">
          <label>Data de Fim *</label>
          <input type="date" id="a-data-fim">
        </div>
        <div class="form-group">
          <label>Data de Renovação</label>
          <input type="date" id="a-data-renovacao">
        </div>
      </div>
      <div class="form-group">
        <label>Observações</label>
        <textarea id="a-observacoes" rows="2"></textarea>
      </div>

      <!-- Prémio e Comissão -->
      <div style="font-size:13px;font-weight:600;color:var(--gray-700);margin-bottom:12px;padding-top:8px;border-top:1px solid var(--gray-200)">💰 Prémio & Comissão</div>
      <div class="form-row">
        <div class="form-group">
          <label>Prémio Base (Kz)</label>
          <input type="number" id="a-premio-base" step="0.01" placeholder="0.00" min="0">
        </div>
        <div class="form-group">
          <label>Fracionamento</label>
          <select id="a-fracionamento">
            <option value="Anual">Anual</option>
            <option value="Semestral">Semestral</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Mensal">Mensal</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Comissão (%)</label>
          <input type="number" id="a-comissao-pct" step="0.01" placeholder="ex: 10" min="0" max="100">
        </div>
        <div class="form-group">
          <label>Valor Comissão (Kz) <span style="color:var(--gray-400);font-weight:400">(calculado)</span></label>
          <input type="text" id="a-comissao-valor" readonly placeholder="0,00" style="background:var(--gray-50);color:var(--gray-600)">
        </div>
      </div>

      <!-- Risco sections -->
      <div id="risco-auto-section" class="hidden">
        <div style="font-size:13px;font-weight:600;color:var(--gray-700);margin-bottom:12px;padding-top:8px;border-top:1px solid var(--gray-200)">🚗 Risco Automóvel</div>
        <div class="form-row">
          <div class="form-group">
            <label>Matrícula *</label>
            <input type="text" id="ra-matricula" placeholder="LD-00-00-HD" style="text-transform:uppercase">
            <div class="field-error hidden" id="ra-matricula-error">Matrícula inválida</div>
          </div>
          <div class="form-group">
            <label>Nº Chassis</label>
            <input type="text" id="ra-chassis">
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>Marca</label><input type="text" id="ra-marca"></div>
          <div class="form-group"><label>Modelo</label><input type="text" id="ra-modelo"></div>
          <div class="form-group"><label>Ano</label><input type="number" id="ra-ano" min="1900" max="2030"></div>
        </div>
      </div>

      <div id="risco-sv-section" class="hidden">
        <div style="font-size:13px;font-weight:600;color:var(--gray-700);margin-bottom:12px;padding-top:8px;border-top:1px solid var(--gray-200)">❤️ Risco Saúde/Vida</div>
        <div class="form-row">
          <div class="form-group">
            <label>Capital Seguro (€)</label>
            <input type="number" id="rsv-capital" step="0.01">
          </div>
          <div class="form-group">
            <label>Início Cobertura</label>
            <input type="date" id="rsv-inicio">
          </div>
        </div>
      </div>

      <div id="risco-empresa-section" class="hidden">
        <div style="font-size:13px;font-weight:600;color:var(--gray-700);margin-bottom:12px;padding-top:8px;border-top:1px solid var(--gray-200)">🏢 Risco Empresa</div>
        <div class="form-row">
          <div class="form-group">
            <label>Tipo Empresa</label>
            <select id="re-tipo">
              <option value="Frota">Frota</option>
              <option value="AT">Acidentes de Trabalho</option>
              <option value="Multirriscos">Multirriscos</option>
            </select>
          </div>
          <div class="form-group">
            <label>Nº Veículos</label>
            <input type="number" id="re-veiculos">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Nº Trabalhadores</label>
            <input type="number" id="re-trabalhadores">
          </div>
          <div class="form-group">
            <label>Descrição</label>
            <input type="text" id="re-descricao">
          </div>
        </div>
      </div>

      <div id="apolice-form-error" class="alert alert-danger hidden" style="margin-top:12px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('apolice-modal').classList.add('hidden')">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-apolice">Guardar</button>
    </div>
  </div>
</div>`;

  // Load lookups
  [seguradoras, ramos] = await Promise.all([
    get('/apolices/lookup/seguradoras').catch(() => []),
    get('/apolices/lookup/ramos').catch(() => []),
  ]);

  const segSelect = document.getElementById('a-seguradora');
  seguradoras.forEach(s => segSelect.innerHTML += `<option value="${s.id}">${s.nome}</option>`);
  const ramoSelect = document.getElementById('a-ramo');
  const filterRamo = document.getElementById('filter-ramo');
  ramos.forEach(r => {
    ramoSelect.innerHTML += `<option value="${r.id}" data-codigo="${r.codigo}">${r.nome}</option>`;
    filterRamo.innerHTML += `<option value="${r.codigo}">${r.nome}</option>`;
  });

  if (params.client_id) currentFilters.client_id = params.client_id;

  // Check if coming from Prospecção conversion
  const convertData = sessionStorage.getItem('convert_prosp');
  if (params.from_prosp && convertData) {
    sessionStorage.removeItem('convert_prosp');
    const prosp = JSON.parse(convertData);
    // Pre-fill and open modal after a short tick so DOM is ready
    setTimeout(() => {
      const prefill = {
        client_id: prosp.client_id,
        client_nome: prosp.client_nome,
        client_nif: prosp.client_nif,
        seguradora_id: prosp.seguradora_id,
        ramo_id: prosp.ramo_id,
        premio_base: prosp.premio_estimado,
        percentagem_comissao: prosp.percentagem_comissao,
        observacoes: prosp.notas ? `Convertido de prospecção: ${prosp.titulo}\n${prosp.notas}` : `Convertido de prospecção: ${prosp.titulo}`,
      };
      openApoliceModal(prefill);
    }, 100);
  }

  // Ramo change -> show/hide risco sections
  document.getElementById('a-ramo').addEventListener('change', updateRiscoSections);

  // Client search
  const clientSearch = document.getElementById('a-client-search');
  clientSearch.addEventListener('input', debounce(async e => {
    const q = e.target.value;
    if (q.length < 2) { document.getElementById('a-client-suggestions').style.display = 'none'; return; }
    const data = await get(`/clients?q=${q}&size=5`);
    const sugg = document.getElementById('a-client-suggestions');
    sugg.innerHTML = data.items.map(c => `<div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--gray-100)" onmousedown="selectClient(${c.id},'${c.nome}','${c.nif}')">${c.nome} <span class="font-mono text-sm text-gray">${c.nif}</span></div>`).join('');
    sugg.style.display = data.items.length ? 'block' : 'none';
  }));

  window.selectClient = (id, nome, nif) => {
    document.getElementById('a-client-id').value = id;
    document.getElementById('a-client-search').value = `${nome} (${nif})`;
    document.getElementById('a-client-selected').textContent = '';
    document.getElementById('a-client-suggestions').style.display = 'none';
  };

  document.getElementById('a-data-fim').addEventListener('change', e => {
    if (!document.getElementById('a-data-renovacao').value) {
      document.getElementById('a-data-renovacao').value = e.target.value;
    }
  });

  // Auto-calculate commission value
  function calcComissao() {
    const base = parseFloat(document.getElementById('a-premio-base').value) || 0;
    const pct = parseFloat(document.getElementById('a-comissao-pct').value) || 0;
    const valor = base * pct / 100;
    document.getElementById('a-comissao-valor').value = valor > 0 ? formatAKZ(valor) : '';
  }
  document.getElementById('a-premio-base').addEventListener('input', calcComissao);
  document.getElementById('a-comissao-pct').addEventListener('input', calcComissao);

  document.getElementById('btn-new-apolice').addEventListener('click', () => openApoliceModal());
  document.getElementById('btn-save-apolice').addEventListener('click', saveApolice);

  document.getElementById('apolice-search').addEventListener('input', debounce(e => {
    currentQuery = e.target.value; currentPage = 1; loadApolicesTable();
  }));
  document.getElementById('filter-estado').addEventListener('change', e => { currentFilters.estado = e.target.value; currentPage = 1; loadApolicesTable(); });
  document.getElementById('filter-ramo').addEventListener('change', e => { currentFilters.ramo = e.target.value; currentPage = 1; loadApolicesTable(); });

  loadApolicesTable();
}

function updateRiscoSections() {
  const ramoEl = document.getElementById('a-ramo');
  const codigo = ramoEl.options[ramoEl.selectedIndex]?.dataset.codigo || '';
  document.getElementById('risco-auto-section').classList.toggle('hidden', codigo !== 'AUTO');
  document.getElementById('risco-sv-section').classList.toggle('hidden', !['SAUDE','VIDA'].includes(codigo));
  document.getElementById('risco-empresa-section').classList.toggle('hidden', !['AT','MULTI','RC'].includes(codigo));
}

async function loadApolicesTable() {
  const container = document.getElementById('apolices-table-container');
  container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const params = new URLSearchParams({ page: currentPage, size: 20 });
    if (currentQuery) params.set('q', currentQuery);
    if (currentFilters.estado) params.set('estado', currentFilters.estado);
    if (currentFilters.ramo) params.set('ramo', currentFilters.ramo);
    if (currentFilters.client_id) params.set('client_id', currentFilters.client_id);
    const data = await get(`/apolices?${params}`);
    const { total, items } = data;

    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Nenhuma apólice encontrada</div></div>`;
      return;
    }

    container.innerHTML = `
    <div class="table-wrapper"><table>
      <thead><tr><th>Número</th><th>Seguradora</th><th>Ramo</th><th>Início</th><th>Renovação</th><th>Vendedor</th><th>Estado</th><th>Ações</th></tr></thead>
      <tbody>
        ${items.map(a => `
        <tr>
          <td class="font-mono"><strong>${a.numero}</strong></td>
          <td>${a.seguradora || '-'}</td>
          <td>${a.ramo_codigo ? ramoBadge(a.ramo_codigo) : '-'}</td>
          <td>${formatDate(a.data_inicio)}</td>
          <td>${formatDate(a.data_renovacao)}</td>
          <td><span style="font-size:12px;color:var(--gray-600)">${a.vendedor_nome || '-'}</span></td>
          <td>${estadoBadge(a.estado)}</td>
          <td>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-secondary" onclick="viewApolice(${a.id})">👁️</button>
              <button class="btn btn-sm btn-secondary" onclick="editApolice(${a.id})">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="openDeleteApolice(${a.id},'${a.numero}')">🗑️</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;

    const pag = document.getElementById('apolices-pagination');
    const totalPages = Math.ceil(total / 20);
    if (totalPages > 1) {
      pag.classList.remove('hidden');
      pag.innerHTML = `
        <span class="pagination-info">${total} apólices</span>
        <div class="pagination-btns">
          <button class="btn btn-sm btn-secondary" ${currentPage<=1?'disabled':''} onclick="changeApolPage(${currentPage-1})">← Anterior</button>
          <button class="btn btn-sm btn-secondary" ${currentPage>=totalPages?'disabled':''} onclick="changeApolPage(${currentPage+1})">Próxima →</button>
        </div>`;
    }
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
  }
}

window.changeApolPage = (p) => { currentPage = p; loadApolicesTable(); };
window.viewApolice = (id) => { window.location.hash = `#/apolices/${id}`; };
window.editApolice = async (id) => {
  try { const a = await get(`/apolices/${id}`); openApoliceModal(a); } catch (e) { toast(e.message, 'error'); }
};

async function openApoliceModal(apolice = null) {
  editingId = apolice?.id || null;
  document.getElementById('apolice-modal-title').textContent = apolice?.id ? 'Editar Apólice' : 'Nova Apólice';
  document.getElementById('a-numero').value = apolice?.numero || '';
  document.getElementById('a-numero').disabled = !!apolice?.id;
  document.getElementById('a-estado').value = apolice?.estado || 'Ativa';
  if (apolice?.seguradora_id) document.getElementById('a-seguradora').value = apolice.seguradora_id;
  if (apolice?.ramo_id) document.getElementById('a-ramo').value = apolice.ramo_id;
  document.getElementById('a-data-inicio').value = apolice?.data_inicio || '';
  document.getElementById('a-data-fim').value = apolice?.data_fim || '';
  document.getElementById('a-data-renovacao').value = apolice?.data_renovacao || '';
  document.getElementById('a-observacoes').value = apolice?.observacoes || '';
  if (apolice?.client_id) {
    document.getElementById('a-client-id').value = apolice.client_id;
    if (apolice.client_nome) {
      document.getElementById('a-client-search').value = `${apolice.client_nome}${apolice.client_nif ? ' (' + apolice.client_nif + ')' : ''}`;
    }
  } else {
    document.getElementById('a-client-id').value = '';
    document.getElementById('a-client-search').value = '';
  }
  // Vendedor
  const vendedorDisplay = document.getElementById('a-vendedor-display');
  const vendedorHidden = document.getElementById('a-vendedor-id');
  const vendedorChangeGroup = document.getElementById('a-vendedor-change-group');
  if (apolice?.vendedor_id) {
    vendedorDisplay.value = apolice.vendedor_nome || '';
    vendedorHidden.value = apolice.vendedor_id;
  } else {
    vendedorDisplay.value = _currentUser?.username || '';
    vendedorHidden.value = '';
  }
  if (_currentUser?.role === 'admin') {
    vendedorChangeGroup.style.display = '';
    const sel = document.getElementById('a-vendedor-select');
    sel.innerHTML = '<option value="">A carregar...</option>';
    try {
      const users = await get('/admin/users');
      sel.innerHTML = users.filter(u => u.is_active).map(u => `<option value="${u.id}">${u.username}</option>`).join('');
      if (apolice?.vendedor_id) sel.value = apolice.vendedor_id;
      sel.onchange = async () => {
        if (!editingId) return;
        const uid = parseInt(sel.value);
        try {
          const r = await patch(`/apolices/${editingId}/vendedor`, { vendedor_id: uid });
          vendedorDisplay.value = r.vendedor_nome;
          vendedorHidden.value = r.vendedor_id;
          toast('Vendedor atualizado');
        } catch (e) { toast(e.message, 'error'); }
      };
    } catch { sel.innerHTML = ''; }
  } else {
    vendedorChangeGroup.style.display = 'none';
  }
  // Premio & comissão
  document.getElementById('a-premio-base').value = apolice?.premio_base || '';
  document.getElementById('a-fracionamento').value = apolice?.fracionamento || 'Anual';
  document.getElementById('a-comissao-pct').value = apolice?.percentagem_comissao || '';
  const base = parseFloat(document.getElementById('a-premio-base').value) || 0;
  const pct = parseFloat(document.getElementById('a-comissao-pct').value) || 0;
  const valor = base * pct / 100;
  document.getElementById('a-comissao-valor').value = valor > 0 ? formatAKZ(valor) : '';
  // Risco fields
  if (apolice?.risco_auto) {
    document.getElementById('ra-matricula').value = apolice.risco_auto.matricula || '';
    document.getElementById('ra-chassis').value = apolice.risco_auto.chassis || '';
    document.getElementById('ra-marca').value = apolice.risco_auto.marca || '';
    document.getElementById('ra-modelo').value = apolice.risco_auto.modelo || '';
    document.getElementById('ra-ano').value = apolice.risco_auto.ano || '';
  }
  if (apolice?.risco_saude_vida) {
    document.getElementById('rsv-capital').value = apolice.risco_saude_vida.capital_seguro || '';
    document.getElementById('rsv-inicio').value = apolice.risco_saude_vida.data_inicio_cobertura || '';
  }
  document.getElementById('apolice-form-error').classList.add('hidden');
  updateRiscoSections();
  document.getElementById('apolice-modal').classList.remove('hidden');
}

async function saveApolice() {
  const errEl = document.getElementById('apolice-form-error');
  errEl.classList.add('hidden');
  const ramoEl = document.getElementById('a-ramo');
  const ramo_codigo = ramoEl.options[ramoEl.selectedIndex]?.dataset.codigo || '';

  const body = {
    numero: document.getElementById('a-numero').value,
    client_id: parseInt(document.getElementById('a-client-id').value),
    seguradora_id: parseInt(document.getElementById('a-seguradora').value),
    ramo_id: parseInt(document.getElementById('a-ramo').value),
    data_inicio: document.getElementById('a-data-inicio').value,
    data_fim: document.getElementById('a-data-fim').value,
    data_renovacao: document.getElementById('a-data-renovacao').value || null,
    estado: document.getElementById('a-estado').value,
    observacoes: document.getElementById('a-observacoes').value || null,
    premio_base: parseFloat(document.getElementById('a-premio-base').value) || null,
    fracionamento: document.getElementById('a-fracionamento').value,
    percentagem_comissao: parseFloat(document.getElementById('a-comissao-pct').value) || null,
  };

  if (ramo_codigo === 'AUTO') body.risco_auto = {
    matricula: document.getElementById('ra-matricula').value.toUpperCase(),
    chassis: document.getElementById('ra-chassis').value || null,
    marca: document.getElementById('ra-marca').value || null,
    modelo: document.getElementById('ra-modelo').value || null,
    ano: parseInt(document.getElementById('ra-ano').value) || null,
  };

  if (['SAUDE','VIDA'].includes(ramo_codigo)) body.risco_saude_vida = {
    tipo: ramo_codigo === 'SAUDE' ? 'Saude' : 'Vida',
    capital_seguro: parseFloat(document.getElementById('rsv-capital').value) || null,
    data_inicio_cobertura: document.getElementById('rsv-inicio').value || null,
  };

  const btn = document.getElementById('btn-save-apolice');
  btn.disabled = true; btn.textContent = 'A guardar...';
  try {
    if (editingId) { await put(`/apolices/${editingId}`, body); toast('Apólice atualizada'); }
    else { await post('/apolices', body); toast('Apólice criada'); }
    document.getElementById('apolice-modal').classList.add('hidden');
    loadApolicesTable();
  } catch (e) {
    errEl.textContent = e.message; errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar';
  }
}

let deletingApoliceId = null;
window.openDeleteApolice = (id, numero) => {
  deletingApoliceId = id;
  document.getElementById('delete-motivo').value = '';
  document.getElementById('delete-motivo-error').classList.add('hidden');
  document.getElementById('delete-apolice-info').textContent = `Apólice: ${numero}`;
  document.getElementById('apolice-delete-modal').classList.remove('hidden');
  document.getElementById('btn-confirm-delete').onclick = confirmDeleteApolice;
};

async function confirmDeleteApolice() {
  const motivo = document.getElementById('delete-motivo').value.trim();
  const errEl = document.getElementById('delete-motivo-error');
  if (motivo.length < 10) { errEl.classList.remove('hidden'); return; }
  errEl.classList.add('hidden');
  const btn = document.getElementById('btn-confirm-delete');
  btn.disabled = true; btn.textContent = 'A eliminar...';
  try {
    await del(`/apolices/${deletingApoliceId}?motivo=${encodeURIComponent(motivo)}`);
    toast('Apólice eliminada', 'success');
    document.getElementById('apolice-delete-modal').classList.add('hidden');
    loadApolicesTable();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Eliminar';
  }
}
