# YuanqiZhiKe Toolkit - AdSense/GDPR 合规修正完整方案

## 📋 问题清单汇总

### 1. 核心阻断问题：License 协议冲突
**文件**：`license.html` + 所有工具页面的 License Modal
- ❌ 第3.3条 "Profit Websites" 明确禁止广告盈利网站使用源码
- ❌ 联系邮箱错误：`license@260330663@qq.com` (双重@)
- ❌ 日期写死：`January 1, 2026`
- ❌ 所有工具详情页的下载弹窗都包含相同禁止条款

### 2. Privacy Policy 缺失 AdSense 强制披露
**文件**：`privacy.html`
- ❌ 第4节 Cookies 声称"不使用广告 Cookie"，但站点实际加载 AdSense
- ❌ 第5节 Third-Party Services 未声明 Google AdSense
- ❌ 日期写死：`January 1, 2026`

### 3. Cookie Notice 自相矛盾
**文件**：`cookie.html`
- ❌ 第2节声称"仅使用必要 Cookie"
- ❌ 第4节明确列出"不使用广告 Cookie"
- ❌ 第3节第三方 Cookie 仅列出 Analytics，未含 AdSense
- ❌ 日期写死：`January 1, 2026`

### 4. 缺失 GDPR Cookie 同意横幅
**全站**：无任何 Cookie 同意机制
- ❌ 访客首次访问无选择权
- ❌ AdSense 个性化广告 Cookie 未经同意即加载
- ❌ 无本地存储记录用户选择（365天）

### 5. 全站硬编码日期问题
**所有 HTML 文件**：
- ❌ 页脚版权年份固定 `2026`
- ❌ 协议页面 `Last Updated: January 1, 2026`
- ❌ License Modal `Effective Date: January 1, 2026`
- ❌ 工具详情页侧边栏 `Last Updated: January 2026`

### 6. 邮箱格式错误
- ❌ `license.html` 第81行：`license@260330663@qq.com`

---

## ✅ 修正方案详细规范

### 方案一：License 协议重写（最高优先级）

#### 1.1 修改 `license.html` 核心条款

**删除原第3.3条**：
```html
<!-- 删除这行 -->
<li><strong>Profit Websites:</strong> Building any website or platform that generates revenue (through ads, subscriptions, or any other means) using the Tools or any modified version thereof.</li>
```

**新增第4节 Commercial & Advertisement Usage**：
```html
<h2>4. Commercial & Advertisement Usage</h2>
<p>You are allowed to deploy these tools on commercial websites or websites with advertisement monetization such as Google AdSense, provided that you retain all original copyright marks, source attribution statements of YuanqiZhiKe Toolkit, and do not resell the source code independently.</p>

<h3>4.1 Personal vs Commercial Use</h3>
<ul>
    <li><strong>Personal / Educational Use:</strong> Free for personal learning, non-commercial projects, and educational purposes. No attribution required but appreciated.</li>
    <li><strong>Commercial / Ad-Supported Websites:</strong> Permitted to use the Tools on websites that display advertisements (including Google AdSense), provided that:
        <ul>
            <li>All original copyright notices and attribution statements are preserved in the source code</li>
            <li>The Tools are not resold, sublicensed, or distributed as standalone products</li>
            <li>No claim of ownership over the original source code is made</li>
        </ul>
    </li>
    <li><strong>Prohibited:</strong> Repackaging the source code as your own product for sale, removing copyright notices, or offering the Tools as a paid service without substantial modification.</li>
</ul>
```

**修正联系邮箱**：
```html
<!-- 第81行 -->
<p><a href="mailto:260330663@qq.com">260330663@qq.com</a></p>
```

**日期动态化**：
```html
<p class="last-updated">Last Updated: <span id="licenseLastUpdated"></span></p>
<script>document.getElementById('licenseLastUpdated').textContent = new Date().toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'});</script>
```

#### 1.2 同步更新所有工具页面的 License Modal

所有 `tools/*/index.html` 和 `tools/*.html` 中的模态框内容需同步修改：
- 删除 "Commercial use is strictly prohibited"
- 删除 "building any profit-generating website"
- 更新 Effective Date 为动态日期
- 保留核心条款：个人学习用途、禁止倒卖源码、保留版权、无担保、知识产权归属

