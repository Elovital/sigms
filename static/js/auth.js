/* SIGMS ELOVITAL — Auth Module */
import { post, setToken, clearToken } from './api.js';
import { toast } from './utils.js';

export async function login(username, password) {
    const data = await post('/auth/login', { username, password });
    if (data.requires_2fa) return { requires_2fa: true, pre_auth_token: data.pre_auth_token };
    setToken(data.access_token);
    // Novo login → mostrar o popup de acompanhamentos uma vez nesta sessão.
    sessionStorage.removeItem('sigms_acomp_popup_shown');
    return { requires_2fa: false, must_change_password: data.must_change_password };
}

export async function verify2FA(code, preAuthToken) {
    const res = await fetch('/auth/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Pre-Auth-Token': preAuthToken },
        body: JSON.stringify({ code }),
        credentials: 'include',
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Erro' }));
        throw new Error(err.detail);
    }
    const data = await res.json();
    setToken(data.access_token);
    sessionStorage.removeItem('sigms_acomp_popup_shown');
    return { must_change_password: data.must_change_password };
}

export async function logout() {
    try { await post('/auth/logout', {}); } catch {}
    clearToken();
    window.location.hash = '#/login';
    window.location.reload();
}

export async function getMe() {
    const { get } = await import('./api.js');
    return get('/auth/me');
}

export function renderLoginPage() {
    // Check if we are on a reset-password hash with a token
    const hash = window.location.hash;
    const resetMatch = hash.match(/[?&]token=([^&]+)/);
    const resetToken = resetMatch ? resetMatch[1] : null;

    return `
<div class="auth-screen" id="login-screen">
  <div class="auth-card">
    <div class="auth-logo" style="justify-content:center;margin-bottom:24px">
      <img src="/static/img/logo.png" alt="ELOVITAL" style="height:110px;object-fit:contain">
    </div>
    <p style="text-align:center;font-size:12px;color:var(--gray-500);margin-bottom:24px">Gestão de Mediação de Seguros — Angola</p>

    <!-- Login form -->
    <div id="login-form-container" ${resetToken ? 'class="hidden"' : ''}>
      <div class="form-group">
        <label>Email ou utilizador</label>
        <input type="text" id="login-username" placeholder="seu@email.com" autocomplete="username">
      </div>
      <div class="form-group">
        <label>Palavra-passe</label>
        <input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password">
      </div>
      <div id="login-error" class="alert alert-danger hidden" style="margin-bottom:12px"></div>
      <button class="btn btn-primary w-full" id="login-btn" style="margin-top:8px">Entrar</button>
      <div style="text-align:center;margin-top:12px">
        <a href="#" id="forgot-link" style="font-size:13px;color:var(--gray-500);text-decoration:none">Esqueceu a senha?</a>
      </div>
    </div>

    <!-- Forgot password form -->
    <div id="forgot-container" class="hidden">
      <div class="alert alert-info" style="margin-bottom:16px">
        <span>📧</span><span>Introduza o seu email para receber o link de recuperação.</span>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="forgot-email" placeholder="seu@email.com" autocomplete="email">
      </div>
      <div id="forgot-error" class="alert alert-danger hidden" style="margin-bottom:12px"></div>
      <div id="forgot-success" class="alert alert-info hidden" style="margin-bottom:12px"></div>
      <button class="btn btn-primary w-full" id="forgot-btn">Enviar link de recuperação</button>
      <div style="text-align:center;margin-top:12px">
        <a href="#" id="back-to-login" style="font-size:13px;color:var(--gray-500);text-decoration:none">← Voltar ao login</a>
      </div>
    </div>

    <!-- Reset password form (via token) -->
    <div id="reset-container" ${resetToken ? '' : 'class="hidden"'}>
      <div class="alert alert-info" style="margin-bottom:16px">
        <span>🔑</span><span>Defina a sua nova senha.</span>
      </div>
      <div class="form-group">
        <label>Nova senha</label>
        <input type="password" id="reset-password" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
      </div>
      <div class="form-group">
        <label>Confirmar nova senha</label>
        <input type="password" id="reset-password-confirm" placeholder="Repetir senha" autocomplete="new-password">
      </div>
      <div id="reset-error" class="alert alert-danger hidden" style="margin-bottom:12px"></div>
      <button class="btn btn-primary w-full" id="reset-btn" data-token="${resetToken || ''}">Redefinir senha</button>
    </div>

    <!-- 2FA form -->
    <div id="twofa-container" class="hidden">
      <div class="alert alert-info" style="margin-bottom:16px">
        <span>🔐</span><span>Introduza o código do seu autenticador</span>
      </div>
      <div class="form-group">
        <label>Código 2FA</label>
        <input type="text" id="twofa-code" placeholder="000000" maxlength="6" inputmode="numeric" style="letter-spacing:8px;font-size:20px;text-align:center">
      </div>
      <div id="twofa-error" class="alert alert-danger hidden" style="margin-bottom:12px"></div>
      <button class="btn btn-primary w-full" id="twofa-btn">Verificar</button>
    </div>

    <p style="text-align:center;margin-top:24px;font-size:11px;color:var(--gray-400)">
      SIGMS ELOVITAL v1.0 · Mediação de Seguros Angola
    </p>
  </div>
</div>`;
}

