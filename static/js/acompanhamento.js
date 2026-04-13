/* SIGMS ELOVITAL — Acompanhamento de Vendas */
import { get, post, put, del } from './api.js';
import { toast, formatDate, formatDatetime, estadoBadge, tipoInteracaoBadge } from './utils.js';

export async function renderAcompanhamento(container, params = {}) {
    container.innerHTML = `
<div class="page-content">
  <div class="tabs" id="acomp-tabs">
    <div class="tab active" data-tab="interacoes">📋 Interações</div>
    <div class="tab" data-tab="cotacoes">📊 Cotações</div>
    <div class="tab" data-tab="lembretes">🔔 Lembretes</div>
    <div class="tab" data-tab="dicas">💡 Dicas de Venda</div>
  </div>

  <div id="tab-interacoes">
    <div class="card">
      <div class="card-header">
        <span class="card-title">Registo de Interações</span>
        <button class="btn btn-primary" id="btn-nova-interacao">+ Nova Interação</button>
      </div>
      <div class="card-header" style="padding-top:0;gap:8px;flex-wrap:wrap">
        <input type="text" id="acomp-search" placeholder="🔍 Pesquisar cliente..." style="max-width:220px">
        <select id="acomp-filter-tipo" style="max-width:160px">
          <option value="">Todos os tipos</option>
          <option value="Chamada">📞 Chamada</option>
          <option value="Email">✉️ Email</option>
          <option value="WhatsApp">💬 WhatsApp</option>
          <option value="Visita">🚶 Visita</option>
          <option value="Reunião">🤝 Reunião</option>
          <option value="SMS">📱 SMS</option>
          <option value="Outro">📝 Outro</option>
        </select>
        <select id="acomp-filter-resultado" style="max-width:180px">
          <option value="">Todos os resultados</option>
          <option value="Interessado">Interessado</option>
          <option value="Não Interessado">Não Interessado</option>
          <option value="Aguardar">Aguardar</option>
          <option value="Proposta Enviada">Proposta Enviada</option>
          <option value="Convertido">Convertido</option>
        </select>
      </div>
      <div id="interacoes-list"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  </div>

  <div id="tab-cotacoes" class="hidden">
    <div class="card">
      <div class="card-header" style="flex-wrap:wrap;gap:8px">
        <span class="card-title">📊 Cotações Enviadas</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-left:auto">
          <input type="text" id="ac-cot-search" class="form-control" placeholder="🔍 Cliente, email ou nº..." style="max-width:200px;font-size:13px">
          <select id="ac-cot-tipo" class="form-control" style="max-width:140px;font-size:13px">
            <option value="">Todos os tipos</option>
            <option value="saude">🏥 Saúde</option>
            <option value="auto">🚗 Automóvel</option>
          </select>
          <select id="ac-cot-estado" class="form-control" style="max-width:160px;font-size:13px">
            <option value="">Todos os estados</option>
            <option value="Enviada">Enviada</option>
            <option value="Visualizada">Visualizada</option>
            <option value="Interessado">Interessado</option>
            <option value="Em Negociação">Em Negociação</option>
            <option value="Convertido">Convertido</option>
            <option value="Perdido">Perdido</option>
          </select>
        </div>
      </div>
      <div id="ac-cot-stats" style="display:flex;gap:10px;padding:10px 16px;background:#f8fafc;border-bottom:1px solid var(--gray-200);flex-wrap:wrap"></div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#1f2937;color:white">
            <th style="padding:9px 12px;font-size:11px;text-align:left">Nº</th>
            <th style="padding:9px 12px;font-size:11px;text-align:left">Data</th>
            <th style="padding:9px 12px;font-size:11px;text-align:left">Cliente</th>
            <th style="padding:9px 12px;font-size:11px;text-align:left">Tipo</th>
            <th style="padding:9px 12px;font-size:11px;text-align:left">Seguradoras</th>
            <th style="padding:9px 12px;font-size:11px;text-align:left">Estado</th>
            <th style="padding:9px 12px;font-size:11px;text-align:left">Próx. Contacto</th>
            <th style="padding:9px 12px;font-size:11px;text-align:center">Ações</th>
          </tr></thead>
          <tbody id="ac-cot-body"><tr><td colspan="8" style="text-align:center;padding:24px;color:var(--gray-400)">
            <div class="spinner" style="margin:0 auto"></div>
          </td></tr></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Modal edição cotação (acompanhamento) -->
  <div id="ac-cot-modal" class="modal hidden">
    <div class="modal-backdrop" onclick="document.getElementById('ac-cot-modal').classList.add('hidden')"></div>
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>✏️ Editar Cotação <span id="ac-hm-numero" style="color:var(--primary)"></span></h3>
        <button class="btn btn-icon" onclick="document.getElementById('ac-cot-modal').classList.add('hidden')">✕</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="ac-hm-id">
        <div class="form-group">
          <label>Nome do Cliente</label>
          <input type="text" id="ac-hm-cliente" class="form-control" placeholder="Nome do cliente">
        </div>
        <div class="form-group">
          <label>Estado</label>
          <select id="ac-hm-estado" class="form-control">
            <option>Enviada</option><option>Visualizada</option><option>Interessado</option>
            <option>Em Negociação</option><option>Convertido</option><option>Perdido</option>
          </select>
        </div>
        <div class="form-group">
          <label>Próximo Contacto</label>
          <input type="date" id="ac-hm-prox" class="form-control">
        </div>
        <div class="form-group">
          <label>Notas</label>
          <textarea id="ac-hm-notas" class="form-control" rows="3"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="document.getElementById('ac-cot-modal').classList.add('hidden')">Cancelar</button>
        <button class="btn btn-primary" id="ac-hm-save">💾 Guardar</button>
      </div>
    </div>
  </div>

  <div id="tab-lembretes" class="hidden">
    <div class="card">
      <div class="card-header"><span class="card-title">🔔 Lembretes — Próximos 7 dias</span></div>
      <div id="lembretes-list"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  </div>

  <div id="tab-dicas" class="hidden">
    <div class="card">
      <div class="card-header">
        <span class="card-title">💡 Dicas de Acompanhamento</span>
        <select id="dicas-categoria" style="max-width:200px">
          <option value="geral">Geral</option>
          <option value="AUTO">🚗 Seguro Auto</option>
          <option value="VIDA">❤️ Seguro Vida</option>
          <option value="SAUDE">🏥 Seguro Saúde</option>
          <option value="AT">👷 Acidentes de Trabalho</option>
          <option value="MULTI">🏠 Multirriscos</option>
          <option value="suporte">🛠️ Suporte ao Cliente</option>
          <option value="melhoria">📈 Métricas & Melhoria</option>
        </select>
      </div>
      <div id="dicas-content"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  </div>
</div>

<!-- Modal Nova Interação -->
<div id="modal-interacao" class="modal hidden">
  <div class="modal-backdrop" onclick="document.getElementById('modal-interacao').classList.add('hidden')"></div>
  <div class="modal-dialog modal-lg">
    <div class="modal-header">
      <h3 id="modal-interacao-title">Nova Interação</h3>
      <button class="btn btn-icon" onclick="document.getElementById('modal-interacao').classList.add('hidden')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label>Cliente *</label>
          <input type="text" id="int-client-search" placeholder="Nome ou NIF do cliente..." autocomplete="off">
          <div id="int-client-suggestions" class="suggestions-dropdown hidden"></div>
          <input type="hidden" id="int-client-id">
        </div>
        <div class="form-group">
          <label>Tipo *</label>
          <select id="int-tipo">
            <option value="Chamada">📞 Chamada</option>
            <option value="Email">✉️ Email</option>
            <option value="WhatsApp">💬 WhatsApp</option>
            <option value="Visita">🚶 Visita</option>
            <option value="Reunião">🤝 Reunião</option>
            <option value="SMS">📱 SMS</option>
            <option value="Outro">📝 Outro</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Data *</label>
          <input type="date" id="int-data">
        </div>
        <div class="form-group">
          <label>Hora</label>
          <input type="time" id="int-hora">
        </div>
      </div>
      <div class="form-group">
        <label>Assunto *</label>
        <input type="text" id="int-assunto" placeholder="Tema da interação...">
      </div>
      <div class="form-group">
        <label>Notas</label>
        <textarea id="int-notas" rows="3" placeholder="Detalhes da conversa..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Resultado</label>
          <select id="int-resultado">
            <option value="">-- Seleccionar --</option>
            <option value="Interessado">Interessado</option>
            <option value="Não Interessado">Não Interessado</option>
            <option value="Aguardar">Aguardar</option>
            <option value="Proposta Enviada">Proposta Enviada</option>
            <option value="Convertido">Convertido</option>
          </select>
        </div>
        <div class="form-group">
          <label>Próximo Contacto</label>
          <input type="date" id="int-proximo">
        </div>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="int-lembrete" style="width:auto">
        <label for="int-lembrete" style="margin:0">Activar lembrete para o próximo contacto</label>
      </div>
      <div id="int-error" class="alert alert-danger hidden"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('modal-interacao').classList.add('hidden')">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-interacao">Guardar</button>
    </div>
  </div>
</div>`;

    // Tabs
    document.querySelectorAll('#acomp-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#acomp-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            ['interacoes', 'cotacoes', 'lembretes', 'dicas'].forEach(t =>
                document.getElementById(`tab-${t}`)?.classList.toggle('hidden', t !== tab.dataset.tab));
            if (tab.dataset.tab === 'lembretes') loadLembretes();
            if (tab.dataset.tab === 'dicas') loadDicas();
            if (tab.dataset.tab === 'cotacoes') loadAcCotacoes();
        });
    });

    // Filters
    document.getElementById('acomp-search').addEventListener('input', debounceLocal(() => loadInteracoes()));
    document.getElementById('acomp-filter-tipo').addEventListener('change', () => loadInteracoes());
    document.getElementById('acomp-filter-resultado').addEventListener('change', () => loadInteracoes());
    document.getElementById('dicas-categoria').addEventListener('change', () => loadDicas());

    // Modal
    document.getElementById('btn-nova-interacao').addEventListener('click', () => openInteracaoModal());
    document.getElementById('btn-save-interacao').addEventListener('click', () => saveInteracao());

    // Client search in modal
    setupClientSearch();

    // If coming from clients page with client_id param
    if (params.client_id) {
        openInteracaoModal(null, parseInt(params.client_id));
    }

    loadInteracoes();
}

