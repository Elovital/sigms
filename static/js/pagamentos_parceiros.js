/* Pagamentos a Parceiros — registo manual + relatório */
import { get, post, put, del } from './api.js';
import { toast, formatAKZ, formatDate } from './utils.js';

const FORMAS = ['Transferência', 'Multicaixa', 'TPA'];
const TIPOS = ['MO', 'Seguro', 'Vida', 'Saúde', 'Automóvel', 'Outro'];
let _editId = null;

function estadoBadgePP(e) {
  const cor = e === 'Pago' ? 'badge-green' : 'badge-yellow';
  return `<span class="badge ${cor}">${e}</span>`;
}

export async function renderPagamentosParceiros(container) {
  container.innerHTML = `
<div class="page-content">
  <div class="tabs" style="margin-bottom:16px">
    <div class="tab active" data-pp-tab="registo">📝 Registo de Pagamentos</div>
    <div class="tab" data-pp-tab="relatorio">📊 Relatório</div>
  </div>

  <!-- ABA REGISTO -->
  <div id="pp-tab-registo">
    <div class="card">
      <div class="card-header"><span class="card-title">💸 Novo Pagamento a Parceiro</span></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Data *</label><input type="date" id="pp-data"></div>
          <div class="form-group"><label>Quem recebeu *</label><input type="text" id="pp-recebedor" placeholder="Nome do beneficiário"></div>
          <div class="form-group"><label>Valor (Kz)</label><input type="number" id="pp-valor" step="0.01" min="0" placeholder="0,00"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Forma de Pagamento *</label>
            <select id="pp-forma">${FORMAS.map(f => `<option value="${f}">${f}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label>Estado *</label>
            <select id="pp-estado"><option value="Pago">Pago</option><option value="Pendente">Pendente</option></select>
          </div>
          <div class="form-group"><label>Tipo de Serviço</label>
            <select id="pp-tipo"><option value="">—</option>${TIPOS.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Cliente / Referência</label><input type="text" id="pp-cliente" placeholder="Cliente ou referência"></div>
          <div class="form-group"><label>Banco</label><input type="text" id="pp-banco" placeholder="Banco"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>IBAN</label><input type="text" id="pp-iban" placeholder="AO06 ..." style="text-transform:uppercase"></div>
          <div class="form-group"><label>Nº da Transferência</label><input type="text" id="pp-numtransf" placeholder="Referência da transferência"></div>
        </div>
        <div class="form-group"><label>Notas</label><textarea id="pp-notas" rows="2" placeholder="Observações (opcional)"></textarea></div>
        <div id="pp-form-error" class="alert alert-danger hidden" style="margin:8px 0"></div>
        <div class="flex gap-2">
          <button class="btn btn-primary" id="pp-save">Guardar Pagamento</button>
          <button class="btn btn-secondary hidden" id="pp-cancel">Cancelar edição</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Últimos Pagamentos Registados</span></div>
      <div id="pp-list"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  </div>

  <!-- ABA RELATÓRIO -->
  <div id="pp-tab-relatorio" class="hidden">
    <div class="card">
      <div class="card-header"><span class="card-title">📊 Relatório de Pagamentos</span></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Cliente / Beneficiário</label><input type="text" id="pp-f-cliente" placeholder="Filtrar por nome..."></div>
          <div class="form-group"><label>De</label><input type="date" id="pp-f-inicio"></div>
          <div class="form-group"><label>Até</label><input type="date" id="pp-f-fim"></div>
          <div class="form-group"><label>Estado</label>
            <select id="pp-f-estado"><option value="">Todos</option><option value="Pago">Pago</option><option value="Pendente">Pendente</option></select>
          </div>
        </div>
        <div class="flex gap-2"><button class="btn btn-primary" id="pp-f-aplicar">Aplicar Filtros</button><button class="btn btn-secondary" id="pp-f-limpar">Limpar</button></div>
      </div>
    </div>
    <div class="kpi-grid" id="pp-rel-kpis" style="grid-template-columns:repeat(4,1fr)"></div>
    <div class="card"><div id="pp-rel-list"><div class="loading"><div class="spinner"></div></div></div></div>
  </div>
</div>`;

  // Tabs
  container.querySelectorAll('[data-pp-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('[data-pp-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const t = tab.dataset.ppTab;
      document.getElementById('pp-tab-registo').classList.toggle('hidden', t !== 'registo');
      document.getElementById('pp-tab-relatorio').classList.toggle('hidden', t !== 'relatorio');
      if (t === 'relatorio') loadRelatorio();
    });
  });

  document.getElementById('pp-save').addEventListener('click', savePagamento);
  document.getElementById('pp-cancel').addEventListener('click', resetForm);
  document.getElementById('pp-f-aplicar').addEventListener('click', loadRelatorio);
  document.getElementById('pp-f-limpar').addEventListener('click', () => {
    ['pp-f-cliente', 'pp-f-inicio', 'pp-f-fim'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('pp-f-estado').value = '';
    loadRelatorio();
  });

  loadList();
}

function readForm() {
  return {
    data: document.getElementById('pp-data').value,
    recebedor: document.getElementById('pp-recebedor').value.trim(),
    valor: parseFloat(document.getElementById('pp-valor').value) || null,
    forma_pagamento: document.getElementById('pp-forma').value,
    estado: document.getElementById('pp-estado').value,
    tipo_servico: document.getElementById('pp-tipo').value || null,
    cliente_referencia: document.getElementById('pp-cliente').value.trim() || null,
    banco: document.getElementById('pp-banco').value.trim() || null,
    iban: document.getElementById('pp-iban').value.trim().toUpperCase() || null,
    numero_transferencia: document.getElementById('pp-numtransf').value.trim() || null,
    notas: document.getElementById('pp-notas').value.trim() || null,
  };
}

function resetForm() {
  _editId = null;
  ['pp-data', 'pp-recebedor', 'pp-valor', 'pp-cliente', 'pp-banco', 'pp-iban', 'pp-numtransf', 'pp-notas'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pp-forma').value = 'Transferência';
  document.getElementById('pp-estado').value = 'Pago';
  document.getElementById('pp-tipo').value = '';
  document.getElementById('pp-form-error').classList.add('hidden');
  document.getElementById('pp-save').textContent = 'Guardar Pagamento';
  document.getElementById('pp-cancel').classList.add('hidden');
}

async function savePagamento() {
  const errEl = document.getElementById('pp-form-error');
  errEl.classList.add('hidden');
  const body = readForm();
  if (!body.data) { errEl.textContent = 'A data é obrigatória.'; errEl.classList.remove('hidden'); return; }
  if (!body.recebedor) { errEl.textContent = 'O nome de quem recebeu é obrigatório.'; errEl.classList.remove('hidden'); return; }
  const btn = document.getElementById('pp-save');
  btn.disabled = true;
  try {
    if (_editId) { await put(`/pagamentos-parceiros/${_editId}`, body); toast('Pagamento atualizado'); }
    else { await post('/pagamentos-parceiros', body); toast('Pagamento registado'); }
    resetForm();
    loadList();
  } catch (e) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
  finally { btn.disabled = false; }
}

function rowsTable(itens, withActions) {
  if (!itens.length) return `<div class="empty-state"><div class="empty-state-icon">💸</div><div class="empty-state-title">Sem pagamentos</div></div>`;
  return `<div class="table-wrapper"><table>
    <thead><tr><th>Data</th><th>Recebedor</th><th>Cliente/Ref.</th><th>Serviço</th><th>Forma</th><th>Banco</th><th>Nº Transf.</th><th class="text-right">Valor</th><th>Estado</th>${withActions ? '<th>Ações</th>' : ''}</tr></thead>
    <tbody>${itens.map(p => `
      <tr>
        <td>${formatDate(p.data)}</td>
        <td><strong>${p.recebedor}</strong>${p.iban ? `<br><span style="font-size:11px;color:var(--gray-500)" class="font-mono">${p.iban}</span>` : ''}</td>
        <td>${p.cliente_referencia || '—'}</td>
        <td>${p.tipo_servico || '—'}</td>
        <td>${p.forma_pagamento}</td>
        <td>${p.banco || '—'}</td>
        <td class="font-mono">${p.numero_transferencia || '—'}</td>
        <td class="text-right font-mono">${p.valor != null ? formatAKZ(p.valor) : '—'}</td>
        <td>${estadoBadgePP(p.estado)}</td>
        ${withActions ? `<td><div class="flex gap-2">
          <button class="btn btn-sm btn-secondary" onclick="ppEdit(${p.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="ppDelete(${p.id})">🗑️</button>
        </div></td>` : ''}
      </tr>`).join('')}</tbody></table></div>`;
}

let _cacheItens = [];
async function loadList() {
  const el = document.getElementById('pp-list');
  el.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const data = await get('/pagamentos-parceiros');
    _cacheItens = data.itens;
    el.innerHTML = rowsTable(data.itens.slice(0, 30), true);
    window.ppEdit = (id) => {
      const p = _cacheItens.find(x => x.id === id);
      if (!p) return;
      _editId = id;
      document.getElementById('pp-data').value = p.data || '';
      document.getElementById('pp-recebedor').value = p.recebedor || '';
      document.getElementById('pp-valor').value = p.valor ?? '';
      document.getElementById('pp-forma').value = p.forma_pagamento || 'Transferência';
      document.getElementById('pp-estado').value = p.estado || 'Pago';
      document.getElementById('pp-tipo').value = p.tipo_servico || '';
      document.getElementById('pp-cliente').value = p.cliente_referencia || '';
      document.getElementById('pp-banco').value = p.banco || '';
      document.getElementById('pp-iban').value = p.iban || '';
      document.getElementById('pp-numtransf').value = p.numero_transferencia || '';
      document.getElementById('pp-notas').value = p.notas || '';
      document.getElementById('pp-save').textContent = 'Atualizar Pagamento';
      document.getElementById('pp-cancel').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.ppDelete = async (id) => {
      if (!confirm('Eliminar este pagamento?')) return;
      try { await del(`/pagamentos-parceiros/${id}`); toast('Pagamento eliminado'); loadList(); }
      catch (e) { toast(e.message, 'error'); }
    };
  } catch (e) { el.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`; }
}