export function initLoginHandlers() {
    let preAuthToken = null;

    const loginBtn = document.getElementById('login-btn');
    const twofaBtn = document.getElementById('twofa-btn');
    const forgotBtn = document.getElementById('forgot-btn');
    const resetBtn = document.getElementById('reset-btn');

    async function doLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errEl = document.getElementById('login-error');
        errEl.classList.add('hidden');
        loginBtn.disabled = true;
        loginBtn.textContent = 'A entrar...';
        try {
            const result = await login(username, password);
            if (result.requires_2fa) {
                preAuthToken = result.pre_auth_token;
                document.getElementById('login-form-container').classList.add('hidden');
                document.getElementById('twofa-container').classList.remove('hidden');
                document.getElementById('twofa-code').focus();
            } else if (result.must_change_password) {
                showForceChangeModal();
            } else {
                window.location.hash = '#/';
                window.location.reload();
            }
        } catch (e) {
            errEl.textContent = e.message;
            errEl.classList.remove('hidden');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Entrar';
        }
    }

    async function do2FA() {
        const code = document.getElementById('twofa-code').value.trim();
        const errEl = document.getElementById('twofa-error');
        errEl.classList.add('hidden');
        twofaBtn.disabled = true;
        try {
            const result = await verify2FA(code, preAuthToken);
            if (result.must_change_password) {
                showForceChangeModal();
            } else {
                window.location.hash = '#/';
                window.location.reload();
            }
        } catch (e) {
            errEl.textContent = e.message;
            errEl.classList.remove('hidden');
        } finally {
            twofaBtn.disabled = false;
        }
    }

    async function doForgot() {
        const email = document.getElementById('forgot-email').value.trim();
        const errEl = document.getElementById('forgot-error');
        const successEl = document.getElementById('forgot-success');
        errEl.classList.add('hidden');
        successEl.classList.add('hidden');
        if (!email) { errEl.textContent = 'Introduza o seu email.'; errEl.classList.remove('hidden'); return; }
        forgotBtn.disabled = true;
        forgotBtn.textContent = 'A enviar...';
        try {
            const data = await post('/auth/request-password-reset', { email });
            successEl.textContent = data.message;
            successEl.classList.remove('hidden');
        } catch (e) {
            errEl.textContent = e.message;
            errEl.classList.remove('hidden');
            forgotBtn.disabled = false;
            forgotBtn.textContent = 'Enviar link de recuperação';
        }
    }

    async function doReset() {
        const token = resetBtn.dataset.token;
        const newPwd = document.getElementById('reset-password').value;
        const confirmPwd = document.getElementById('reset-password-confirm').value;
        const errEl = document.getElementById('reset-error');
        errEl.classList.add('hidden');
        if (newPwd.length < 6) { errEl.textContent = 'A senha deve ter pelo menos 6 caracteres.'; errEl.classList.remove('hidden'); return; }
        if (newPwd !== confirmPwd) { errEl.textContent = 'As senhas não coincidem.'; errEl.classList.remove('hidden'); return; }
        resetBtn.disabled = true;
        resetBtn.textContent = 'A redefinir...';
        try {
            const data = await post('/auth/reset-password', { token, new_password: newPwd });
            document.getElementById('reset-container').innerHTML = `
              <div class="alert alert-info"><span>✅</span><span>${data.message}</span></div>
              <button class="btn btn-primary w-full" style="margin-top:12px" onclick="window.location.hash='';window.location.reload()">Ir para o Login</button>`;
        } catch (e) {
            errEl.textContent = e.message;
            errEl.classList.remove('hidden');
            resetBtn.disabled = false;
            resetBtn.textContent = 'Redefinir senha';
        }
    }

    loginBtn?.addEventListener('click', doLogin);
    document.getElementById('login-password')?.addEventListener('keydown', e => e.key === 'Enter' && doLogin());

    document.getElementById('forgot-link')?.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('login-form-container').classList.add('hidden');
        document.getElementById('forgot-container').classList.remove('hidden');
    });

    document.getElementById('back-to-login')?.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('forgot-container').classList.add('hidden');
        document.getElementById('login-form-container').classList.remove('hidden');
    });

    forgotBtn?.addEventListener('click', doForgot);
    document.getElementById('forgot-email')?.addEventListener('keydown', e => e.key === 'Enter' && doForgot());

    resetBtn?.addEventListener('click', doReset);

    twofaBtn?.addEventListener('click', do2FA);
    document.getElementById('twofa-code')?.addEventListener('keydown', e => e.key === 'Enter' && do2FA());
}

