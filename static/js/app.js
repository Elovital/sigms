/* SIGMS ELOVITAL — SPA Router */
import { getToken, clearToken } from './api.js';
import { renderLoginPage, initLoginHandlers, logout, getMe, showForceChangeModal } from './auth.js';
import { renderDashboard } from './dashboard.js';
import { renderClients } from './clients.js';
import { renderApolices } from './apolices.js';
import { renderFinanceiro } from './financeiro.js';
import { renderSinistros } from './sinistros.js';
import { renderAdmin } from './admin.js';
import { renderAcompanhamento } from './acompanhamento.js';
import { renderProspeccao } from './prospeccao.js';
import { renderPerfil } from './perfil.js';
import { renderIA } from './ia.js';
import { renderCotacoes } from './cotacoes.js';

const _svg = paths => `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const SIDEBAR_ITEMS = [
    { hash: '#/', icon: _svg('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'), label: 'Dashboard' },
    { section: 'CRM' },
    { hash: '#/clientes', icon: _svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'), label: 'Clientes' },
    { hash: '#/apolices', icon: _svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'), label: 'Apólices' },
    { section: 'Vendas' },
    { hash: '#/prospeccao', icon: _svg('<circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>'), label: 'Prospecção' },
    { hash: '#/acompanhamento', icon: _svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'), label: 'Acompanhamento' },
    { section: 'Financeiro' },
    { hash: '#/financeiro', icon: _svg('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'), label: 'Recibos & Comissões' },
    { section: 'Operacional' },
    { hash: '#/sinistros', icon: _svg('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'), label: 'Sinistros' },
    { section: 'Inteligência' },
    { hash: '#/ia', icon: _svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'), label: 'IA Insights' },
    { hash: '#/cotacoes', icon: _svg('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'), label: 'Comparativo Cotações' },
    { section: 'Sistema' },
    { hash: '#/admin', icon: _svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>'), label: 'Administração', adminOnly: true },
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
    if (currentUser?.must_change_password) {
        showForceChangeModal();
    }
}

function renderLayout(root) {
    const items = SIDEBAR_ITEMS
        .filter(item => !item.adminOnly || currentUser?.role === 'admin')
        .map(item => {
            if (item.section) return `<div class="nav-section-label">${item.section}</div>`;
            return `<a class="nav-item" data-hash="${item.hash}" href="${item.hash}"><span class="nav-icon-wrap">${item.icon}</span> <span class="nav-label">${item.label}</span></a>`;
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
    '/ia': { title: 'IA Insights', render: (c) => renderIA(c) },
    '/cotacoes': { title: 'Comparativo de Cotações', render: (c) => renderCotacoes(c) },
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
