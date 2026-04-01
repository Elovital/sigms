/* SIGMS Admin Module */
import { get, post, put } from './api.js';
import { toast, formatDatetime } from './utils.js';

export async function renderAdmin(container) {
  container.innerHTML = `
<div class="page-content">
  <div class="tabs" id="admin-tabs">
    <div class="tab active" data-tab="users">Utilizadores</div>
    <div class="tab" data-tab="audit">Log de Auditoria RGPD</div>
    <div class="tab" data-tab="backup">Backups</div>
    <div class="tab" data-tab="import">Importar Dados</div>
  </div>

  <div id="tab-users">
    <div class="card">
      <div class="card-header">
        <span class="card-title">👤 Utilizadores do Sistema</span>
        <button class="btn btn-primary" id="btn-new-user">+ Novo Utilizador</button>
      </div>
      <div id="users-list"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  </div>

  <div id="tab-audit" class="hidden">
    <div class="card">
      <div class="card-header"><span class="card-title">🔒 Log de Auditoria RGPD</span></div>
      <div id="audit-list"><div class="loading"><div class="spinner"></div></div></div>
    </div>
  </div>

  <div id="tab-backup" class="hidden">
    <div class="card">
      <div class="card-header">
        <span class="card-title">💾 Backups</span>
        <button class="btn btn-primary" id="btn-run-backup">▶ Criar Backup Agora</button>
      </div>
      <div class="card-body">
        <div class="alert alert-info" style="margin-bottom:16px">
          <span>ℹ️</span><span>O backup automático é executado diariamente às 03:00. São mantidos os últimos 30 backups.</span>
        </div>
        <div id="backup-list"><div class="loading"><div class="spinner"></div></div></div>
      </div>
    </div>
  </div>

  <div id="tab-import" class="hidden">
    <div class="card">
      <div class="card-header"><span class="card-title">📁 Importar Ficheiro CSV/Excel</span></div>
      <div class="card-body">
        <div class="alert alert-warning" style="margin-bottom:16px">
          <span>⚠️</span><span>A importação faz reconciliação por NIF para clientes e por número para apólices.</span>
        </div>
        <div id="import-drop-zone" style="border:2px dashed var(--gray-300);border-radius:8px;padding:40px;text-align:center;cursor:pointer;margin-bottom:16px;transition:all .15s">
          <div style="font-size:32px;margin-bottom:8px">📂</div>
          <p style="color:var(--gray-500)">Arraste um ficheiro CSV ou Excel aqui, ou clique para selecionar</p>
          <input type="file" id="import-file" accept=".csv,.xlsx,.xls" style="display:none">
        </div>
        <div id="import-preview" class="hidden"></div>
        <div id="import-result" class="hidden"></div>
      </div>
    </div>
  </div>
</div>

<!-- User Modal -->
<div class="modal-overlay hidden" id="user-modal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title" id="user-modal-title">Novo Utilizador</span>
      <button class="btn btn-icon btn-secondary" onclick="document.getElementById('user-modal').classList.add('hidden')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>Username *</label><input type="text" id="u-username"></div>
      <div class="form-group"><label>Email *</label><input type="email" id="u-email"></div>
      <div class="form-group"><label>Palavra-passe *</label><input type="password" id="u-password" placeholder="Mínimo 8 caracteres"></div>
      <div class="form-group">
        <label>Perfil</label>
        <select id="u-role">
          <option value="comercial">Comercial</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <div id="u-error" class="alert alert-danger hidden"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('user-modal').classList.add('hidden')">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-user">Guardar</button>
    </div>
  </div>
</div>`;

  // Tabs
  document.querySelectorAll('#admin-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#admin-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      ['users', 'audit', 'backup', 'import'].forEach(t =>
        document.getElementById(`tab-${t}`)?.classList.toggle('hidden', t !== tab.dataset.tab));
      if (tab.dataset.tab === 'audit') loadAuditLog();
      if (tab.dataset.tab === 'backup') loadBackups();
    });
  });

  document.getElementById('btn-new-user').addEventListener('click', () => {
    ['u-username','u-email','u-password'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('u-role').value = 'comercial';
    document.getElementById('u-error').classList.add('hidden');
    document.getElementById('user-modal').classList.remove('hidden');
  });

  document.getElementById('btn-save-user').addEventListener('click', saveUser);
  document.getElementById('btn-run-backup').addEventListener('click', runBackup);

  // File import
  const dropZone = document.getElementById('import-drop-zone');
  const fileInput = document.getElementById('import-file');
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--primary)'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--gray-300)'; });
  dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--gray-300)'; handleImport(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', e => handleImport(e.target.files[0]));

  loadUsers();
}

