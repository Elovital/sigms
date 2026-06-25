/* SIGMS Financeiro Module */
import { get, post, put } from './api.js';
import { toast, formatDate, formatAKZ, estadoBadge } from './utils.js';
import { renderPagamentosParceiros } from './pagamentos_parceiros.js';

export async function renderFinanceiro(container, currentUser = null) {
  container.innerHTML = `
<div class="page-content">
  <div id="fin-summary" style="margin-bottom:16px">
    <div class="loading"><div class="spinner"></div></div>
  </div>

  <div class="tabs" id="fin-tabs">
    <div class="tab active" data-tab="pagamentos">Recibos / Pagamentos</div>
    <div class="tab" data-tab="comissoes">Comissões</div>
    <div class="tab" data-tab="compliance">⚖️ Compliance</div>
    <div class="tab" data-tab="novo-premio">Registar Prémio</div>
    <div class="tab" data-tab="parceiros">💳 Pagamentos a Parceiros</div>
  </div>

  <div id="tab-parceiros" class="hidden"></div>

  <div id="tab-pagamentos">
    <div class="card">
      <div class="card-header">
        <span class="card-title">💳 Pagamentos</span>
        <div class="flex gap-2">
          <select id="pag-filter-estado" style="max-width:140px">
            <option value="">Todos</option>
            <option value="Pendente">Pendente</option>
            <option value="Atrasado">Atrasado</option>
            <option value="Pago">Pago</option>
          </select>
        </div>
      </div>
      <div id="pagamentos-list"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  </div>

  <div id="tab-comissoes" class="hidden">
    <div class="card">
      <div class="card-header">
        <span class="card-title">💰 Comissões</span>
        <div class="flex gap-2">
          <select id="com-filter-estado" style="max-width:140px">
            <option value="">Todas</option>
            <option value="Prevista">Prevista</option>
            <option value="Recebida">Recebida</option>
            <option value="Paga">Paga</option>
            <option value="Estornada">Estornada</option>
          </select>
        </div>
      </div>
      <div id="comissoes-list"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  </div>

  <div id="tab-novo-premio" class="hidden">
    <div class="card">
      <div class="card-header"><span class="card-title">➕ Registar Prémio</span></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label>ID da Apólice *</label>
            <input type="number" id="np-apolice-id" placeholder="ID da apólice">
          </div>
          <div class="form-group">
            <label>Ramo (código)</label>
            <input type="text" id="np-ramo" placeholder="AUTO / VIDA / etc." value="AUTO">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Prémio Base (Kz) *</label>
            <input type="number" id="np-base" step="0.01" placeholder="0.00">
          </div>
          <div class="form-group">
            <label>Encargos (Kz)</label>
            <input type="number" id="np-encargos" step="0.01" value="0">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Fracionamento</label>
            <select id="np-fracionamento">
              <option value="Anual">Anual</option>
              <option value="Semestral">Semestral</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Mensal">Mensal</option>
            </select>
          </div>
          <div class="form-group">
            <label>Tipo Comissão</label>
            <select id="np-tipo-com">
              <option value="angariacao">Angariação</option>
              <option value="renovacao">Renovação</option>
              <option value="gestao">Gestão</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Início Período</label>
            <input type="date" id="np-inicio">
          </div>
          <div class="form-group">
            <label>Fim Período</label>
            <input type="date" id="np-fim">
          </div>
        </div>

        <div id="np-preview" class="alert alert-info hidden" style="margin-bottom:8px"></div>
        <div id="np-error" class="alert alert-danger hidden"></div>

        <div class="flex gap-2 mt-4">
          <button class="btn btn-secondary" id="btn-preview-premio">Pré-visualizar</button>
          <button class="btn btn-primary" id="btn-save-premio">Registar Prémio</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Compliance Tab -->
<div id="tab-compliance" class="hidden">
  <div id="compliance-content">
    <div class="loading"><div class="spinner"></div> A carregar dados de compliance...</div>
  </div>
</div>

<!-- Comissão Edit Modal -->
<div class="modal-overlay hidden" id="comissao-edit-modal">
  <div class="modal" style="max-width:400px">
    <div class="modal-header">
      <span class="modal-title">Editar Comissão</span>
      <button class="btn btn-icon btn-secondary" onclick="document.getElementById('comissao-edit-modal').classList.add('hidden')">✕</button>
    </div>
    <div class="modal-body">
      <div id="comissao-edit-info" style="font-size:13px;color:var(--gray-600);margin-bottom:16px"></div>
      <div class="form-group">
        <label>Estado</label>
        <select id="comissao-edit-estado">
          <option value="Prevista">Prevista</option>
          <option value="Recebida">Recebida</option>
          <option value="Paga">Paga</option>
          <option value="Estornada">Estornada</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('comissao-edit-modal').classList.add('hidden')">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-comissao-edit">Guardar</button>
    </div>
  </div>
</div>`;

  // Tabs
  document.querySelectorAll('#fin-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#fin-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabs = ['pagamentos', 'comissoes', 'compliance', 'novo-premio', 'parceiros'];
      tabs.forEach(t =>
        document.getElementById(`tab-${t}`)?.classList.toggle('hidden', t !== tab.dataset.tab));
      if (tab.dataset.tab === 'compliance') loadCompliance();
      if (tab.dataset.tab === 'parceiros') renderPagamentosParceiros(document.getElementById('tab-parceiros'));
    });
  });

  document.getElementById('pag-filter-estado').addEventListener('change', () => loadPagamentos());
  document.getElementById('com-filter-estado').addEventListener('change', () => loadComissoes());

  document.getElementById('btn-preview-premio').addEventListener('click', previewPremio);
  document.getElementById('btn-save-premio').addEventListener('click', savePremio);

  loadSummary();
  loadPagamentos();
  loadComissoes();
}

