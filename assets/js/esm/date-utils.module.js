// ===================================
// YuanqiZhiKe Toolkit - ESM: Date Utilities
// ===================================

export function formatDate(date) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatYear(date) {
    return date.getFullYear().toString();
}

export function formatMonthYear(date) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

export function updateElement(id, date) {
    const el = document.getElementById(id);
    if (el) el.textContent = formatDate(date);
}

export function autoUpdateDates() {
    const today = new Date();
    document.querySelectorAll('[data-auto-date]').forEach(function(el) {
        const format = el.getAttribute('data-auto-date');
        if (format === 'full') {
            el.textContent = formatDate(today);
        } else if (format === 'year') {
            el.textContent = formatYear(today);
        } else if (format === 'month-year') {
            el.textContent = formatMonthYear(today);
        }
    });
}

if (typeof window !== 'undefined') {
    window.YuanqiDateUtils = { formatDate, formatYear, formatMonthYear, updateElement, autoUpdateDates };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoUpdateDates);
    } else {
        autoUpdateDates();
    }
}