async function loadRelatorio() {
  const params = new URLSearchParams();
  const cli = document.getElementById('pp-f-cliente').value.trim();
  const ini = document.getElementById('pp-f-inicio').value;
  const fim = document.getElementById('pp-f-fim').value;
  const est = document.getElementById('pp-f-estado').value;
  if (cli) params.set('cliente', cli);
  if (ini) params.set('data_inicio', ini);
  if (fim) params.set('data_fim', fim);
  if (est) params.set('estado', est);
  const kpiEl = document.getElementById('pp-rel-kpis');
  const listEl = document.getElementById('pp-rel-list');
  listEl.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const d = await get(`/pagamentos-parceiros?${params}`);
    kpiEl.innerHTML = `
      <div class="kpi-card"><div class="kpi-icon blue">📋</div><div class="kpi-info"><div class="kpi-value">${d.total}</div><div class="kpi-label">Total de Registos</div></div></div>
      <div class="kpi-card"><div class="kpi-icon green">✅</div><div class="kpi-info"><div class="kpi-value">${formatAKZ(d.total_pago)}</div><div class="kpi-label">Pago (${d.num_pagos})</div></div></div>
      <div class="kpi-card"><div class="kpi-icon yellow">⏳</div><div class="kpi-info"><div class="kpi-value">${formatAKZ(d.total_pendente)}</div><div class="kpi-label">Pendente (${d.num_pendentes})</div></div></div>
      <div class="kpi-card"><div class="kpi-icon blue">💰</div><div class="kpi-info"><div class="kpi-value">${formatAKZ(d.total_pago + d.total_pendente)}</div><div class="kpi-label">Total Geral</div></div></div>`;
    listEl.innerHTML = rowsTable(d.itens, false);
  } catch (e) { listEl.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`; }
}