export function showForceChangeModal() {
    const existing = document.getElementById('force-change-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'force-change-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <h3 style="margin:0 0 8px;font-size:18px;color:#111">🔑 Definir Nova Senha</h3>
        <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 14px;margin:0 0 20px;font-size:13px;color:#92400e;line-height:1.5">
          ⚠️ A sua senha foi reposta pelo administrador.<br>
          <strong>Introduza a senha temporária que recebeu</strong> no primeiro campo, e defina uma nova senha pessoal nos campos seguintes.
        </div>
        <div class="form-group">
          <label>Senha Temporária (fornecida pelo admin)</label>
          <input type="password" id="fc-current" placeholder="Senha que o administrador lhe deu" autocomplete="current-password">
        </div>
        <div class="form-group">
          <label>Nova Senha</label>
          <input type="password" id="fc-new" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label>Confirmar Nova Senha</label>
          <input type="password" id="fc-confirm" placeholder="Repetir nova senha" autocomplete="new-password">
        </div>
        <div id="fc-error" class="alert alert-danger hidden" style="margin-bottom:12px"></div>
        <button class="btn btn-primary w-full" id="fc-btn">Alterar Senha e Entrar</button>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById('fc-btn').addEventListener('click', async () => {
        const current = document.getElementById('fc-current').value;
        const newPwd = document.getElementById('fc-new').value;
        const confirm = document.getElementById('fc-confirm').value;
        const errEl = document.getElementById('fc-error');
        errEl.classList.add('hidden');
        if (newPwd.length < 6) { errEl.textContent = 'A nova senha deve ter pelo menos 6 caracteres.'; errEl.classList.remove('hidden'); return; }
        if (newPwd !== confirm) { errEl.textContent = 'As senhas não coincidem.'; errEl.classList.remove('hidden'); return; }
        const btn = document.getElementById('fc-btn');
        btn.disabled = true; btn.textContent = 'A alterar...';
        try {
            await post('/auth/change-password', { current_password: current, new_password: newPwd });
            overlay.remove();
            window.location.hash = '#/';
            window.location.reload();
        } catch (e) {
            errEl.textContent = e.message;
            errEl.classList.remove('hidden');
            btn.disabled = false; btn.textContent = 'Alterar Senha e Entrar';
        }
    });
}
