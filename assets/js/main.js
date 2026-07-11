// ===================================
// Yuanqi Tech Toolkit - Main JavaScript
// ===================================

document.addEventListener('DOMContentLoaded', function () {

    // --- Mobile Menu Toggle ---
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.querySelector('.main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', function () {
            mainNav.classList.toggle('open');
        });

        // Close menu when clicking outside
        document.addEventListener('click', function (e) {
            if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
                mainNav.classList.remove('open');
            }
        });
    }

    // --- Smooth Scroll for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Close mobile menu if open
                if (mainNav) mainNav.classList.remove('open');
            }
        });
    });

    // --- Download Modal Logic ---
    initDownloadModal();

    // --- Active Nav Highlighting ---
    highlightActiveNav();
});

// ===================================
// Download Modal Functionality
// ===================================
function initDownloadModal() {
    const downloadBtns = document.querySelectorAll('.btn-download');
    const modalOverlay = document.getElementById('licenseModal');
    const modalClose = document.getElementById('modalClose');
    const checkbox = document.getElementById('licenseAgree');
    const confirmBtn = document.getElementById('confirmDownload');
    const cancelBtn = document.getElementById('cancelDownload');

    if (!downloadBtns.length || !modalOverlay) return;

    let currentDownloadUrl = '';

    downloadBtns.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            currentDownloadUrl = this.getAttribute('data-download') || '';
            resetModal();
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    // Close modal functions
    function closeModal() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        resetModal();
    }

    function resetModal() {
        if (checkbox) checkbox.checked = false;
        if (confirmBtn) {
            confirmBtn.classList.add('btn-disabled');
        }
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Close on overlay click
    modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });

    // Checkbox toggle for confirm button
    if (checkbox && confirmBtn) {
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                confirmBtn.classList.remove('btn-disabled');
            } else {
                confirmBtn.classList.add('btn-disabled');
            }
        });

        // Confirm download
        confirmBtn.addEventListener('click', function () {
            if (checkbox.checked && currentDownloadUrl) {
                // Trigger download
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

// ===================================
// Active Navigation Highlighting
// ===================================
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

// ===================================
// Simple Anonymous Visit Counter
// Uses localStorage for basic tracking
// Replace with GA4/Cloudflare Analytics in production
// ===================================
function trackPageView(toolName) {
    try {
        var visits = localStorage.getItem('yuanqi_visits') || '0';
        visits = parseInt(visits) + 1;
        localStorage.setItem('yuanqi_visits', visits.toString());

        // Log to console for debugging
        console.log('[Analytics] Page view tracked:', toolName || 'home', '| Total visits:', visits);

        // TODO: Replace with actual GA4 or Cloudflare Analytics event
        // gtag('event', 'page_view', { tool: toolName });
    } catch (e) {
        // Silently fail if localStorage is disabled
        console.warn('[Analytics] LocalStorage unavailable:', e);
    }
}

// Track page views on load
if (typeof window !== 'undefined') {
    var _originalTrack = trackPageView;
    var pagePath = window.location.pathname;
    var toolName = pagePath.includes('tools/') ? pagePath.split('/')[2] : 'homepage';
    trackPageView(toolName);
}

// ===================================
// Form Validation Helper
// ===================================
function validateForm(formId) {
    var form = document.getElementById(formId);
    if (!form) return false;

    var requiredFields = form.querySelectorAll('[required]');
    var isValid = true;

    requiredFields.forEach(function (field) {
        if (!field.value.trim()) {
            field.style.borderColor = '#ef4444';
            isValid = false;
        } else {
            field.style.borderColor = '';
        }
    });

    return isValid;
}

// ===================================
// Utility: Debounce Function
// ===================================
function debounce(func, wait) {
    var timeout;
    return function () {
        var context = this;
        var args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            func.apply(context, args);
        }, wait);
    };
}