let _editingId = null;

function openInteracaoModal(interacao = null, prefillClientId = null) {
    _editingId = interacao?.id || null;
    document.getElementById('modal-interacao-title').textContent = interacao ? 'Editar Interação' : 'Nova Interação';
    document.getElementById('int-client-search').value = interacao?.client_nome || '';
    document.getElementById('int-client-id').value = interacao?.client_id || prefillClientId || '';
    document.getElementById('int-tipo').value = interacao?.tipo || 'Chamada';
    document.getElementById('int-data').value = interacao?.data_interacao || new Date().toISOString().split('T')[0];
    document.getElementById('int-hora').value = interacao?.hora || '';
    document.getElementById('int-assunto').value = interacao?.assunto || '';
    document.getElementById('int-notas').value = interacao?.notas || '';
    document.getElementById('int-resultado').value = interacao?.resultado || '';
    document.getElementById('int-proximo').value = interacao?.proximo_contacto || '';
    document.getElementById('int-lembrete').checked = interacao?.lembrete_ativo || false;
    document.getElementById('int-error').classList.add('hidden');

    if (prefillClientId && !interacao) {
        loadClientName(prefillClientId);
    }

    document.getElementById('modal-interacao').classList.remove('hidden');
}

async function loadClientName(clientId) {
    try {
        const client = await get(`/clients/${clientId}`);
        document.getElementById('int-client-search').value = client.nome;
    } catch {}
}

