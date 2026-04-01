/* SIGMS ELOVITAL — SPA Router */
import { getToken, clearToken } from './api.js';
import { renderLoginPage, initLoginHandlers, logout, getMe } from './auth.js';
import { renderDashboard } from './dashboard.js';
import { renderClients } from './clients.js';
import { renderApolices } from './apolices.js';
import { renderFinanceiro } from './financeiro.js';
import { renderSinistros } from './sinistros.js';
import { renderAdmin } from './admin.js';
import { renderAcompanhamento } from './acompanhamento.js';
import { renderProspeccao } from './prospeccao.js';
import { renderPerfil } from './perfil.js';

const SIDEBAR_ITEMS = [
    { hash: '#/', icon: '🏠', label: 'Dashboard' },
    { section: 'CRM' },
    { hash: '#/clientes', icon: '👥', label: 'Clientes' },
    { hash: '#/apolices', icon: '📋', label: 'Apólices' },
    { section: 'Vendas' },
    { hash: '#/prospeccao', icon: '🎯', label: 'Prospecção' },
    { hash: '#/acompanhamento', icon: '📅', label: 'Acompanhamento' },
    { section: 'Financeiro' },
    { hash: '#/financeiro', icon: '💰', label: 'Recibos & Comissões' },
    { section: 'Operacional' },
    { hash: '#/sinistros', icon: '⚠️', label: 'Sinistros' },
    { section: 'Sistema' },
    { hash: '#/admin', icon: '⚙️', label: 'Administração', adminOnly: true },
];

let currentUser = null;

async function init() {
    const root = document.getElementById('app');
    if (!getToken()) {
        root.innerHTML = renderLoginPage();
        initLoginHandlers();
        return;
    }
    try {
        currentUser = await getMe();
    } catch {
        clearToken();
        root.innerHTML = renderLoginPage();
        initLoginHandlers();
        return;
    }
    renderLayout(root);
    window.addEventListener('hashchange', () => navigate());
    navigate();
}

function renderLayout(root) {
    const items = SIDEBAR_ITEMS
        .filter(item => !item.adminOnly || currentUser?.role === 'admin')
        .map(item => {
            if (item.section) return `<div class="nav-section-label">${item.section}</div>`;
            return `<a class="nav-item" data-hash="${item.hash}" href="${item.hash}"><span class="icon">${item.icon}</span>${item.label}</a>`;
        }).join('');

    const initials = (currentUser?.username || 'U').slice(0, 2).toUpperCase();

    root.innerHTML = `
<div class="app-layout">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo" style="padding:16px 20px">
      <img src="/static/img/logo.png" alt="ELOVITAL" style="height:52px;object-fit:contain;display:block;margin:0 auto">
    </div>
    <nav class="sidebar-nav">${items}</nav>
    <div class="sidebar-user">
      <div class="user-avatar">${initials}</div>
      <div class="user-info">
        <div class="user-name">${currentUser?.username}</div>
        <div class="user-role">${currentUser?.role === 'admin' ? 'Administrador' : 'Comercial'}</div>
      </div>
      <a href="#/perfil" class="btn btn-icon" style="color:var(--gray-400)" title="Meu Perfil">👤</a>
      <button class="btn btn-icon" style="color:var(--gray-400);margin-left:auto" onclick="doLogout()" title="Terminar sessão">⏏</button>
    </div>
  </aside>

  <div class="main-content">
    <header class="topbar">
      <h1 class="topbar-title" id="page-title">Dashboard</h1>
      <div style="font-size:12px;color:var(--gray-400)">${new Date().toLocaleDateString('pt-AO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </header>
    <div id="page-content"></div>
  </div>
</div>
<div id="toast-container" class="toast-container"></div>`;

    window.doLogout = () => logout();
}

const ROUTES = {
    '/': { title: 'Dashboard', render: (c) => renderDashboard(c) },
    '/clientes': { title: 'Clientes', render: (c) => renderClients(c) },
    '/apolices': { title: 'Apólices', render: (c, p) => renderApolices(c, p, currentUser) },
    '/financeiro': { title: 'Financeiro', render: (c) => renderFinanceiro(c, currentUser) },
    '/sinistros': { title: 'Sinistros', render: (c) => renderSinistros(c) },
    '/prospeccao': { title: 'Prospecção', render: (c) => renderProspeccao(c) },
    '/acompanhamento': { title: 'Acompanhamento de Vendas', render: (c) => renderAcompanhamento(c) },
    '/admin': { title: 'Administração', render: (c) => renderAdmin(c) },
    '/perfil': { title: 'Meu Perfil', render: (c) => renderPerfil(c, currentUser) },
};

async function navigate() {
    const hash = window.location.hash.replace('#', '') || '/';
    const [path, queryStr] = hash.split('?');
    const params = Object.fromEntries(new URLSearchParams(queryStr || ''));
    const route = ROUTES[path];
    if (!route) { window.location.hash = '#/'; return; }

    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.hash === `#${path}`);
    });
    document.getElementById('page-title').textContent = route.title || 'SIGMS ELOVITAL';

    const content = document.getElementById('page-content');
    content.innerHTML = `<div class="loading"><div class="spinner"></div> A carregar...</div>`;
    try {
        await route.render(content, params);
    } catch (e) {
        content.innerHTML = `<div class="page-content"><div class="alert alert-danger">Erro: ${e.message}</div></div>`;
        console.error(e);
    }
}

init();