async function loadSummary() {
  try {
    const s = await get('/financeiro/summary');
    document.getElementById('fin-summary').innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(5,1fr)">
      <div class="kpi-card"><div class="kpi-icon blue">📊</div><div class="kpi-info"><div class="kpi-value">${formatAKZ(s.total_premios)}</div><div class="kpi-label">Total Prémios</div></div></div>
      <div class="kpi-card"><div class="kpi-icon yellow">⏳</div><div class="kpi-info"><div class="kpi-value">${formatAKZ(s.comissoes_previstas)}</div><div class="kpi-label">Comissões Previstas</div></div></div>
      <div class="kpi-card"><div class="kpi-icon green">✅</div><div class="kpi-info"><div class="kpi-value">${formatAKZ(s.comissoes_recebidas)}</div><div class="kpi-label">Comissões Recebidas</div></div></div>
      <div class="kpi-card"><div class="kpi-icon blue">💸</div><div class="kpi-info"><div class="kpi-value">${formatAKZ(s.comissoes_pagas || 0)}</div><div class="kpi-label">Comissões Pagas</div></div></div>
      <div class="kpi-card"><div class="kpi-icon red">❗</div><div class="kpi-info"><div class="kpi-value">${s.pagamentos_atrasados}</div><div class="kpi-label">Pagamentos Atrasados</div></div></div>
    </div>`;
  } catch {}
}

async function loadPagamentos() {
  const container = document.getElementById('pagamentos-list');
  container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const estado = document.getElementById('pag-filter-estado').value;
  const params = new URLSearchParams({ page: 1, size: 50 });
  if (estado) params.set('estado', estado);
  try {
    const data = await get(`/financeiro/pagamentos?${params}`);
    if (!data.items.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💳</div><div class="empty-state-title">Sem pagamentos</div></div>`;
      return;
    }
    container.innerHTML = `
    <div class="table-wrapper"><table>
      <thead><tr><th>Apólice</th><th>Vencimento</th><th>Valor</th><th>Estado</th><th>Data Pagamento</th><th>Ações</th></tr></thead>
      <tbody>
        ${data.items.map(p => `
        <tr>
          <td class="font-mono"><strong>${p.apolice_numero || '#' + p.premio_id}</strong></td>
          <td>${formatDate(p.data_vencimento)}</td>
          <td class="text-right font-mono">${formatAKZ(p.valor)}</td>
          <td>${estadoBadge(p.estado)}</td>
          <td>${formatDate(p.data_pagamento)}</td>
          <td>
            ${p.estado !== 'Pago' ? `<button class="btn btn-sm btn-success" onclick="markPago(${p.id})">✓ Pago</button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
    window.markPago = async (id) => {
      const today = new Date().toISOString().split('T')[0];
      try {
        await put(`/financeiro/pagamentos/${id}`, { estado: 'Pago', data_pagamento: today });
        toast('Pagamento registado');
        loadPagamentos(); loadSummary();
      } catch (e) { toast(e.message, 'error'); }
    };
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
  }
}

async function loadComissoes() {
  const container = document.getElementById('comissoes-list');
  container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const estado = document.getElementById('com-filter-estado').value;
  const params = new URLSearchParams({ page: 1, size: 50 });
  if (estado) params.set('estado', estado);
  try {
    const data = await get(`/financeiro/comissoes?${params}`);
    if (!data.items.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💰</div><div class="empty-state-title">Sem comissões</div></div>`;
      return;
    }
    container.innerHTML = `
    <div class="table-wrapper"><table>
      <thead><tr><th>Apólice</th><th>Tipo</th><th>%</th><th>Valor</th><th>Referência</th><th>Estado</th><th>Ações</th></tr></thead>
      <tbody>
        ${data.items.map(c => `
        <tr>
          <td class="font-mono"><strong>${c.apolice_numero || '#' + c.apolice_id}</strong></td>
          <td>${c.tipo}</td>
          <td>${c.percentagem}%</td>
          <td class="text-right font-mono">${formatAKZ(c.valor)}</td>
          <td>${c.data_referencia}</td>
          <td>${estadoBadge(c.estado)}</td>
          <td>
            <div class="flex gap-2">
              ${c.estado === 'Prevista' ? `<button class="btn btn-sm btn-success" onclick="markComissaoRecebida(${c.id})">✓ Recebida</button>` : ''}
              ${c.estado === 'Recebida' ? `<button class="btn btn-sm btn-primary" onclick="markComissaoPaga(${c.id})">✓ Paga</button>` : ''}
              <button class="btn btn-sm btn-secondary" onclick="openComissaoEdit(${c.id},'${c.apolice_numero || c.apolice_id}','${c.estado}')">✏️</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
    window.markComissaoRecebida = async (id) => {
      try {
        await put(`/financeiro/comissoes/${id}`, { estado: 'Recebida' });
        toast('Comissão marcada como recebida');
        loadComissoes(); loadSummary();
      } catch (e) { toast(e.message, 'error'); }
    };
    window.markComissaoPaga = async (id) => {
      try {
        await put(`/financeiro/comissoes/${id}`, { estado: 'Paga' });
        toast('Comissão marcada como paga');
        loadComissoes(); loadSummary();
      } catch (e) { toast(e.message, 'error'); }
    };
    let _editComissaoId = null;
    window.openComissaoEdit = (id, apoliceNum, estadoAtual) => {
      _editComissaoId = id;
      document.getElementById('comissao-edit-info').textContent = `Apólice: ${apoliceNum}`;
      document.getElementById('comissao-edit-estado').value = estadoAtual;
      document.getElementById('comissao-edit-modal').classList.remove('hidden');
      document.getElementById('btn-save-comissao-edit').onclick = async () => {
        const novoEstado = document.getElementById('comissao-edit-estado').value;
        const btn = document.getElementById('btn-save-comissao-edit');
        btn.disabled = true;
        try {
          await put(`/financeiro/comissoes/${_editComissaoId}`, { estado: novoEstado });
          toast('Comissão atualizada');
          document.getElementById('comissao-edit-modal').classList.add('hidden');
          loadComissoes(); loadSummary();
        } catch (e) { toast(e.message, 'error'); }
        finally { btn.disabled = false; }
      };
    };
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
  }
}