async function saveInteracao() {
    const errEl = document.getElementById('int-error');
    errEl.classList.add('hidden');
    const clientId = parseInt(document.getElementById('int-client-id').value);
    if (!clientId) { errEl.textContent = 'Seleccione um cliente.'; errEl.classList.remove('hidden'); return; }
    const assunto = document.getElementById('int-assunto').value.trim();
    if (!assunto) { errEl.textContent = 'O assunto é obrigatório.'; errEl.classList.remove('hidden'); return; }

    const body = {
        client_id: clientId,
        tipo: document.getElementById('int-tipo').value,
        data_interacao: document.getElementById('int-data').value,
        hora: document.getElementById('int-hora').value || null,
        assunto,
        notas: document.getElementById('int-notas').value || null,
        resultado: document.getElementById('int-resultado').value || null,
        proximo_contacto: document.getElementById('int-proximo').value || null,
        lembrete_ativo: document.getElementById('int-lembrete').checked,
    };

    const btn = document.getElementById('btn-save-interacao');
    btn.disabled = true;
    try {
        if (_editingId) {
            await put(`/acompanhamento/interacoes/${_editingId}`, body);
            toast('Interação actualizada');
        } else {
            await post('/acompanhamento/interacoes', body);
            toast('Interação registada');
        }
        document.getElementById('modal-interacao').classList.add('hidden');
        loadInteracoes();
    } catch (e) {
        errEl.textContent = e.message;
        errEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
    }
}

