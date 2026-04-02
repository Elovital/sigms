/* SIGMS Dashboard */
import { get } from './api.js';
import { formatAKZ, formatDate, estadoBadge } from './utils.js';

let ramoChart = null;
let comissoesChart = null;

export async function renderDashboard(container) {
  container.innerHTML = `
<div class="page-content">
  <div class="kpi-grid" id="kpi-grid">
    ${[1,2,3,4,5,6].map(() => `<div class="kpi-card"><div class="kpi-icon blue"><div class="spinner"></div></div><div class="kpi-info"><div class="kpi-value">—</div><div class="kpi-label">A carregar...</div></div></div>`).join('')}
  </div>

  <div class="charts-grid">
    <div class="card">
      <div class="card-header"><span class="card-title">📊 Distribuição por Ramo</span></div>
      <div class="card-body" style="height:260px;position:relative"><canvas id="chart-ramos"></canvas></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">💰 Cash Flow Comissões (12 meses)</span></div>
      <div class="card-body" style="height:260px;position:relative"><canvas id="chart-comissoes"></canvas></div>
    </div>
  </div>

  <!-- Prospecção Ativa card -->
  <div class="card">
    <div class="card-header" style="justify-content:space-between">
      <span class="card-title">🎯 Prospecção Ativa</span>
      <a href="#/prospeccao" style="font-size:12px;color:var(--primary);text-decoration:none;font-weight:500">Ver tudo →</a>
    </div>
    <div id="prosp-card-body">
      <div class="loading"><div class="spinner"></div> A carregar...</div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <span class="card-title">🔔 Ações Prioritárias - Renovações em 30 dias</span>
    </div>
    <div id="quick-actions-list">
      <div class="loading"><div class="spinner"></div> A carregar...</div>
    </div>
  </div>
</div>`;

  loadKPIs();
  loadCharts();
  loadProspCard();
  loadQuickActions();
}