function previewPremio() {
  const base = parseFloat(document.getElementById('np-base').value) || 0;
  const encargos = parseFloat(document.getElementById('np-encargos').value) || 0;
  const imposto = (base + encargos) * 0.04;
  const total = base + encargos + imposto;
  const frac = document.getElementById('np-fracionamento').value;
  const n = { 'Anual': 1, 'Semestral': 2, 'Trimestral': 4, 'Mensal': 12 }[frac] || 1;
  const parcela = (total / n).toFixed(2);
  const preview = document.getElementById('np-preview');
  preview.innerHTML = `<strong>Resumo:</strong> Base ${formatAKZ(base)} + Encargos ${formatAKZ(encargos)} + ISS 4% ${formatAKZ(imposto)} = <strong>Total ${formatAKZ(total)}</strong> · ${n}x ${formatAKZ(parcela)}`;
  preview.classList.remove('hidden');
}

async function savePremio() {
  const errEl = document.getElementById('np-error');
  errEl.classList.add('hidden');
  const body = {
    apolice_id: parseInt(document.getElementById('np-apolice-id').value),
    ramo_codigo: document.getElementById('np-ramo').value.toUpperCase(),
    premio_base: parseFloat(document.getElementById('np-base').value),
    encargos: parseFloat(document.getElementById('np-encargos').value) || 0,
    fracionamento: document.getElementById('np-fracionamento').value,
    tipo_comissao: document.getElementById('np-tipo-com').value,
    periodo_inicio: document.getElementById('np-inicio').value,
    periodo_fim: document.getElementById('np-fim').value,
  };
  if (!body.apolice_id) { errEl.textContent = 'Selecione a apólice.'; errEl.classList.remove('hidden'); return; }
  if (!body.premio_base || body.premio_base <= 0) { errEl.textContent = 'Indique o prémio base.'; errEl.classList.remove('hidden'); return; }
  if (!body.periodo_inicio) { errEl.textContent = 'Preencha a data de início do período.'; errEl.classList.remove('hidden'); return; }
  if (body.premio_base >= 100000000) {
    if (!confirm(`O prémio base (${formatAKZ(body.premio_base)}) é invulgarmente alto.\n\nVerifique se não falta o separador decimal. Deseja gravar mesmo assim?`)) return;
  }
  const btn = document.getElementById('btn-save-premio');
  btn.disabled = true;
  try {
    await post('/financeiro/premios', body);
    toast('Prémio registado com sucesso');
    loadPagamentos(); loadComissoes(); loadSummary();
  } catch (e) {
    errEl.textContent = e.message; errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
}

async function loadCompliance() {
  const body = document.getElementById('compliance-content');
  if (!body) return;
  body.innerHTML = `<div class="loading"><div class="spinner"></div> A calcular compliance...</div>`;
  try {
    const d = await get('/financeiro/compliance');

    const badge = (estado) => {
      if (estado === 'vencido') return `<span class="badge badge-red">⛔ Vencido</span>`;
      if (estado === 'urgente') return `<span class="badge badge-yellow">⚠️ Urgente</span>`;
      return `<span class="badge badge-green">✅ OK</span>`;
    };

    body.innerHTML = `
    <!-- KPI row -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px">
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--primary)">${formatAKZ(d.iss_estimado)}</div>
        <div style="font-size:11px;color:var(--gray-500);margin-top:4px">ISS Estimado (ano)</div>
        <div style="font-size:10px;color:var(--gray-400)">2% sobre comissões recebidas</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:var(--info)">${formatAKZ(d.imposto_selo_estimado)}</div>
        <div style="font-size:11px;color:var(--gray-500);margin-top:4px">Imposto Selo Estimado (ano)</div>
        <div style="font-size:10px;color:var(--gray-400)">0,3% sobre prémios</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:${d.comissoes_vencidas > 0 ? 'var(--danger)' : 'var(--success)'}">${d.comissoes_vencidas}</div>
        <div style="font-size:11px;color:var(--gray-500);margin-top:4px">Comissões não reconciliadas</div>
        <div style="font-size:10px;color:var(--gray-400)">Previstas há +60 dias</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:${d.apolices_sem_premio > 0 ? 'var(--warning)' : 'var(--success)'}">${d.apolices_sem_premio}</div>
        <div style="font-size:11px;color:var(--gray-500);margin-top:4px">Apólices sem prémio</div>
        <div style="font-size:10px;color:var(--gray-400)">Apólices ativas sem registo</div>
      </div>
      <div class="card" style="padding:16px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:${d.pagamentos_criticos > 0 ? 'var(--danger)' : 'var(--success)'}">${d.pagamentos_criticos}</div>
        <div style="font-size:11px;color:var(--gray-500);margin-top:4px">Pagamentos críticos</div>
        <div style="font-size:10px;color:var(--gray-400)">Atrasados há +30 dias</div>
      </div>
    </div>

    <!-- ARSEG Deadlines -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📋 Prazos Regulatórios — ARSEG & Fiscais</span>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Prazo</th><th>Descrição</th><th>Tipo</th><th>Dias Restantes</th><th>Estado</th></tr></thead>
          <tbody>
            ${d.arseg_deadlines.map(dl => `
            <tr>
              <td class="font-mono">${dl.prazo}</td>
              <td>${dl.descricao}</td>
              <td><span class="badge badge-blue">${dl.tipo}</span></td>
              <td style="font-weight:600;color:${dl.dias_restantes < 0 ? 'var(--danger)' : dl.dias_restantes <= 15 ? 'var(--warning)' : 'var(--success)'}">
                ${dl.dias_restantes < 0 ? `${Math.abs(dl.dias_restantes)}d em atraso` : `${dl.dias_restantes}d`}
              </td>
              <td>${badge(dl.estado)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  } catch (e) {
    body.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
  }
}