---

### 方案二：Privacy Policy 补充 AdSense 披露（第二优先级）

#### 2.1 修改 `privacy.html` 第4节 Cookies

**原文**：
```html
<h2>4. Cookies</h2>
<p>Our website uses minimal cookies solely for technical purposes (e.g., maintaining session state). We do not use tracking cookies, advertising cookies, or any form of behavioral profiling. For details, please see our <a href="cookie.html">Cookie Notice</a>.</p>
```

**修正为**：
```html
<h2>4. Cookies</h2>
<p>Our website uses cookies for the following purposes:</p>
<ul>
    <li><strong>Essential Cookies:</strong> Required for basic website functionality (session management, preference storage). These do not require consent.</li>
    <li><strong>Analytics Cookies:</strong> Used by Google Analytics 4 / Cloudflare Analytics to collect anonymous usage statistics. IP addresses are anonymized.</li>
    <li><strong>Advertising Cookies:</strong> We display Google AdSense advertisements across our website pages. Google AdSense may deploy advertising cookies to deliver personalized advertisements according to visitor browsing behaviors. Visitors can disable personalized advertising by accessing <a href="https://adssettings.google.com/" target="_blank" rel="noopener">Google official ad privacy settings</a>. All ad-related data collection follows Google privacy rules and global data compliance regulations.</li>
</ul>
<p>For detailed cookie categories and management options, please see our <a href="cookie.html">Cookie Notice</a>.</p>
```

#### 2.2 修改第5节 Third-Party Services

**新增 AdSense 说明**：
```html
<h2>5. Third-Party Services</h2>
<p>Our tools are delivered as downloadable ZIP files containing standalone HTML/CSS/JavaScript. Once downloaded, these tools operate entirely offline. We are not responsible for any third-party services you may choose to integrate into your own use of the source code.</p>

<h3>5.1 Google AdSense</h3>
<p>This website displays advertisements served by Google AdSense. Google may use cookies and similar technologies to serve personalized ads based on your visits to this and other websites. You may opt out of personalized advertising by visiting <a href="https://adssettings.google.com/" target="_blank" rel="noopener">Google Ads Settings</a>. For more information on how Google uses data when you use our partners' sites or apps, see <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">How Google uses data</a>.</p>

<h3>5.2 Analytics Providers</h3>
<p>We may use Google Analytics 4 and/or Cloudflare Web Analytics to understand website usage. These services collect anonymized data only. Refer to their respective privacy policies: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google Privacy Policy</a>, <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener">Cloudflare Privacy Policy</a>.</p>
```

#### 2.3 日期动态化
```html
<p class="last-updated">Last Updated: <span id="privacyLastUpdated"></span></p>
<script>document.getElementById('privacyLastUpdated').textContent = new Date().toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'});</script>
```

---

### 方案三：Cookie Notice 修正与同步（第三优先级）

#### 3.1 修改 `cookie.html` 使其与实际情况一致

**第2节 Cookies We Use - 重写**：
```html
<h2>2. Cookies We Use</h2>
<p>YuanqiZhiKe Toolkit uses the following categories of cookies:</p>

<h3>2.1 Essential Cookies (Strictly Necessary)</h3>
<ul>
    <li><strong>Purpose:</strong> Maintain basic website functionality during your visit (session state, language preference, cookie consent choice).</li>
    <li><strong>Duration:</strong> Session or up to 365 days for consent preference.</li>
    <li><strong>Legal Basis:</strong> Legitimate interest / strict necessity.</li>
    <li><strong>Data collected:</strong> None (truly anonymous).</li>
</ul>

<h3>2.2 Analytics Cookies (Optional)</h3>
<ul>
    <li><strong>Purpose:</strong> Collect anonymous, aggregated website usage statistics via Google Analytics 4 or Cloudflare Analytics.</li>
    <li><strong>Duration:</strong> Up to 2 years (_ga) / 24 hours (_gid).</li>
    <li><strong>Legal Basis:</strong> Consent (GDPR Art. 6(1)(a)).</li>
    <li><strong>Data collected:</strong> Pages visited, time on page, referrer, country-level geography, browser/OS (non-specific). IP anonymized.</li>
</ul>

<h3>2.3 Advertising Cookies (Optional - Google AdSense)</h3>
<ul>
    <li><strong>Purpose:</strong> Deliver personalized advertisements via Google AdSense based on browsing behavior.</li>
    <li><strong>Duration:</strong> Varies by Google (typically 13 months for IDE, 2 years for ANID).</li>
    <li><strong>Legal Basis:</strong> Consent (GDPR Art. 6(1)(a)) / Legitimate interest for non-personalized ads.</li>
    <li><strong>Data collected:</strong> Pseudonymous identifiers, browsing history across sites, ad interaction data.</li>
    <li><strong>Opt-out:</strong> Visit <a href="https://adssettings.google.com/" target="_blank" rel="noopener">Google Ads Settings</a> to disable personalized ads.</li>
</ul>
```

