/* SIGMS ELOVITAL — Acompanhamento de Vendas */
import { get, post, put, del } from './api.js';
import { toast, formatDate, formatDatetime, estadoBadge, tipoInteracaoBadge } from './utils.js';

export async function renderAcompanhamento(container, params = {}) {
    container.innerHTML = `
<div class="page-content">
  <div class="tabs" id="acomp-tabs">
    <div class="tab active" data-tab="interacoes">📋 Interações</div>
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
            ['interacoes', 'lembretes', 'dicas'].forEach(t =>
                document.getElementById(`tab-${t}`)?.classList.toggle('hidden', t !== tab.dataset.tab));
            if (tab.dataset.tab === 'lembretes') loadLembretes();
            if (tab.dataset.tab === 'dicas') loadDicas();
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
