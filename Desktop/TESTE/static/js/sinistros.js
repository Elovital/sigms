/* SIGMS Sinistros Module */
import { get, post, put } from './api.js';
import { toast, formatDate, formatEuro, estadoBadge, debounce } from './utils.js';

let currentPage = 1;
let editingId = null;

export async function renderSinistros(container) {
  container.innerHTML = `
<div class="page-content">
  <div class="card">
    <div class="card-header">
      <span class="card-title">⚠️ Sinistros</span>
      <div class="flex gap-2">
        <select id="sin-filter" style="max-width:160px">
          <option value="">Todos os estados</option>
          <option value="Aberto">Aberto</option>
          <option value="Em Analise">Em Análise</option>
          <option value="Em Regularizacao">Em Regularização</option>
          <option value="Fechado">Fechado</option>
        </select>
        <button class="btn btn-primary" id="btn-new-sinistro">+ Novo Sinistro</button>
      </div>
    </div>
    <div id="sinistros-list"><div class="loading"><div class="spinner"></div></div></div>
    <div id="sinistros-pagination" class="pagination hidden"></div>
  </div>
</div>

<!-- Sinistro Modal -->
<div class="modal-overlay hidden" id="sinistro-modal">
  <div class="modal modal-lg">
    <div class="modal-header">
      <span class="modal-title" id="sin-modal-title">Novo Sinistro</span>
      <button class="btn btn-icon btn-secondary" onclick="document.getElementById('sinistro-modal').classList.add('hidden')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label>Número de Processo *</label>
          <input type="text" id="sin-numero" placeholder="SIN-2026-000001">
        </div>
        <div class="form-group">
          <label>Estado</label>
          <select id="sin-estado">
            <option value="Aberto">Aberto</option>
            <option value="Em Analise">Em Análise</option>
            <option value="Em Regularizacao">Em Regularização</option>
            <option value="Fechado">Fechado</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>ID da Apólice *</label>
          <input type="number" id="sin-apolice-id">
        </div>
        <div class="form-group">
          <label>ID do Cliente *</label>
          <input type="number" id="sin-client-id">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Data do Sinistro *</label>
          <input type="date" id="sin-data">
        </div>
        <div class="form-group">
          <label>Data de Participação</label>
          <input type="date" id="sin-data-part">
        </div>
      </div>
      <div class="form-group">
        <label>Descrição *</label>
        <textarea id="sin-descricao" rows="3"></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor Estimado (€)</label>
          <input type="number" id="sin-valor-est" step="0.01">
        </div>
        <div class="form-group">
          <label>Valor Pago (€)</label>
          <input type="number" id="sin-valor-pago" step="0.01">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Perito</label>
          <input type="text" id="sin-perito">
        </div>
        <div class="form-group"></div>
      </div>
      <div class="form-group">
        <label>Notas</label>
        <textarea id="sin-notas" rows="2"></textarea>
      </div>
      <div id="sin-form-error" class="alert alert-danger hidden"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('sinistro-modal').classList.add('hidden')">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-sinistro">Guardar</button>
    </div>
  </div>
</div>`;

  document.getElementById('btn-new-sinistro').addEventListener('click', () => openSinistroModal());
  document.getElementById('btn-save-sinistro').addEventListener('click', saveSinistro);
  document.getElementById('sin-filter').addEventListener('change', () => { currentPage = 1; loadSinistros(); });
  loadSinistros();
}

