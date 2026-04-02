/* SIGMS IA Insights Module */
import { get } from './api.js';

export async function renderIA(container) {
  container.innerHTML = `
<div class="page-content">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
    <div style="font-size:28px">🧠</div>
    <div>
      <div style="font-size:13px;color:var(--gray-500)">Análises automáticas calculadas a partir dos dados do sistema</div>
    </div>
  </div>

  <div id="ia-loading" class="loading"><div class="spinner"></div> A calcular insights...</div>
  <div id="ia-content" style="display:none"></div>
</div>`;

  try {
    const data = await get('/ia/insights');
    renderInsights(data);
  } catch (e) {
    document.getElementById('ia-loading').innerHTML =
      `<div class="alert alert-danger">Erro ao carregar insights: ${e.message}</div>`;
  }
}

function renderInsights(data) {
  const loading = document.getElementById('ia-loading');
  const content = document.getElementById('ia-content');
  loading.style.display = 'none';
  content.style.display = 'block';

  content.innerHTML = `
  <!-- 3-column grid -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:16px">

    <!-- Follow-up Automático -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📞 Follow-up Automático</span>
      </div>
      <div class="card-body" style="padding:0">
        ${data.follow_ups.length === 0
          ? `<div style="padding:20px;text-align:center;color:var(--gray-400);font-size:13px">Sem clientes a necessitar de contacto</div>`
          : data.follow_ups.map(f => `
          <div style="padding:12px 16px;border-bottom:1px solid var(--gray-200);last-child:border-bottom:none">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-weight:600;font-size:14px;color:var(--gray-900)">${escHtml(f.cliente)}</span>
              <span class="badge ${f.prioridade === 'alta' ? 'badge-red' : 'badge-yellow'}">${f.prioridade === 'alta' ? '🔴 Alta' : '🟡 Média'}</span>
            </div>
            <div style="font-size:12px;color:var(--gray-600)">${escHtml(f.acao)}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Análise de Sentimento -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">💬 Análise de Sentimento</span>
      </div>
      <div class="card-body">
        <div style="font-size:11px;color:var(--gray-400);margin-bottom:12px">Score de satisfação por cliente (0–100)</div>
        ${data.sentimento.length === 0
          ? `<div style="text-align:center;color:var(--gray-400);font-size:13px">Sem dados de clientes</div>`
          : data.sentimento.map(s => `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-size:13px;font-weight:500;color:var(--gray-800)">${escHtml(s.cliente)}</span>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-weight:700;font-size:13px;color:${s.color}">${s.score}</span>
                <span class="badge ${s.label === 'Positivo' ? 'badge-green' : s.label === 'Neutro' ? 'badge-yellow' : 'badge-red'}">${s.label}</span>
              </div>
            </div>
            <div style="height:6px;border-radius:3px;background:var(--gray-200);overflow:hidden">
              <div class="ia-bar" data-width="${s.score}" style="height:100%;border-radius:3px;background:${s.color};width:0%;transition:width .7s ease-out"></div>
            </div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Predição de Sinistralidade -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📊 Sinistralidade por Ramo</span>
      </div>
      <div class="card-body">
        <div style="font-size:11px;color:var(--gray-400);margin-bottom:12px">Loss Ratio · &gt;65% = alerta</div>
        ${data.sinistralidade.length === 0
          ? `<div style="text-align:center;color:var(--gray-400);font-size:13px">Sem dados de sinistros</div>`
          : data.sinistralidade.map(s => `
          <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--gray-200)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-size:13px;font-weight:600;color:var(--gray-800)">${escHtml(s.ramo)}</span>
              <div style="display:flex;align-items:center;gap:6px">
                ${s.alerta ? '<span style="font-size:14px">⚠️</span>' : ''}
                <span style="font-weight:700;font-size:13px;color:${lrColor(s.loss_ratio)}">${s.loss_ratio}%</span>
              </div>
            </div>
            <div style="height:6px;border-radius:3px;background:var(--gray-200);overflow:hidden">
              <div class="ia-bar" data-width="${Math.min(s.loss_ratio, 100)}" style="height:100%;border-radius:3px;background:${lrColor(s.loss_ratio)};width:0%;transition:width .7s ease-out"></div>
            </div>
            <div style="font-size:11px;color:var(--gray-400);margin-top:3px">${s.total_apolices} apólice(s)</div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- Próximas Ações -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">⚡ Próximas Ações Recomendadas</span>
    </div>
    <div class="card-body">
      ${data.proximas_acoes.length === 0
        ? `<div style="text-align:center;color:var(--gray-400);font-size:13px;padding:20px">Nenhuma acção urgente neste momento</div>`
        : `<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px">
          ${data.proximas_acoes.map((a, i) => `
          <li style="display:flex;align-items:flex-start;gap:12px">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${i + 1}</div>
            <div style="display:flex;align-items:center;gap:8px;flex:1">
              <span style="font-size:18px">${a.icon}</span>
              <span style="font-size:14px;color:var(--gray-800)">${escHtml(a.descricao)}</span>
              <span class="badge ${a.prioridade === 'alta' ? 'badge-red' : 'badge-yellow'}" style="margin-left:auto;white-space:nowrap">${a.prioridade === 'alta' ? 'Alta' : 'Média'}</span>
            </div>
          </li>`).join('')}
        </ol>`}
    </div>
  </div>`;

  // Animate progress bars
  requestAnimationFrame(() => {
    document.querySelectorAll('.ia-bar').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  });
}

function lrColor(v) {
  if (v >= 65) return '#c81e1e';
  if (v >= 40) return '#c27803';
  return '#057a55';
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
