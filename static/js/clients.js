/* SIGMS ELOVITAL — Clientes */
import { get, post, put } from './api.js';
import { toast, formatDate, debounce, validateNIF, validateIBAN, PROVINCIAS_ANGOLA } from './utils.js';

let currentPage = 1;
let currentQuery = '';
let editingId = null;

export async function renderClients(container) {
    container.innerHTML = `
<div class="page-content">
  <div class="card">
    <div class="card-header">
      <span class="card-title">👥 Clientes</span>
      <div class="flex gap-2 items-center">
        <div class="search-bar">
          <span>🔍</span>
          <input type="text" id="client-search" placeholder="Pesquisar por nome ou NIF...">
        </div>
        <select id="filter-provincia" style="max-width:160px">
          <option value="">Todas as províncias</option>
          ${PROVINCIAS_ANGOLA.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="btn-new-client">+ Novo Cliente</button>
      </div>
    </div>
    <div id="clients-table-container">
      <div class="loading"><div class="spinner"></div></div>
    </div>
    <div id="clients-pagination" class="pagination hidden"></div>
  </div>
</div>

<!-- Modal Cliente -->
<div class="modal-overlay hidden" id="client-modal">
  <div class="modal modal-lg">
    <div class="modal-header">
      <span class="modal-title" id="client-modal-title">Novo Cliente</span>
      <button class="btn btn-icon btn-secondary" onclick="document.getElementById('client-modal').classList.add('hidden')">✕</button>
    </div>
    <div class="modal-body">
      <div class="tabs">
        <div class="tab active" data-tab="dados">Dados Pessoais</div>
        <div class="tab" data-tab="contactos">Contactos</div>
        <div class="tab" data-tab="lpdp">Protecção de Dados (LPDP)</div>
      </div>

      <!-- Tab Dados -->
      <div id="tab-dados">
        <div class="form-row">
          <div class="form-group">
            <label>Tipo *</label>
            <select id="c-tipo">
              <option value="Singular">Singular (Pessoa Física)</option>
              <option value="Coletiva">Coletiva (Empresa)</option>
            </select>
          </div>
          <div class="form-group">
            <label>NIF *</label>
            <input type="text" id="c-nif" placeholder="NIF Angola">
            <div class="field-error hidden" id="c-nif-error">NIF inválido</div>
          </div>
        </div>
        <div class="form-group">
          <label>Nome / Denominação Social *</label>
          <input type="text" id="c-nome" placeholder="Nome completo ou denominação">
        </div>
        <div class="form-row">
          <div class="form-group" id="group-nascimento">
            <label>Data de Nascimento</label>
            <input type="date" id="c-data-nascimento">
          </div>
          <div class="form-group hidden" id="group-constituicao">
            <label>Data de Constituição</label>
            <input type="date" id="c-data-constituicao">
          </div>
          <div class="form-group">
            <label>IBAN Angola (AO)</label>
            <input type="text" id="c-iban" placeholder="AO06 XXXX XXXX XXXX XXXX XXXX X" maxlength="25">
            <div class="field-error hidden" id="c-iban-error">IBAN Angola inválido (AO + 23 dígitos)</div>
          </div>
        </div>
        <div class="form-group">
          <label>Morada</label>
          <input type="text" id="c-morada1" placeholder="Rua, Avenida, Bairro...">
        </div>
        <div class="form-group">
          <label>Morada (linha 2)</label>
          <input type="text" id="c-morada2" placeholder="Complemento, Referência...">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Província</label>
            <select id="c-provincia">
              <option value="">-- Seleccione a Província --</option>
              ${PROVINCIAS_ANGOLA.map(p => `<option value="${p}">${p}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Município / Localidade</label>
            <input type="text" id="c-municipio" placeholder="Município ou bairro">
          </div>
        </div>
      </div>

      <!-- Tab Contactos -->
      <div id="tab-contactos" class="hidden">
        <div id="contacts-list"></div>
        <button class="btn btn-secondary btn-sm" id="btn-add-contact" style="margin-top:8px">+ Adicionar Contacto</button>
      </div>

      <!-- Tab LPDP -->
      <div id="tab-lpdp" class="hidden">
        <div class="alert alert-info" style="margin-bottom:16px">
          <span>🔒</span>
          <div>
            <strong>Lei n.º 22/11 de 17 de Junho — Lei de Proteção de Dados Pessoais de Angola (LPDP)</strong><br>
            O tratamento de dados pessoais requer consentimento expresso do titular. O titular tem direito de acesso, rectificação e eliminação dos seus dados. Os dados só podem ser usados para a finalidade declarada.
          </div>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:flex-start;gap:10px;text-transform:none;font-size:14px;font-weight:500;cursor:pointer">
            <input type="checkbox" id="c-lpdp" style="width:auto;margin-top:2px">
            <span>O cliente deu consentimento expresso para o tratamento dos seus dados pessoais pela ELOVITAL, para efeitos de mediação de seguros, ao abrigo da Lei n.º 22/11.</span>
          </label>
        </div>
        <div class="form-group">
          <label>Canal de recolha do consentimento</label>
          <select id="c-lpdp-canal">
            <option value="presencial">Presencial</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="telefone">Telefone</option>
          </select>
        </div>
        <div id="lpdp-log-section" class="hidden" style="margin-top:16px">
          <div style="font-weight:600;margin-bottom:8px;font-size:13px">📋 Histórico LPDP</div>
          <div id="lpdp-log-list"></div>
        </div>
      </div>

      <div id="client-form-error" class="alert alert-danger hidden" style="margin-top:12px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('client-modal').classList.add('hidden')">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-client">Guardar</button>
    </div>
  </div>
</div>`;

    // Tab switching
    document.querySelectorAll('#client-modal .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#client-modal .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            ['dados', 'contactos', 'lpdp'].forEach(t =>
                document.getElementById(`tab-${t}`)?.classList.toggle('hidden', t !== tab.dataset.tab));
        });
    });

    // Tipo change
    document.getElementById('c-tipo').addEventListener('change', e => {
        const isColetiva = e.target.value === 'Coletiva';
        document.getElementById('group-nascimento').classList.toggle('hidden', isColetiva);
        document.getElementById('group-constituicao').classList.toggle('hidden', !isColetiva);
    });

    // NIF validation
    document.getElementById('c-nif').addEventListener('blur', e => {
        const valid = validateNIF(e.target.value);
        document.getElementById('c-nif-error').classList.toggle('hidden', valid || !e.target.value);
        e.target.classList.toggle('error', !valid && !!e.target.value);
    });

    // IBAN Angola validation
    document.getElementById('c-iban').addEventListener('blur', e => {
        const val = e.target.value.replace(/\s/g, '');
        const valid = !val || validateIBAN(val);
        document.getElementById('c-iban-error').classList.toggle('hidden', valid);
        e.target.classList.toggle('error', !valid);
    });

    // Add contact
    document.getElementById('btn-add-contact').addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'form-row';
        div.style.marginBottom = '8px';
        div.innerHTML = `
            <select class="contact-tipo" style="max-width:130px">
                <option value="telemovel">Telemóvel</option>
                <option value="telefone">Telefone</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
            </select>
            <input type="text" class="contact-valor" placeholder="Número ou email">
            <label style="display:flex;align-items:center;gap:4px;text-transform:none;font-size:13px;width:auto;white-space:nowrap">
                <input type="checkbox" class="contact-principal" style="width:auto"> Principal
            </label>
            <button class="btn btn-sm btn-danger btn-icon" onclick="this.parentElement.remove()">✕</button>`;
        document.getElementById('contacts-list').appendChild(div);
    });

    document.getElementById('btn-new-client').addEventListener('click', () => openClientModal());
    document.getElementById('btn-save-client').addEventListener('click', saveClient);

    document.getElementById('client-search').addEventListener('input', debounce(e => {
        currentQuery = e.target.value; currentPage = 1; loadClientsTable();
    }));
    document.getElementById('filter-provincia').addEventListener('change', () => {
        currentPage = 1; loadClientsTable();
    });

    loadClientsTable();
}

async function loadClientsTable() {
    const container = document.getElementById('clients-table-container');
    container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
    try {
        const params = new URLSearchParams({ page: currentPage, size: 20 });
        if (currentQuery) params.set('q', currentQuery);
        const provinciaFilter = document.getElementById('filter-provincia')?.value;
        if (provinciaFilter) params.set('provincia', provinciaFilter);

        const data = await get(`/clients?${params}`);
        const { total, items } = data;

        if (!items.length) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👤</div><div class="empty-state-title">Nenhum cliente encontrado</div></div>`;
            document.getElementById('clients-pagination').classList.add('hidden');
            return;
        }

        container.innerHTML = `
        <div class="table-wrapper"><table>
          <thead><tr>
            <th>Nome</th><th>NIF</th><th>Tipo</th><th>Província</th><th>Município</th><th>LPDP</th><th>Ações</th>
          </tr></thead>
          <tbody>
            ${items.map(c => `
            <tr>
              <td><strong>${c.nome}</strong>${c.anonymized_at ? ' <span class="badge badge-gray">Anonimizado</span>' : ''}</td>
              <td class="font-mono">${c.nif}</td>
              <td>${c.tipo}</td>
              <td>${c.provincia || '-'}</td>
              <td>${c.municipio || '-'}</td>
              <td>${c.rgpd_aceite ? '<span class="badge badge-green">✓ Aceite</span>' : '<span class="badge badge-red">✗ Não</span>'}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-sm btn-secondary" onclick="editClient(${c.id})">✏️</button>
                  <button class="btn btn-sm btn-secondary" onclick="viewLpdpLog(${c.id})" title="Log LPDP">🔒</button>
                  <a href="#/acompanhamento?client_id=${c.id}" class="btn btn-sm btn-secondary" title="Acompanhamento">🎯</a>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>`;

        const pag = document.getElementById('clients-pagination');
        const totalPages = Math.ceil(total / 20);
        if (totalPages > 1) {
            pag.classList.remove('hidden');
            pag.innerHTML = `
                <span class="pagination-info">${total} clientes — pág. ${currentPage}/${totalPages}</span>
                <div class="pagination-btns">
                    <button class="btn btn-sm btn-secondary" ${currentPage<=1?'disabled':''} onclick="changePage(${currentPage-1})">← Anterior</button>
                    <button class="btn btn-sm btn-secondary" ${currentPage>=totalPages?'disabled':''} onclick="changePage(${currentPage+1})">Próxima →</button>
                </div>`;
        } else {
            pag.classList.add('hidden');
        }
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
    }
}

window.changePage = (page) => { currentPage = page; loadClientsTable(); };

window.editClient = async (id) => {
    try { const c = await get(`/clients/${id}`); openClientModal(c); } catch (e) { toast(e.message, 'error'); }
};

window.viewLpdpLog = async (id) => {
    try {
        const c = await get(`/clients/${id}`);
        openClientModal(c);
        // Switch to LPDP tab
        document.querySelectorAll('#client-modal .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'lpdp'));
        ['dados', 'contactos'].forEach(t => document.getElementById(`tab-${t}`)?.classList.add('hidden'));
        document.getElementById('tab-lpdp')?.classList.remove('hidden');
        const logs = await get(`/clients/${id}/lpdp/log`);
        document.getElementById('lpdp-log-section').classList.remove('hidden');
        document.getElementById('lpdp-log-list').innerHTML = logs.length
            ? `<table style="width:100%"><thead><tr><th>Acção</th><th>Data</th></tr></thead><tbody>
                ${logs.map(l => `<tr><td>${l.action}</td><td>${new Date(l.created_at).toLocaleString('pt-AO')}</td></tr>`).join('')}
               </tbody></table>`
            : '<p class="text-gray">Sem registos</p>';
    } catch (e) { toast(e.message, 'error'); }
};

function openClientModal(client = null) {
    editingId = client?.id || null;
    document.getElementById('client-modal-title').textContent = client ? 'Editar Cliente' : 'Novo Cliente';
    document.getElementById('c-tipo').value = client?.tipo || 'Singular';
    document.getElementById('c-nif').value = client?.nif || '';
    document.getElementById('c-nif').disabled = !!client;
    document.getElementById('c-nome').value = client?.nome || '';
    document.getElementById('c-data-nascimento').value = client?.data_nascimento || '';
    document.getElementById('c-data-constituicao').value = client?.data_constituicao || '';
    document.getElementById('c-iban').value = client?.iban || '';
    document.getElementById('c-morada1').value = client?.morada_linha1 || '';
    document.getElementById('c-morada2').value = client?.morada_linha2 || '';
    document.getElementById('c-provincia').value = client?.provincia || '';
    document.getElementById('c-municipio').value = client?.municipio || '';
    document.getElementById('c-lpdp').checked = client?.rgpd_aceite || false;
    document.getElementById('client-form-error').classList.add('hidden');
    document.getElementById('lpdp-log-section').classList.add('hidden');
    document.getElementById('contacts-list').innerHTML = '';
    if (client?.contacts?.length) {
        client.contacts.forEach(ct => {
            const div = document.createElement('div');
            div.className = 'form-row';
            div.style.marginBottom = '8px';
            div.innerHTML = `
                <select class="contact-tipo" style="max-width:130px">
                    <option value="telemovel" ${ct.tipo==='telemovel'?'selected':''}>Telemóvel</option>
                    <option value="telefone" ${ct.tipo==='telefone'?'selected':''}>Telefone</option>
                    <option value="email" ${ct.tipo==='email'?'selected':''}>Email</option>
                    <option value="whatsapp" ${ct.tipo==='whatsapp'?'selected':''}>WhatsApp</option>
                </select>
                <input type="text" class="contact-valor" value="${ct.valor}">
                <label style="display:flex;align-items:center;gap:4px;text-transform:none;font-size:13px;width:auto;white-space:nowrap">
                    <input type="checkbox" class="contact-principal" style="width:auto" ${ct.principal?'checked':''}> Principal
                </label>
                <button class="btn btn-sm btn-danger btn-icon" onclick="this.parentElement.remove()">✕</button>`;
            document.getElementById('contacts-list').appendChild(div);
        });
    }
    // Reset tabs
    document.querySelectorAll('#client-modal .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'dados'));
    ['dados'].forEach(t => document.getElementById(`tab-${t}`)?.classList.remove('hidden'));
    ['contactos', 'lpdp'].forEach(t => document.getElementById(`tab-${t}`)?.classList.add('hidden'));
    document.getElementById('client-modal').classList.remove('hidden');
}

async function saveClient() {
    const errEl = document.getElementById('client-form-error');
    errEl.classList.add('hidden');
    const contacts = [...document.querySelectorAll('#contacts-list .form-row')].map(row => ({
        tipo: row.querySelector('.contact-tipo').value,
        valor: row.querySelector('.contact-valor').value,
        principal: row.querySelector('.contact-principal').checked,
    }));
    const body = {
        tipo: document.getElementById('c-tipo').value,
        nome: document.getElementById('c-nome').value,
        nif: document.getElementById('c-nif').value.trim(),
        data_nascimento: document.getElementById('c-data-nascimento').value || null,
        data_constituicao: document.getElementById('c-data-constituicao').value || null,
        iban: document.getElementById('c-iban').value.replace(/\s/g, '') || null,
        morada_linha1: document.getElementById('c-morada1').value || null,
        morada_linha2: document.getElementById('c-morada2').value || null,
        provincia: document.getElementById('c-provincia').value || null,
        municipio: document.getElementById('c-municipio').value || null,
        lpdp_aceite: document.getElementById('c-lpdp').checked,
        contacts,
    };
    const btn = document.getElementById('btn-save-client');
    btn.disabled = true; btn.textContent = 'A guardar...';
    try {
        if (editingId) { await put(`/clients/${editingId}`, body); toast('Cliente actualizado'); }
        else { await post('/clients', body); toast('Cliente criado'); }
        document.getElementById('client-modal').classList.add('hidden');
        loadClientsTable();
    } catch (e) {
        errEl.textContent = e.message; errEl.classList.remove('hidden');
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar';
    }
}