async function loadInteracoes() {
    const container = document.getElementById('interacoes-list');
    container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    const params = new URLSearchParams({ page: 1, size: 50 });
    const search = document.getElementById('acomp-search').value.trim();
    const tipo = document.getElementById('acomp-filter-tipo').value;
    const resultado = document.getElementById('acomp-filter-resultado').value;
    if (search) params.set('search', search);
    if (tipo) params.set('tipo', tipo);
    if (resultado) params.set('resultado', resultado);

    try {
        const data = await get(`/acompanhamento/interacoes?${params}`);
        if (!data.items?.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Sem interações</div><div class="empty-state-text">Registe a primeira interação com um cliente</div></div>`;
            return;
        }
        container.innerHTML = `
        <div class="table-wrapper"><table>
          <thead><tr><th>Data</th><th>Cliente</th><th>Tipo</th><th>Assunto</th><th>Resultado</th><th>Próx. Contacto</th><th>Ações</th></tr></thead>
          <tbody>
            ${data.items.map(i => `
            <tr>
              <td>${formatDate(i.data_interacao)}${i.hora ? ' ' + i.hora.slice(0,5) : ''}</td>
              <td><a href="#/clientes?id=${i.client_id}" style="color:var(--primary)">${i.client_nome || `#${i.client_id}`}</a></td>
              <td>${tipoInteracaoBadge(i.tipo)}</td>
              <td>${i.assunto}</td>
              <td>${i.resultado ? estadoBadge(i.resultado) : '—'}</td>
              <td>${i.proximo_contacto ? `${i.lembrete_ativo ? '🔔 ' : ''}${formatDate(i.proximo_contacto)}` : '—'}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-sm btn-secondary" onclick="editInteracao(${i.id})">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteInteracao(${i.id})">🗑️</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>`;

        window.editInteracao = async (id) => {
            try {
                const i = await get(`/acompanhamento/interacoes/${id}`);
                openInteracaoModal(i);
            } catch (e) { toast(e.message, 'error'); }
        };
        window.deleteInteracao = async (id) => {
            if (!confirm('Eliminar esta interação?')) return;
            try {
                await del(`/acompanhamento/interacoes/${id}`);
                toast('Interação eliminada');
                loadInteracoes();
            } catch (e) { toast(e.message, 'error'); }
        };
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
    }
}

async function loadLembretes() {
    const container = document.getElementById('lembretes-list');
    container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    try {
        const data = await get('/acompanhamento/lembretes');
        if (!data.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">Sem lembretes</div><div class="empty-state-text">Não há contactos agendados nos próximos 7 dias</div></div>`;
            return;
        }
        container.innerHTML = `
        <div class="table-wrapper"><table>
          <thead><tr><th>Data</th><th>Cliente</th><th>Tipo</th><th>Assunto</th><th>Resultado Anterior</th><th>Ações</th></tr></thead>
          <tbody>
            ${data.map(i => `
            <tr>
              <td><strong>${formatDate(i.proximo_contacto)}</strong></td>
              <td><a href="#/clientes?id=${i.client_id}" style="color:var(--primary)">${i.client_nome || `#${i.client_id}`}</a></td>
              <td>${tipoInteracaoBadge(i.tipo)}</td>
              <td>${i.assunto}</td>
              <td>${i.resultado ? estadoBadge(i.resultado) : '—'}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-sm btn-primary" onclick="editInteracao(${i.id})">📞 Registar</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>`;
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
    }
}

async function loadDicas() {
    const container = document.getElementById('dicas-content');
    container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    const categoria = document.getElementById('dicas-categoria').value;
    try {
        const data = await get(`/acompanhamento/dicas?categoria=${encodeURIComponent(categoria)}`);
        const dicas = Array.isArray(data) ? data : (data.dicas || []);
        if (!dicas.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💡</div><div class="empty-state-title">Sem dicas disponíveis</div></div>`;
            return;
        }
        container.innerHTML = `
        <div class="card-body">
          <div class="tips-grid">
            ${dicas.map(dica => renderDicaCard(dica)).join('')}
          </div>
        </div>`;
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
    }
}

function renderDicaCard(dica) {
    const texto = dica.descricao || dica.dica || '';
    return `
    <div class="tip-card">
      <div class="tip-header">
        <span class="tip-icon">💡</span>
        <strong>${dica.titulo}</strong>
      </div>
      <p class="tip-body">${texto}</p>
    </div>`;
}

function setupClientSearch() {
    const input = document.getElementById('int-client-search');
    const suggestions = document.getElementById('int-client-suggestions');
    let searchTimer;

    input.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const q = input.value.trim();
        if (q.length < 2) { suggestions.classList.add('hidden'); return; }
        searchTimer = setTimeout(async () => {
            try {
                const data = await get(`/clients?search=${encodeURIComponent(q)}&size=8`);
                if (!data.items?.length) { suggestions.classList.add('hidden'); return; }
                suggestions.innerHTML = data.items.map(c =>
                    `<div class="suggestion-item" data-id="${c.id}" data-nome="${c.nome}">${c.nome} <small style="color:var(--gray-400)">${c.nif}</small></div>`
                ).join('');
                suggestions.classList.remove('hidden');
                suggestions.querySelectorAll('.suggestion-item').forEach(el => {
                    el.addEventListener('click', () => {
                        document.getElementById('int-client-id').value = el.dataset.id;
                        input.value = el.dataset.nome;
                        suggestions.classList.add('hidden');
                    });
                });
            } catch {}
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#int-client-search') && !e.target.closest('#int-client-suggestions')) {
            suggestions.classList.add('hidden');
        }
    });
}

function debounceLocal(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ══════════════════════════════════════════════════════════════
   COTAÇÕES — tab no Acompanhamento
══════════════════════════════════════════════════════════════ */
const AC_ESTADO_CORES = {
    'Enviada':       { bg:'#e8f0fe', color:'#1a56db' },
    'Visualizada':   { bg:'#e0f2fe', color:'#0369a1' },
    'Interessado':   { bg:'#fef9c3', color:'#854d0e' },
    'Em Negociação': { bg:'#fff7ed', color:'#9a3412' },
    'Convertido':    { bg:'#dcfce7', color:'#166534' },
    'Perdido':       { bg:'#fee2e2', color:'#991b1b' },
};

function acEstadoBadge(estado) {
    const c = AC_ESTADO_CORES[estado] || { bg:'#f3f4f6', color:'#374151' };
    return `<span style="padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600;background:${c.bg};color:${c.color}">${estado}</span>`;
}

async function loadAcCotacoes() {
    const search = document.getElementById('ac-cot-search')?.value?.trim() || '';
    const tipo   = document.getElementById('ac-cot-tipo')?.value || '';
    const estado = document.getElementById('ac-cot-estado')?.value || '';
    const tbody  = document.getElementById('ac-cot-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px"><div class="spinner" style="margin:0 auto"></div></td></tr>`;

    try {
        let url = '/cotacoes/historico?limit=100';
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (tipo)   url += `&tipo=${encodeURIComponent(tipo)}`;
        if (estado) url += `&estado=${encodeURIComponent(estado)}`;
        const rows  = await get(url);
        const stats = await get('/cotacoes/historico/stats');

        // Stats strip
        const statsEl = document.getElementById('ac-cot-stats');
        if (statsEl) {
            const total = Object.values(stats).reduce((a,b)=>a+b,0);
            statsEl.innerHTML = [['Total',total,'#1f2937'],...Object.entries(AC_ESTADO_CORES).map(([k,c])=>[k,stats[k]||0,c.color])]
                .map(([lbl,n,cor])=>`<div style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:white;border-radius:6px;border:1px solid var(--gray-200)">
                    <span style="font-size:13px;font-weight:700;color:${cor}">${n}</span>
                    <span style="font-size:11px;color:var(--gray-500)">${lbl}</span></div>`).join('');
        }

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--gray-400)">Nenhuma cotação encontrada.</td></tr>`;
            return;
        }
        tbody.innerHTML = rows.map(r => {
            const segs = (r.seguradoras||[]).filter(Boolean).join(' · ') || '—';
            const data = r.created_at ? r.created_at.slice(0,10).split('-').reverse().join('/') : '—';
            const tipoLabel = r.tipo === 'saude' ? '🏥 Saúde' : '🚗 Auto';
            return `<tr style="border-bottom:1px solid var(--gray-100)">
                <td style="padding:8px 12px;font-size:12px;font-weight:600;color:var(--primary)">${r.numero}</td>
                <td style="padding:8px 12px;font-size:12px">${data}</td>
                <td style="padding:8px 12px;font-size:12px;font-weight:500">${r.cliente_nome||'—'}</td>
                <td style="padding:8px 12px;font-size:11px">${tipoLabel}</td>
                <td style="padding:8px 12px;font-size:11px;color:var(--gray-600);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${segs}">${segs}</td>
                <td style="padding:8px 12px">${acEstadoBadge(r.estado)}</td>
                <td style="padding:8px 12px;font-size:12px;color:var(--gray-500)">${r.proximo_contacto||'—'}</td>
                <td style="padding:8px 12px;text-align:center">
                    <button class="btn btn-secondary ac-cot-edit" style="font-size:11px;padding:4px 8px"
                        data-id="${r.id}" data-estado="${r.estado}"
                        data-cliente="${(r.cliente_nome||'').replace(/"/g,'&quot;')}"
                        data-numero="${r.numero}"
                        data-prox="${r.proximo_contacto||''}"
                        data-notas="${(r.notas||'').replace(/"/g,'&quot;')}">✏️ Editar</button>
                </td>
            </tr>`;
        }).join('');

        // Bind edição
        document.querySelectorAll('.ac-cot-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('ac-hm-id').value      = btn.dataset.id;
                document.getElementById('ac-hm-numero').textContent = btn.dataset.numero;
                document.getElementById('ac-hm-cliente').value = btn.dataset.cliente;
                document.getElementById('ac-hm-estado').value  = btn.dataset.estado;
                document.getElementById('ac-hm-prox').value    = btn.dataset.prox;
                document.getElementById('ac-hm-notas').value   = btn.dataset.notas;
                document.getElementById('ac-cot-modal').classList.remove('hidden');
            });
        });

        // Guardar edição
        document.getElementById('ac-hm-save').onclick = async () => {
            const id  = +document.getElementById('ac-hm-id').value;
            const btn = document.getElementById('ac-hm-save');
            btn.disabled = true; btn.textContent = '⏳';
            try {
                await put(`/cotacoes/historico/${id}`, {
                    estado:           document.getElementById('ac-hm-estado').value,
                    notas:            document.getElementById('ac-hm-notas').value,
                    proximo_contacto: document.getElementById('ac-hm-prox').value,
                    cliente_nome:     document.getElementById('ac-hm-cliente').value,
                });
                document.getElementById('ac-cot-modal').classList.add('hidden');
                toast('Cotação actualizada', 'success');
                await loadAcCotacoes();
            } catch(e) { toast('Erro: '+e.message,'error'); }
            finally { btn.disabled=false; btn.textContent='💾 Guardar'; }
        };

    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:#dc2626">Erro: ${e.message}</td></tr>`;
    }

    // Filtros em tempo real
    document.getElementById('ac-cot-search')?.addEventListener('input', debounceLocal(loadAcCotacoes, 400));
    document.getElementById('ac-cot-tipo')?.addEventListener('change', loadAcCotacoes);
    document.getElementById('ac-cot-estado')?.addEventListener('change', loadAcCotacoes);
}
