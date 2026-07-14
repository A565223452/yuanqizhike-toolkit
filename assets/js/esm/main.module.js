// ===================================
// YuanqiZhiKe Toolkit - ESM: Main JavaScript
// ===================================

import { YQZ_STATS } from './statistics.module.js';

function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.querySelector('.main-nav');
    if (!menuToggle || !mainNav) return;
    menuToggle.addEventListener('click', function () {
        mainNav.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
        if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
            mainNav.classList.remove('open');
        }
    });
}

function initSmoothScroll() {
    const mainNav = document.querySelector('.main-nav');
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (mainNav) mainNav.classList.remove('open');
            }
        });
    });
}

function initDownloadModal() {
    const downloadBtns = document.querySelectorAll('.btn-download');
    const modalOverlay = document.getElementById('licenseModal');
    if (!downloadBtns.length || !modalOverlay) return;
    const modalClose = document.getElementById('modalClose');
    const checkbox = document.getElementById('licenseAgree');
    const confirmBtn = document.getElementById('confirmDownload');
    const cancelBtn = document.getElementById('cancelDownload');
    let currentDownloadUrl = '';
    let currentToolName = '';

    downloadBtns.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            currentDownloadUrl = this.getAttribute('data-download') || '';
            currentToolName = this.getAttribute('data-tool') || (window.location.pathname.match(/\/tools\/([^/]+)\//) || [])[1] || '';
            resetModal();
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    function closeModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        resetModal();
    }

    function resetModal() {
        if (checkbox) checkbox.checked = false;
        if (confirmBtn) confirmBtn.classList.add('btn-disabled');
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
    });
    if (checkbox && confirmBtn) {
        checkbox.addEventListener('change', function () {
            if (this.checked) confirmBtn.classList.remove('btn-disabled');
            else confirmBtn.classList.add('btn-disabled');
        });
        confirmBtn.addEventListener('click', function () {
            if (checkbox.checked && currentDownloadUrl) {
                if (window.YQZ_STATS && currentToolName) {
                    try { window.YQZ_STATS.download(currentToolName, currentDownloadUrl); } catch (_) {}
                }
                var link = document.createElement('a');
                link.href = currentDownloadUrl;
                link.download = '';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                closeModal();
            }
        });
    }
}

function highlightActiveNav() {
    const navLinks = document.querySelectorAll('.main-nav a');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(function (link) {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function trackPageView() {}

function validateForm(formId) {
    var form = document.getElementById(formId);
    if (!form) return false;
    var requiredFields = form.querySelectorAll('[required]');
    var isValid = true;
    requiredFields.forEach(function (field) {
        if (!field.value.trim()) { field.style.borderColor = '#ef4444'; isValid = false; }
        else field.style.borderColor = '';
    });
    return isValid;
}

function debounce(func, wait) {
    var timeout;
    return function () {
        var context = this;
        var args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function () { func.apply(context, args); }, wait);
    };
}

if (typeof window !== 'undefined') {
    window.initDownloadModal = initDownloadModal;
    window.highlightActiveNav = highlightActiveNav;
    window.trackPageView = trackPageView;
    window.validateForm = validateForm;
    window.debounce = debounce;
    document.addEventListener('DOMContentLoaded', function () {
        initMobileMenu();
        initSmoothScroll();
        initDownloadModal();
        highlightActiveNav();
    });
}

export { initMobileMenu, initSmoothScroll, initDownloadModal, highlightActiveNav, trackPageView, validateForm, debounce };