**第3节 Third-Party Cookies - 更新**：
```html
<h2>3. Third-Party Cookies</h2>
<p>The following third parties may set cookies when you visit our website:</p>
<ul>
    <li><strong>Google AdSense:</strong> Serves personalized/non-personalized ads. <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener">Google Advertising Cookie Policy</a></li>
    <li><strong>Google Analytics 4:</strong> Anonymous usage analytics. <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener">Google Cookie Policy</a></li>
    <li><strong>Cloudflare Analytics:</strong> Privacy-first analytics. <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener">Cloudflare Privacy Policy</a></li>
</ul>
```

**第4节 Cookies We Do NOT Use - 修正**：
```html
<h2>4. Cookies We Do NOT Use</h2>
<p>We explicitly do <strong>not</strong> use the following types of cookies directly:</p>
<ul>
    <li>Social media embedding cookies</li>
    <li>Any cookies that collect personal data for our own marketing purposes</li>
    <li>First-party tracking cookies beyond analytics/advertising disclosed above</li>
</ul>
<p><em>Note: Third-party advertising cookies (Google AdSense) are used as disclosed in Section 2.3. These are governed by Google's policies.</em></p>
```

**第6节 Consent - 更新为明确同意机制**：
```html
<h2>6. Consent Management</h2>
<p>On your first visit, a cookie consent banner will appear allowing you to choose:</p>
<ul>
    <li><strong>Accept All Cookies:</strong> Allows essential, analytics, and advertising cookies.</li>
    <li><strong>Only Essential Cookies:</strong> Allows only strictly necessary cookies; blocks analytics and advertising cookies.</li>
</ul>
<p>Your choice is stored locally in your browser for 365 days. You can change your preference at any time by clearing site data or using the "Cookie Settings" link in the footer (to be implemented).</p>
<p>By continuing to use our website after making your choice, you consent to the cookie categories you have selected.</p>
```

**日期动态化**：同方案二。

---

### 方案四：全站 GDPR Cookie 同意横幅（核心功能新增）

#### 4.1 创建 `assets/js/cookie-consent.js`

```javascript
// ===================================
// YuanqiZhiKe Toolkit - GDPR Cookie Consent Banner
// ===================================

(function() {
    'use strict';

    const CONSENT_KEY = 'yuanqi_cookie_consent';
    const CONSENT_EXPIRY_DAYS = 365;

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

    // Load Google AdSense (only if consent = 'all')
    function loadAdSense() {
        if (window.adsbygoogleLoaded) return;
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6181560564978988';
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
        window.adsbygoogleLoaded = true;
        // Initialize ads
        if (typeof window.adsbygoogle !== 'undefined') {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
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
            // Enable existing AdSense slots
            document.querySelectorAll('ins.adsbygoogle').forEach(function(ad) {
                if (typeof window.adsbygoogle !== 'undefined') {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                }
            });
        } else {
            // Block AdSense: remove adsbygoogle script if already loaded (best effort)
            // Note: Once loaded, cannot fully unload. But we can prevent ad rendering.
            document.querySelectorAll('ins.adsbygoogle').forEach(function(ad) {
                ad.style.display = 'none';
                ad.innerHTML = '';
            });
        }
    }

    // Create and show banner
    function showBanner() {
        if (getConsent() !== null) {
            // Already has consent, apply it
            applyConsent(getConsent());
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
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showBanner);
    } else {
        showBanner();
    }

    // Expose for manual testing
    window.YuanqiCookieConsent = {
        getConsent: getConsent,
        saveConsent: saveConsent,
        applyConsent: applyConsent,
        reset: function() { localStorage.removeItem(CONSENT_KEY); location.reload(); }
    };
})();
```