async function loadSinistros() {
  const container = document.getElementById('sinistros-list');
  container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const estado = document.getElementById('sin-filter').value;
  const params = new URLSearchParams({ page: currentPage, size: 20 });
  if (estado) params.set('estado', estado);
  try {
    const data = await get(`/sinistros?${params}`);
    const { total, items } = data;
    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Nenhum sinistro</div></div>`;
      return;
    }
    container.innerHTML = `
    <div class="table-wrapper"><table>
      <thead><tr><th>Processo</th><th>Apólice</th><th>Data</th><th>Estado</th><th>Valor Est.</th><th>Valor Pago</th><th>Ações</th></tr></thead>
      <tbody>
        ${items.map(s => `
        <tr>
          <td class="font-mono"><strong>${s.numero_processo}</strong></td>
          <td>${s.apolice_id}</td>
          <td>${formatDate(s.data_sinistro)}</td>
          <td>${estadoBadge(s.estado)}</td>
          <td class="text-right">${s.valor_estimado ? formatEuro(s.valor_estimado) : '-'}</td>
          <td class="text-right">${s.valor_pago ? formatEuro(s.valor_pago) : '-'}</td>
          <td>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-secondary" onclick="editSinistro(${s.id})">✏️</button>
              ${s.estado === 'Aberto' ? `<button class="btn btn-sm btn-secondary" onclick="advanceSinistro(${s.id},'Em Analise')">▶ Análise</button>` : ''}
              ${s.estado === 'Em Analise' ? `<button class="btn btn-sm btn-secondary" onclick="advanceSinistro(${s.id},'Em Regularizacao')">▶ Regularizar</button>` : ''}
              ${s.estado === 'Em Regularizacao' ? `<button class="btn btn-sm btn-success" onclick="advanceSinistro(${s.id},'Fechado')">✓ Fechar</button>` : ''}
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
    const pag = document.getElementById('sinistros-pagination');
    const totalPages = Math.ceil(total / 20);
    pag.classList.toggle('hidden', totalPages <= 1);
    if (totalPages > 1) {
      pag.innerHTML = `
        <span class="pagination-info">${total} sinistros</span>
        <div class="pagination-btns">
          <button class="btn btn-sm btn-secondary" ${currentPage<=1?'disabled':''} onclick="changeSinPage(${currentPage-1})">←</button>
          <button class="btn btn-sm btn-secondary" ${currentPage>=totalPages?'disabled':''} onclick="changeSinPage(${currentPage+1})">→</button>
        </div>`;
    }
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
  }
}

window.changeSinPage = (p) => { currentPage = p; loadSinistros(); };
window.editSinistro = async (id) => {
  try { const s = await get(`/sinistros/${id}`); openSinistroModal(s); } catch (e) { toast(e.message, 'error'); }
};
window.advanceSinistro = async (id, estado) => {
  try {
    await put(`/sinistros/${id}`, { estado });
    toast(`Estado atualizado: ${estado}`);
    loadSinistros();
  } catch (e) { toast(e.message, 'error'); }
};

function openSinistroModal(s = null) {
  editingId = s?.id || null;
  document.getElementById('sin-modal-title').textContent = s ? 'Editar Sinistro' : 'Novo Sinistro';
  document.getElementById('sin-numero').value = s?.numero_processo || '';
  document.getElementById('sin-numero').disabled = !!s;
  document.getElementById('sin-estado').value = s?.estado || 'Aberto';
  document.getElementById('sin-apolice-id').value = s?.apolice_id || '';
  document.getElementById('sin-client-id').value = s?.client_id || '';
  document.getElementById('sin-data').value = s?.data_sinistro || '';
  document.getElementById('sin-data-part').value = s?.data_participacao || '';
  document.getElementById('sin-descricao').value = s?.descricao || '';
  document.getElementById('sin-valor-est').value = s?.valor_estimado || '';
  document.getElementById('sin-valor-pago').value = s?.valor_pago || '';
  document.getElementById('sin-perito').value = s?.perito || '';
  document.getElementById('sin-notas').value = s?.notas || '';
  document.getElementById('sin-form-error').classList.add('hidden');
  document.getElementById('sinistro-modal').classList.remove('hidden');
}

async function saveSinistro() {
  const errEl = document.getElementById('sin-form-error');
  errEl.classList.add('hidden');
  const body = {
    numero_processo: document.getElementById('sin-numero').value,
    apolice_id: parseInt(document.getElementById('sin-apolice-id').value),
    client_id: parseInt(document.getElementById('sin-client-id').value),
    data_sinistro: document.getElementById('sin-data').value,
    data_participacao: document.getElementById('sin-data-part').value || null,
    descricao: document.getElementById('sin-descricao').value,
    estado: document.getElementById('sin-estado').value,
    valor_estimado: parseFloat(document.getElementById('sin-valor-est').value) || null,
    valor_pago: parseFloat(document.getElementById('sin-valor-pago').value) || null,
    perito: document.getElementById('sin-perito').value || null,
    notas: document.getElementById('sin-notas').value || null,
  };
  const btn = document.getElementById('btn-save-sinistro');
  btn.disabled = true;
  try {
    if (editingId) { await put(`/sinistros/${editingId}`, body); toast('Sinistro atualizado'); }
    else { await post('/sinistros', body); toast('Sinistro criado'); }
    document.getElementById('sinistro-modal').classList.add('hidden');
    loadSinistros();
  } catch (e) {
    errEl.textContent = e.message; errEl.classList.remove('hidden');
  } finally { btn.disabled = false; }
}