async function loadUsers() {
  const container = document.getElementById('users-list');
  try {
    const users = await get('/admin/users');
    container.innerHTML = `
    <div class="table-wrapper"><table>
      <thead><tr><th>Username</th><th>Email</th><th>Perfil</th><th>Estado</th><th>2FA</th><th>Senha</th><th>Último login</th><th>Ações</th></tr></thead>
      <tbody>
        ${users.map(u => `
        <tr>
          <td><strong>${u.username}</strong></td>
          <td>${u.email}</td>
          <td><span class="badge ${u.role==='admin'?'badge-blue':'badge-gray'}">${u.role}</span></td>
          <td><span class="badge ${u.is_active?'badge-green':'badge-red'}">${u.is_active?'Ativo':'Inativo'}</span></td>
          <td>${u.two_factor_enabled?'<span class="badge badge-green">✓ Ativo</span>':'<span class="badge badge-gray">Não</span>'}</td>
          <td>${u.must_change_password?'<span class="badge badge-red" title="Utilizador deve alterar a senha no próximo login">⚠ Alterar</span>':'<span class="badge badge-green">✓ OK</span>'}</td>
          <td class="text-sm text-gray">${u.last_login_at ? new Date(u.last_login_at).toLocaleString('pt-PT') : 'Nunca'}</td>
          <td>
            <button class="btn btn-sm btn-${u.is_active?'danger':'success'}" onclick="toggleUser(${u.id},${!u.is_active})">${u.is_active?'Desativar':'Ativar'}</button>
            <button class="btn btn-sm btn-secondary" onclick="resetPassword(${u.id},'${u.username}')" title="Repor senha">🔑 Repor Senha</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
    window.toggleUser = async (id, active) => {
      try { await put(`/admin/users/${id}`, { is_active: active }); toast('Utilizador atualizado'); loadUsers(); } catch (e) { toast(e.message, 'error'); }
    };
    window.resetPassword = (id, username) => {
      const nova = prompt(`Nova senha para "${username}" (mínimo 6 caracteres):\n\nDeixe em branco para usar a senha padrão: Sigms@2026!`);
      if (nova === null) return; // cancelled
      const senha = nova.trim() || 'Sigms@2026!';
      if (senha.length < 6) { toast('Senha demasiado curta (mínimo 6 caracteres)', 'error'); return; }
      put(`/admin/users/${id}`, { password: senha })
        .then(() => { toast(`Senha de "${username}" reposta. O utilizador deverá alterar no próximo login.`, 'success'); loadUsers(); })
        .catch(e => toast(e.message, 'error'));
    };
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
  }
}

async function saveUser() {
  const errEl = document.getElementById('u-error');
  errEl.classList.add('hidden');
  const body = {
    username: document.getElementById('u-username').value,
    email: document.getElementById('u-email').value,
    password: document.getElementById('u-password').value,
    role: document.getElementById('u-role').value,
  };
  const btn = document.getElementById('btn-save-user');
  btn.disabled = true;
  try {
    await post('/admin/users', body);
    toast('Utilizador criado');
    document.getElementById('user-modal').classList.add('hidden');
    loadUsers();
  } catch (e) {
    errEl.textContent = e.message; errEl.classList.remove('hidden');
  } finally { btn.disabled = false; }
}