async function loadKPIs() {
  try {
    const kpis = await get('/dashboard/kpis');
    const grid = document.getElementById('kpi-grid');
    grid.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon blue">💰</div>
        <div class="kpi-info">
          <div class="kpi-value">${formatAKZ(kpis.producao_mensal)}</div>
          <div class="kpi-label">Produção Mensal</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon green">📋</div>
        <div class="kpi-info">
          <div class="kpi-value">${kpis.total_apolices_ativas}</div>
          <div class="kpi-label">Apólices Ativas</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon cyan">📈</div>
        <div class="kpi-info">
          <div class="kpi-value">${kpis.taxa_retencao}%</div>
          <div class="kpi-label">Taxa de Retenção</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon yellow">🔄</div>
        <div class="kpi-info">
          <div class="kpi-value">${kpis.renovacoes_30_dias}</div>
          <div class="kpi-label">Renovações (30 dias)</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon red">⚠️</div>
        <div class="kpi-info">
          <div class="kpi-value">${kpis.sinistros_ativos}</div>
          <div class="kpi-label">Sinistros Ativos</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon red">💳</div>
        <div class="kpi-info">
          <div class="kpi-value">${kpis.pagamentos_atrasados}</div>
          <div class="kpi-label">Pagamentos Atrasados</div>
        </div>
      </div>`;
  } catch (e) {
    document.getElementById('kpi-grid').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function loadCharts() {
  try {
    const [ramos, comissoes] = await Promise.all([
      get('/dashboard/charts/ramos'),
      get('/dashboard/charts/comissoes'),
    ]);

    // Ramo donut chart
    const ramoCtx = document.getElementById('chart-ramos')?.getContext('2d');
    if (ramoCtx && ramos.length) {
      if (ramoChart) ramoChart.destroy();
      const colors = ['#1a56db','#057a55','#c27803','#c81e1e','#0e7490','#7c3aed','#be185d'];
      ramoChart = new Chart(ramoCtx, {
        type: 'doughnut',
        data: {
          labels: ramos.map(r => r.ramo),
          datasets: [{ data: ramos.map(r => r.count), backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { font: { size: 11 }, padding: 12 } },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const r = ramos[ctx.dataIndex];
                  return ` ${r.count} apólices — ${formatAKZ(r.total_premio)}`;
                }
              }
            }
          }
        }
      });
    }

    // Commissions bar chart
    const comCtx = document.getElementById('chart-comissoes')?.getContext('2d');
    if (comCtx && comissoes.length) {
      if (comissoesChart) comissoesChart.destroy();
      comissoesChart = new Chart(comCtx, {
        type: 'bar',
        data: {
          labels: comissoes.map(c => c.month),
          datasets: [
            { label: 'Previstas', data: comissoes.map(c => c.previstas), backgroundColor: 'rgba(26,86,219,.2)', borderColor: '#1a56db', borderWidth: 1 },
            { label: 'Recebidas', data: comissoes.map(c => c.recebidas), backgroundColor: 'rgba(5,122,85,.7)', borderColor: '#057a55', borderWidth: 1 },
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            y: { ticks: { callback: v => formatAKZ(v) }, grid: { color: '#f3f4f6' } },
            x: { grid: { display: false } }
          },
          plugins: {
            legend: { position: 'top', labels: { font: { size: 11 } } },
            tooltip: { callbacks: { label: ctx => ` ${formatAKZ(ctx.raw)}` } }
          }
        }
      });
    }
  } catch (e) { console.error('Charts error:', e); }
}

async function loadProspCard() {
  const body = document.getElementById('prosp-card-body');
  try {
    const stats = await get('/prospeccao/stats');
    const FUNIL = [
      { key: 'Nova',               emoji: '🆕', color: '#6366f1' },
      { key: 'Cotação Enviada',     emoji: '📤', color: '#0ea5e9' },
      { key: 'Aguarda Seguradora',  emoji: '⏳', color: '#f59e0b' },
      { key: 'Aguarda Cliente',     emoji: '📞', color: '#f97316' },
      { key: 'Aguarda Pagamento',   emoji: '💳', color: '#8b5cf6' },
    ];
    const totalAtivo = FUNIL.reduce((s, f) => s + (stats[f.key] || 0), 0);
    const convertidas = stats['Convertida'] || 0;
    const perdidas = stats['Perdida'] || 0;
    const taxaConversao = (totalAtivo + convertidas + perdidas) > 0
      ? Math.round(convertidas / (totalAtivo + convertidas + perdidas) * 100)
      : 0;

    body.innerHTML = `
    <div style="padding:16px 20px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <div style="flex:1;min-width:100px;text-align:center;padding:12px;background:var(--primary-light);border-radius:8px">
          <div style="font-size:28px;font-weight:700;color:var(--primary)">${totalAtivo}</div>
          <div style="font-size:11px;color:var(--gray-500);margin-top:2px">Em curso</div>
        </div>
        <div style="flex:1;min-width:100px;text-align:center;padding:12px;background:var(--success-light);border-radius:8px">
          <div style="font-size:28px;font-weight:700;color:var(--success)">${convertidas}</div>
          <div style="font-size:11px;color:var(--gray-500);margin-top:2px">Convertidas</div>
        </div>
        <div style="flex:1;min-width:100px;text-align:center;padding:12px;background:var(--info-light);border-radius:8px">
          <div style="font-size:28px;font-weight:700;color:var(--info)">${taxaConversao}%</div>
          <div style="font-size:11px;color:var(--gray-500);margin-top:2px">Taxa Conversão</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${FUNIL.map(f => {
          const n = stats[f.key] || 0;
          const pct = totalAtivo > 0 ? Math.round(n / totalAtivo * 100) : 0;
          return `
          <div style="display:flex;align-items:center;gap:8px">
            <span style="width:140px;font-size:12px;color:var(--gray-700)">${f.emoji} ${f.key}</span>
            <div style="flex:1;height:8px;background:var(--gray-200);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${f.color};border-radius:4px;transition:width .6s ease"></div>
            </div>
            <span style="width:24px;text-align:right;font-size:12px;font-weight:700;color:${f.color}">${n}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  } catch (e) {
    body.innerHTML = `<div class="alert alert-danger" style="margin:16px">${e.message}</div>`;
  }
}

async function loadQuickActions() {
  const container = document.getElementById('quick-actions-list');
  try {
    const { renovacoes } = await get('/dashboard/quick-actions');
    if (!renovacoes.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">Sem renovações urgentes</div><div class="empty-state-text">Não há apólices a vencer nos próximos 30 dias</div></div>`;
      return;
    }
    container.innerHTML = `
    <div class="table-wrapper">
    <table>
      <thead><tr>
        <th>Cliente</th><th>Apólice</th><th>Vencimento</th><th>Ações</th>
      </tr></thead>
      <tbody>
        ${renovacoes.map(r => `
        <tr>
          <td>${r.client_nome}</td>
          <td class="font-mono">${r.apolice_numero}</td>
          <td>${formatDate(r.data_renovacao)}</td>
          <td>
            <div class="flex gap-2">
              ${r.telefone ? `<a href="tel:${r.telefone}" class="quick-action-btn qa-call">📞 Ligar</a>` : ''}
              ${r.email ? `<a href="mailto:${r.email}?subject=Renovação da apólice ${r.apolice_numero}&body=Exmo(a) Sr(a) ${r.client_nome},%0A%0AInformamos que a sua apólice nº ${r.apolice_numero} vence em ${formatDate(r.data_renovacao)}.%0A%0ACom os melhores cumprimentos" class="quick-action-btn qa-email">✉️ Email</a>` : ''}
              ${r.telefone ? `<a href="https://wa.me/244${r.telefone.replace(/\D/g,'')}?text=Olá+${encodeURIComponent(r.client_nome)}+a+sua+apólice+${r.apolice_numero}+vence+em+${r.data_renovacao}" target="_blank" class="quick-action-btn qa-whatsapp">💬 WhatsApp</a>` : ''}
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>`;
  } catch (e) {
    container.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}
