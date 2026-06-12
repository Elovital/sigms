/* SIGMS ELOVITAL — Utilities */

export const PROVINCIAS_ANGOLA = [
    "Bengo","Benguela","Bié","Cabinda","Cuando Cubango",
    "Cuanza Norte","Cuanza Sul","Cunene","Huambo","Huíla",
    "Luanda","Lunda Norte","Lunda Sul","Malanje","Moxico",
    "Namibe","Uíge","Zaire",
];

export function toast(msg, type = 'success') {
    const container = document.getElementById('toast-container') || (() => {
        const el = document.createElement('div');
        el.id = 'toast-container';
        el.className = 'toast-container';
        document.body.appendChild(el);
        return el;
    })();
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    t.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

export function formatAKZ(value) {
    if (value == null || isNaN(value)) return 'Kz 0,00';
    return 'Kz ' + Number(value).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Keep alias for compatibility
export const formatEuro = formatAKZ;

export function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-AO');
}

export function formatDatetime(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-AO');
}

export function estadoBadge(estado) {
    const map = {
        'Ativa': 'badge-green', 'Suspensa': 'badge-yellow', 'Cancelada': 'badge-red', 'Caducada': 'badge-gray',
        'Pago': 'badge-green', 'Pendente': 'badge-yellow', 'Atrasado': 'badge-red', 'Cancelado': 'badge-gray',
        'Aberto': 'badge-blue', 'Em Analise': 'badge-yellow', 'Em Regularizacao': 'badge-cyan', 'Fechado': 'badge-gray', 'Anulado': 'badge-red',
        'Prevista': 'badge-yellow', 'Recebida': 'badge-green', 'Paga': 'badge-blue', 'Estornada': 'badge-red',
        'Interessado': 'badge-green', 'Não Interessado': 'badge-red', 'Aguardar': 'badge-yellow',
        'Proposta Enviada': 'badge-blue', 'Convertido': 'badge-green',
    };
    return `<span class="badge ${map[estado] || 'badge-gray'}">${estado}</span>`;
}

export function ramoBadge(ramo) {
    const icons = { AUTO: '🚗', VIDA: '❤️', SAUDE: '🏥', AT: '👷', MULTI: '🏠', RC: '⚖️', VIAGEM: '✈️' };
    return `${icons[ramo] || '📋'} ${ramo}`;
}

export function showModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
export function hideModal(id) { document.getElementById(id)?.classList.add('hidden'); }

export function debounce(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function validateNIF(nif) {
    // Angola NIF validation (formato básico: 9-10 dígitos)
    nif = nif.replace(/\s/g, '');
    return /^\d{9,14}$/.test(nif);
}

export function validateIBAN(iban) {
    // Angola IBAN: AO + 2 check digits + 21 numeric = 25 chars
    iban = iban.replace(/\s/g, '').toUpperCase();
    if (iban.length !== 25 || !iban.startsWith('AO')) return false;
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
    let rem = 0;
    for (const ch of numeric) rem = (rem * 10 + parseInt(ch)) % 97;
    return rem === 1;
}

export function provinciaSelect(selectedValue = '') {
    return `<select id="c-provincia">
        <option value="">-- Seleccione a Província --</option>
        ${PROVINCIAS_ANGOLA.map(p => `<option value="${p}" ${p === selectedValue ? 'selected' : ''}>${p}</option>`).join('')}
    </select>`;
}

export function paginate(total, page, size) {
    const totalPages = Math.ceil(total / size);
    const from = (page - 1) * size + 1;
    const to = Math.min(page * size, total);
    return { totalPages, from, to };
}

export function tipoInteracaoBadge(tipo) {
    const map = {
        'Chamada': '📞', 'Email': '✉️', 'WhatsApp': '💬',
        'Visita': '🚶', 'Reunião': '🤝', 'SMS': '📱', 'Outro': '📝',
    };
    return `${map[tipo] || '📝'} ${tipo}`;
}