async function loadAuditLog() {
  const container = document.getElementById('audit-list');
  container.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const data = await get('/admin/audit-log?size=50');
    container.innerHTML = `
    <div class="table-wrapper"><table>
      <thead><tr><th>Data</th><th>Utilizador</th><th>Ação</th><th>Entidade</th><th>ID</th><th>IP</th></tr></thead>
      <tbody>
        ${data.items.map(l => `
        <tr>
          <td class="text-sm">${new Date(l.created_at).toLocaleString('pt-PT')}</td>
          <td>${l.user_id || '-'}</td>
          <td><span class="badge ${l.action==='ANONYMIZE'?'badge-red':l.action==='READ'?'badge-gray':'badge-blue'}">${l.action}</span></td>
          <td>${l.entity_type}</td>
          <td>${l.entity_id || '-'}</td>
          <td class="text-sm text-gray font-mono">${l.ip_address || '-'}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
  }
}

async function runBackup() {
  const btn = document.getElementById('btn-run-backup');
  btn.disabled = true; btn.textContent = 'A criar backup...';
  try {
    const data = await post('/admin/backup', {});
    toast(`Backup criado: ${data.path}`);
    loadBackups();
  } catch (e) { toast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = '▶ Criar Backup Agora'; }
}

async function loadBackups() {
  const container = document.getElementById('backup-list');
  try {
    const data = await get('/admin/backup/list');
    if (!data.length) {
      container.innerHTML = `<p class="text-gray">Nenhum backup encontrado</p>`;
      return;
    }
    container.innerHTML = `
    <table style="width:100%"><thead><tr><th>Ficheiro</th><th>Tamanho</th></tr></thead><tbody>
      ${data.map(b => `<tr><td class="font-mono">${b.filename}</td><td>${b.size_kb} KB</td></tr>`).join('')}
    </tbody></table>`;
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function handleImport(file) {
  if (!file) return;
  const { apiMultipart } = await import('./api.js');
  const preview = document.getElementById('import-preview');
  preview.innerHTML = `<div class="loading"><div class="spinner"></div> A analisar ficheiro...</div>`;
  preview.classList.remove('hidden');
  try {
    const fd = new FormData();
    fd.append('file', file);
    const data = await apiMultipart('/imports/preview', fd);
    preview.innerHTML = `
    <div class="alert alert-success">✓ Ficheiro lido: ${data.total_rows} linhas — ${data.columns.length} colunas</div>
    <div style="margin-bottom:8px;font-size:13px">Mapeamento sugerido: ${JSON.stringify(data.suggestions)}</div>
    <div style="overflow-x:auto">
      <table style="font-size:12px"><thead><tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${data.preview.map(row => `<tr>${data.columns.map(c => `<td>${row[c]??''}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
    <button class="btn btn-primary" style="margin-top:12px" onclick="executeImport('${encodeURIComponent(JSON.stringify(data.suggestions))}')">▶ Executar Importação</button>`;
    window._importFile = file;
    window._importSuggestions = data.suggestions;
  } catch (e) {
    preview.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

window.executeImport = async (mappingEnc) => {
  const { apiMultipart } = await import('./api.js');
  const result = document.getElementById('import-result');
  result.classList.remove('hidden');
  result.innerHTML = `<div class="loading"><div class="spinner"></div> A processar...</div>`;
  try {
    const fd = new FormData();
    fd.append('file', window._importFile);
    fd.append('mapping', decodeURIComponent(mappingEnc));
    const data = await fetch('/imports/execute', { method: 'POST', body: fd });
    const res = await data.json();
    result.innerHTML = `
    <div class="alert alert-success">
      Criados: ${res.created} | Atualizados: ${res.updated} | Ignorados: ${res.skipped}
      ${res.errors.length ? `<br>Erros: ${res.errors.map(e => `Linha ${e.row}: ${e.error}`).join(', ')}` : ''}
    </div>`;
  } catch (e) {
    result.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
};
