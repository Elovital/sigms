import { post } from './api.js';
import { toast } from './utils.js';

export async function renderPerfil(container, currentUser) {
    container.innerHTML = `
<div class="page-content">
  <div class="page-header"><h2>Meu Perfil</h2></div>

  <div style="max-width:480px;display:flex;flex-direction:column;gap:20px">

    <!-- Info do utilizador -->
    <div class="card">
      <div class="card-header"><h3 class="card-title">Informações da Conta</h3></div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;gap:12px;align-items:center">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700">
            ${(currentUser?.username || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style="font-size:18px;font-weight:600">${currentUser?.username}</div>
            <div style="color:var(--gray-500);font-size:13px">${currentUser?.role === 'admin' ? 'Administrador' : 'Comercial'}</div>
            <div style="color:var(--gray-400);font-size:12px">${currentUser?.email || ''}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Alterar senha -->
    <div class="card">
      <div class="card-header"><h3 class="card-title">Alterar Senha</h3></div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
        <div class="form-group">
          <label class="form-label">Senha Actual</label>
          <input type="password" id="current-password" class="form-control" placeholder="••••••••">
        </div>
        <div class="form-group">
          <label class="form-label">Nova Senha</label>
          <input type="password" id="new-password" class="form-control" placeholder="••••••••">
        </div>
        <div class="form-group">
          <label class="form-label">Confirmar Nova Senha</label>
          <input type="password" id="confirm-password" class="form-control" placeholder="••••••••">
        </div>
        <button class="btn btn-primary" onclick="savePassword()">Guardar Nova Senha</button>
      </div>
    </div>

  </div>
</div>`;

    window.savePassword = async () => {
        const current = document.getElementById('current-password').value.trim();
        const novo = document.getElementById('new-password').value.trim();
        const confirm = document.getElementById('confirm-password').value.trim();

        if (!current || !novo || !confirm) {
            toast('Preencha todos os campos', 'warning'); return;
        }
        if (novo !== confirm) {
            toast('As senhas não coincidem', 'warning'); return;
        }
        if (novo.length < 6) {
            toast('A nova senha deve ter pelo menos 6 caracteres', 'warning'); return;
        }
        try {
            await post('/auth/change-password', { current_password: current, new_password: novo });
            toast('Senha alterada com sucesso!', 'success');
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        } catch (e) {
            toast(e.message || 'Erro ao alterar senha', 'danger');
        }
    };
}
