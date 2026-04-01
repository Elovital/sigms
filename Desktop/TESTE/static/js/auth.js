/* SIGMS ELOVITAL — Auth Module */
import { post, setToken, clearToken } from './api.js';
import { toast } from './utils.js';

export async function login(username, password) {
    const data = await post('/auth/login', { username, password });
    if (data.requires_2fa) return { requires_2fa: true, pre_auth_token: data.pre_auth_token };
    setToken(data.access_token);
    return { requires_2fa: false };
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
    return `
<div class="auth-screen" id="login-screen">
  <div class="auth-card">
    <div class="auth-logo" style="justify-content:center;margin-bottom:24px">
      <img src="/static/img/logo.png" alt="ELOVITAL" style="height:110px;object-fit:contain">
    </div>
    <p style="text-align:center;font-size:12px;color:var(--gray-500);margin-bottom:24px">Gestão de Mediação de Seguros — Angola</p>

    <div id="login-form-container">
      <div class="form-group">
        <label>Utilizador</label>
        <input type="text" id="login-username" placeholder="Username" autocomplete="username">
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
      <div id="forgot-msg" class="hidden" style="margin-top:10px;padding:10px 14px;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;text-align:center">
        Contacte o administrador do sistema para repor a sua senha.
      </div>
    </div>

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
            await verify2FA(code, preAuthToken);
            window.location.hash = '#/';
            window.location.reload();
        } catch (e) {
            errEl.textContent = e.message;
            errEl.classList.remove('hidden');
        } finally {
            twofaBtn.disabled = false;
        }
    }

    loginBtn.addEventListener('click', doLogin);
    document.getElementById('login-password').addEventListener('keydown', e => e.key === 'Enter' && doLogin());
    document.getElementById('forgot-link')?.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById('forgot-msg').classList.toggle('hidden');
    });
    twofaBtn?.addEventListener('click', do2FA);
    document.getElementById('twofa-code')?.addEventListener('keydown', e => e.key === 'Enter' && do2FA());
}
