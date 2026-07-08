// ===================================
// YuanqiZhiKe Toolkit - Date Utilities
// ===================================

(function() {
    'use strict';

    function formatDate(date) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function formatYear(date) {
        return date.getFullYear().toString();
    }

    function formatMonthYear(date) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }

    function updateElement(id, date) {
        const el = document.getElementById(id);
        if (el) el.textContent = formatDate(date);
    }

    // Auto-update all elements with data-auto-date attribute
    function autoUpdateDates() {
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

    // Expose
    window.YuanqiDateUtils = { formatDate, formatYear, formatMonthYear, updateElement, autoUpdateDates };

    // Auto-run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoUpdateDates);
    } else {
        autoUpdateDates();
    }
})();