#### 4.2 在所有 HTML 页面引入

**在 `</head>` 前添加**（AdSense 脚本之前，确保优先加载）：
```html
<!-- GDPR Cookie Consent - Must load before AdSense -->
<script src="assets/js/cookie-consent.js"></script>
```

**注意**：现有页面已有 AdSense 脚本在 `<head>` 中，需将 cookie-consent.js 放在 AdSense 脚本**之前**，或改为在 `<head>` 最早位置加载。

---

### 方案五：全站日期动态化与邮箱修正（细节修正）

#### 5.1 创建通用日期工具 `assets/js/date-utils.js`

```javascript
// ===================================
// YuanqiZhiKe Toolkit - Date Utilities
// ===================================

(function() {
    'use strict';

    function formatDate(date) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
                el.textContent = today.getFullYear();
            } else if (format === 'month-year') {
                el.textContent = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            }
        });
    }

    // Expose
    window.YuanqiDateUtils = { formatDate, updateElement, autoUpdateDates };

    // Auto-run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoUpdateDates);
    } else {
        autoUpdateDates();
    }
})();
```

#### 5.2 替换所有硬编码日期

**页脚版权年份**：
```html
<!-- 所有页面 footer -->
<p class="copyright">&copy; <span data-auto-date="year"></span> YuanqiZhiKe. All rights reserved.</p>
```

**协议页面 Last Updated**：
```html
<!-- license.html, privacy.html, cookie.html -->
<p class="last-updated">Last Updated: <span data-auto-date="full"></span></p>
```

**License Modal Effective Date**：
```html
<!-- 所有页面的 modal-body terms-box -->
<p><strong>Effective Date:</strong> <span data-auto-date="full"></span></p>
```

**工具详情页侧边栏 Last Updated**：
```html
<!-- tools/*/index.html -->
<p><strong>Last Updated:</strong> <span data-auto-date="month-year"></span></p>
```

#### 5.3 修正邮箱地址

**license.html 第81行**：
```html
<!-- 修正前 -->
<p><a href="mailto:license@260330663@qq.com">license@260330663@qq.com</a></p>
<!-- 修正后 -->
<p><a href="mailto:260330663@qq.com">260330663@qq.com</a></p>
```

---

### 方案六：工具教程内容差异化（内容侧优化）

#### 6.1 问题分析
当前多个工具详情页的 "About This Tool"、"Core Features"、"How to Use" 结构高度相似，存在 Thin Content 风险。

#### 6.2 优化策略
为每个工具编写**独特的开场段落**、**差异化的功能描述**、**特定场景的使用示例**。

**示例 - Article Rewriter 优化前后对比**：

| 维度 | 当前（模板化） | 优化后（差异化） |
|------|----------------|------------------|
| 开场 | "The Offline Article Rewriter is a completely self-contained frontend tool..." | "Whether you're a blogger refreshing old posts, a student paraphrasing research, or an SEO specialist creating content variations — the Offline Article Rewriter gives you full control without ever sending text to a server." |
| 核心功能 | 通用列表 | 结合具体场景："Conservative mode preserves technical terms for documentation; Aggressive mode maximizes uniqueness for SEO content." |
| 适用人群 | 通用列表 | 增加具体痛点："Ideal for non-native English writers who want natural-sounding variations." |

**实施建议**：
- 优先优化有 `detailUrl` 的 10+ 核心工具（Article Rewriter, Word Counter, Color Converter, JSON Formatter, Password Generator, QR Code Generator, Unix Timestamp Converter, URL Slug Generator, UUID Generator, Base64/URL Tool, Hash Generator, Image Converter）
- 其余工具保持现状，后续迭代优化

---

## 📦 实施文件清单

### 需创建的新文件
| 文件路径 | 说明 |
|----------|------|
| `assets/js/cookie-cons