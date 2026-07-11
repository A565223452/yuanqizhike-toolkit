// ===================================
// YuanqiZhiKe Toolkit - GDPR Cookie Consent Banner
// ===================================

(function() {
    'use strict';

    const CONSENT_KEY = 'yuanqi_cookie_consent';
    const CONSENT_EXPIRY_DAYS = 365;

    // Detect Google crawlers (AdsBot-Google, Googlebot) for AdSense compliance
    function isGoogleCrawler() {
        const ua = navigator.userAgent || '';
        return /AdsBot-Google|Googlebot/i.test(ua);
    }

    // Check if consent already given
    function getConsent() {
        try {
            const stored = localStorage.getItem(CONSENT_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Check expiry
                if (parsed.timestamp && (Date.now() - parsed.timestamp) < CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
                    return parsed.choice; // 'all' | 'essential'
                }
            }
        } catch (e) {
            console.warn('[CookieConsent] Failed to parse consent:', e);
        }
        return null;
    }

    // Save consent choice
    function saveConsent(choice) {
        try {
            localStorage.setItem(CONSENT_KEY, JSON.stringify({
                choice: choice,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('[CookieConsent] Failed to save consent:', e);
        }
    }

    // Load Google AdSense Auto Ads (only if consent = 'all')
    // 使用自动广告代码：无需手动创建广告单元 slot，谷歌自动在页面合适位置插入广告
    function loadAdSense() {
        if (window.adsbygoogleLoaded) return;
        window.adsbygoogleLoaded = true;
        const script = document.createElement('script');
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6181560564978988';
        script.onload = function() {
            // Auto Ads 自动在页面插入广告，静默处理 push 错误
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.log('[AdSense] Auto ads already initialized or error suppressed');
            }
            console.log('[AdSense] Auto ads script loaded (consent granted)');
        };
        script.onerror = function() {
            console.warn('[AdSense] Failed to load AdSense script');
        };
        document.head.appendChild(script);
    }

    // Load Analytics (only if consent = 'all')
    function loadAnalytics() {
        // GA4 placeholder - replace G-XXXXXXXXXX with actual ID
        // const script = document.createElement('script');
        // script.async = true;
        // script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
        // document.head.appendChild(script);
        // window.dataLayer = window.dataLayer || [];
        // function gtag(){dataLayer.push(arguments);}
        // gtag('js', new Date());
        // gtag('config', 'G-XXXXXXXXXX', { 'anonymize_ip': true });
    }

    // Apply consent: load/block third-party scripts
    function applyConsent(choice) {
        if (choice === 'all') {
            loadAdSense();
            loadAnalytics();
        }
        // Note: AdSense slots are handled automatically by the auto ads script
    }

    // Create and show banner
    function showBanner() {
        const existingConsent = getConsent();
        if (existingConsent !== null) {
            applyConsent(existingConsent);
            return;
        }

        const banner = document.createElement('div');
        banner.id = 'cookieConsentBanner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Cookie consent');
        banner.innerHTML = `
            <div class="cookie-banner-content">
                <div class="cookie-banner-text">
                    <h3>We Value Your Privacy</h3>
                    <p>We use cookies to enhance your experience, analyze traffic, and serve personalized advertisements via Google AdSense. By clicking "Accept All", you consent to all cookies. You can choose "Only Essential" to disable analytics and advertising cookies.</p>
                </div>
                <div class="cookie-banner-actions">
                    <button type="button" class="btn btn-primary" id="cookieAcceptAll">Accept All Cookies</button>
                    <button type="button" class="btn btn-secondary" id="cookieEssentialOnly">Only Essential Cookies</button>
                </div>
                <p class="cookie-banner-link"><a href="cookie.html" target="_blank">Cookie Notice</a> | <a href="privacy.html" target="_blank">Privacy Policy</a></p>
            </div>
        `;

        // Styles injected via JS to avoid CSS dependency
        const style = document.createElement('style');
        style.textContent = `
            #cookieConsentBanner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #fff;
                border-top: 1px solid #e2e8f0;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
                z-index: 10000;
                padding: 20px;
                animation: slideUp 0.3s ease;
            }
            @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .cookie-banner-content { max-width: 1200px; margin: 0 auto; }
            .cookie-banner-text h3 { margin: 0 0 8px; font-size: 1.1rem; color: #1e293b; }
            .cookie-banner-text p { margin: 0 0 16px; font-size: 0.9rem; color: #64748b; line-height: 1.5; }
            .cookie-banner-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
            .cookie-banner-actions .btn { padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; border: none; transition: all 0.2s; }
            .cookie-banner-actions .btn-primary { background: #2563eb; color: #fff; }
            .cookie-banner-actions .btn-primary:hover { background: #1d4ed8; }
            .cookie-banner-actions .btn-secondary { background: transparent; color: #2563eb; border: 2px solid #2563eb; }
            .cookie-banner-actions .btn-secondary:hover { background: #2563eb; color: #fff; }
            .cookie-banner-link { margin: 0; font-size: 0.8rem; color: #94a3b8; text-align: center; }
            .cookie-banner-link a { color: #2563eb; text-decoration: underline; }
            @media (max-width: 600px) {
                .cookie-banner-actions { flex-direction: column; }
                .cookie-banner-actions .btn { width: 100%; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(banner);

        // Event listeners
        document.getElementById('cookieAcceptAll').addEventListener('click', function() {
            saveConsent('all');
            applyConsent('all');
            hideBanner();
        });
        document.getElementById('cookieEssentialOnly').addEventListener('click', function() {
            saveConsent('essential');
            applyConsent('essential');
            hideBanner();
        });
    }

    function hideBanner() {
        const banner = document.getElementById('cookieConsentBanner');
        if (banner) {
            banner.style.animation = 'slideUp 0.3s ease reverse';
            setTimeout(() => banner.remove(), 300);
        }
    }

    // Initialize on DOM ready
    function init() {
        if (isGoogleCrawler()) {
            console.log('[CookieConsent] Auto-granted consent for Google crawler');
            applyConsent('all');
        } else {
            const consent = getConsent();
            if (consent === 'all') {
                applyConsent('all');
            } else if (consent === null) {
                showBanner();
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for manual testing
    window.YuanqiCookieConsent = {
        getConsent: getConsent,
        saveConsent: saveConsent,
        applyConsent: applyConsent,
        reset: function() { localStorage.removeItem(CONSENT_KEY); location.reload(); }
    };
})();