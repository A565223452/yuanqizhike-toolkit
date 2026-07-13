// ===================================
// YuanqiZhiKe Toolkit - Internationalization (i18n)
// ===================================

const I18N = {
  currentLang: 'en',
  translations: {},
  supportedLangs: [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' }
  ],

  // Initialize i18n system
  async init() {
    // Get language ONLY from URL parameter - default to English
    // Do NOT auto-detect or use stored preferences for international sites
    const urlParams = new URLSearchParams(window.location.search);
    const langFromUrl = urlParams.get('lang');

    // Hardcode English as default for international audience
    // Only override if explicit ?lang=XX parameter is present
    this.currentLang = (langFromUrl && this.supportedLangs.find(l => l.code === langFromUrl)) ? langFromUrl : 'en';

    // 同步写入语言 Cookie（供后端 worker 与统计脚本读取，名称统一为 yqz_lang）
    this.setLangCookie(this.currentLang);

    // Load translations
    console.log('[I18N] Loading translations for:', this.currentLang);
    await this.loadTranslations(this.currentLang);
    console.log('[I18N] Translations loaded, keys:', Object.keys(this.translations[this.currentLang] || {}).length);
    
    // Apply translations to page
    this.applyTranslations();
    
    // Update HTML lang attribute
    document.documentElement.lang = this.currentLang;
    
    // Update SEO meta tags
    this.updateMetaTags();
    
    // Update Giscus language
    this.updateGiscusLang();
    
    // Listen for language changes
    this.setupLangChangeHandler();
    
    // Inject global earth icon with language selector
    this.injectEarthIcon();
  },

  // 写入语言 Cookie（统一名称 yqz_lang，供后端 worker 与 statistics.js 读取）
  setLangCookie(lang) {
    try {
      document.cookie = 'yqz_lang=' + lang + ';path=/;max-age=31536000;SameSite=Lax';
    } catch (e) {
      // 非 HTTPS 等场景忽略写入失败
    }
  },

  // Detect browser language
  detectBrowserLanguage() {
    const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (browserLang.startsWith('zh')) return 'zh';
    if (browserLang.startsWith('ko')) return 'ko';
    if (browserLang.startsWith('ja')) return 'ja';
    if (browserLang.startsWith('nl')) return 'nl';
    if (browserLang.startsWith('es')) return 'es';
    return 'en';
  },

  // Load translations for a language
  async loadTranslations(lang) {
    try {
      let data;
      
      // Use absolute path to prevent issues with subdirectory pages
      const localePath = `/locales/${lang}.json`;
      
      // Use XMLHttpRequest for local file:// protocol support
      const isLocal = window.location.protocol === 'file:';
      
      if (isLocal) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', localePath, false);
        xhr.send();
        if (xhr.status === 0 || xhr.status === 200) {
          data = JSON.parse(xhr.responseText);
        }
      } else {
        const response = await fetch(localePath);
        if (response.ok) {
          data = await response.json();
        }
      }
      
      this.translations[lang] = data || {};
    } catch (error) {
      console.warn('Error loading translations, using English fallback:', error);
      if (this.currentLang !== 'en') {
        this.currentLang = 'en';
        await this.loadTranslations('en');
      }
    }
  },

  // Get translated string
  t(key, fallback) {
    const keys = key.split('.');
    let value = this.translations[this.currentLang];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Key not found in current language — fallback to English
        return this._fallbackToEnglish(key, fallback);
      }
    }
    
    // Found but it's an object not a string — fallback to English
    if (typeof value !== 'string') {
      return this._fallbackToEnglish(key, fallback);
    }
    return value;
  },

  // Fallback to English translation when key is missing
  _fallbackToEnglish(key, fallback) {
    if (this.currentLang === 'en') {
      return fallback || key;
    }
    const keys = key.split('.');
    let value = this.translations['en'];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }
    return typeof value === 'string' ? value : fallback || key;
  },

  // Apply translations to all elements with data-i18n attribute
  applyTranslations() {
    // Translate elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (el.tagName === 'TITLE') {
        document.title = text;
      } else if (el.tagName === 'META') {
        // Handle meta tags
        const attr = el.getAttribute('data-i18n-attr');
        if (attr) el.setAttribute(attr, text);
        else el.textContent = text;
      } else {
        // Use innerHTML if translation contains HTML tags (e.g. mailto links), otherwise textContent for safety
        if (text.includes('<')) {
          el.innerHTML = text;
        } else {
          el.textContent = text;
        }
      }
    });

    // Translate elements with data-i18n-html attribute (innerHTML rendering for HTML-containing translations)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      el.innerHTML = this.t(key);
    });

    // Translate elements with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    // Translate elements with data-i18n-title (tooltip)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });

    // Translate h1-h6 with data-i18n-keys (comma-separated)
    document.querySelectorAll('[data-i18n-keys]').forEach(el => {
      const keys = el.getAttribute('data-i18n-keys').split(',');
      const texts = keys.map(k => this.t(k.trim()));
      if (texts.length === 1) {
        el.textContent = texts[0];
      } else {
        // For multi-part headings, keep as is but update text
        el.innerHTML = texts.join('');
      }
    });

    // Translate description paragraphs
    document.querySelectorAll('[data-i18n-desc]').forEach(el => {
      const key = el.getAttribute('data-i18n-desc');
      el.textContent = this.t(key);
    });
  },

  // Update language switcher dropdown (used by earth icon menu)
  updateLanguageSwitcher() {
    const menu = document.getElementById('earthLangMenu');
    if (!menu) return;

    const currentLang = this.supportedLangs.find(l => l.code === this.currentLang);

    // Build dropdown menu
    menu.innerHTML = this.supportedLangs.map(lang => `
      <button class="earth-lang-option ${lang.code === this.currentLang ? 'selected' : ''}" data-lang="${lang.code}">
        <span class="lang-flag">${lang.flag}</span>
        <span class="lang-name">${lang.nativeName}</span>
        <span class="check-icon">${lang.code === this.currentLang ? '✓' : ''}</span>
      </button>
    `).join('');

    // Bind click events
    menu.querySelectorAll('.earth-lang-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const lang = btn.getAttribute('data-lang');
        this.switchTo(lang);
        menu.classList.remove('open');
      });
    });
  },

  // Switch to a different language
  async switchTo(lang) {
    if (!this.supportedLangs.find(l => l.code === lang)) return;
    
    this.currentLang = lang;

    // 同步写入语言 Cookie（供后端 worker 与统计脚本读取）
    this.setLangCookie(lang);

    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.set('lang', lang);
    window.history.pushState({}, '', url);
    
    // Load and apply translations
    await this.loadTranslations(lang);
    this.applyTranslations();
    this.updateLanguageSwitcher();
    document.documentElement.lang = lang;
    this.updateMetaTags();
    this.updateGiscusLang();
    
    // Close dropdown
    const dropdown = document.getElementById('languageDropdown');
    if (dropdown) dropdown.classList.remove('open');
  },

  // Setup language change URL handler
  setupLangChangeHandler() {
    // Handle back/forward navigation
    window.addEventListener('popstate', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const lang = urlParams.get('lang') || this.currentLang;
      this.switchTo(lang);
    });
  },

  // Update meta tags for SEO
  updateMetaTags() {
    const t = this.t.bind(this);
    
    // Update title
    const titleKey = 'hero.title';
    document.title = `${t(titleKey)} - YuanqiZhiKe Toolkit`;

    // Update description
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) {
      descEl.content = t('hero.description');
    }

    // Update OG tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = document.title;
    
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = t('hero.description');

    // Update hreflang links
    this.updateHreflangs();
  },

  // Update hreflang tags for multi-language SEO
  updateHreflangs() {
    // Remove existing hreflang links
    document.querySelectorAll('link[hreflang]').forEach(el => el.remove());

    // Add new hreflang links
    const baseUrl = window.location.origin + window.location.pathname;
    this.supportedLangs.forEach(lang => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = lang.code;
      link.href = `${baseUrl}?lang=${lang.code}`;
      document.head.appendChild(link);
    });

    // Add x-default
    const defaultLink = document.createElement('link');
    defaultLink.rel = 'alternate';
    defaultLink.hreflang = 'x-default';
    defaultLink.href = baseUrl;
    document.head.appendChild(defaultLink);
  },

// Inject global earth icon with language selector popup
  injectEarthIcon() {
    console.log('[I18N] injectEarthIcon called, currentLang:', this.currentLang);
    
    // Get existing icon or create new one
    let earthIcon = document.getElementById('globalEarthIcon');
    console.log('[I18N] earthIcon found:', !!earthIcon);
    
    const needsCreate = !earthIcon;
    
    if (needsCreate) {
      earthIcon = document.createElement('div');
      earthIcon.id = 'globalEarthIcon';
      earthIcon.className = 'global-earth-icon';
      earthIcon.textContent = '🌐';
      earthIcon.title = 'Switch Language';
      document.body.appendChild(earthIcon);
    }
    
    // Create language selection popup (or get existing)
    let langMenu = document.getElementById('earthLangMenu');
    if (!langMenu) {
      langMenu = document.createElement('div');
      langMenu.id = 'earthLangMenu';
      langMenu.className = 'earth-lang-menu';
      document.body.appendChild(langMenu);
    }
    
    // Populate menu items
    this.updateLanguageSwitcher();
    
    // Toggle menu on earth icon click
    earthIcon.addEventListener('click', (e) => {
      console.log('[I18N] Earth icon clicked');
      e.stopPropagation();
      langMenu.classList.toggle('open');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!earthIcon.contains(e.target) && !langMenu.contains(e.target)) {
        langMenu.classList.remove('open');
      }
    });
  },

  // Update Giscus comment section language
  updateGiscusLang() {
    const giscusFrame = document.querySelector('giscus-widget');
    if (giscusFrame) {
      // Map our langs to Giscus supported langs
      const langMap = {
        'en': 'en',
        'zh': 'zh-CN',
        'ko': 'ko',
        'ja': 'ja'
      };
      
      const giscusLang = langMap[this.currentLang] || 'en';
      
      // Send message to update Giscus language
      if (giscusFrame.shadowRoot) {
        const iframe = giscusFrame.shadowRoot.querySelector('iframe');
        if (iframe) {
          iframe.contentWindow.postMessage({ 
            giscus: { setConfig: { lang: giscusLang } } 
          }, 'https://giscus.app');
        }
      }
    }
  }
};

// Make I18N globally accessible
window.I18N = I18N;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  I18N.init().catch(function(err) {
    console.error('[I18N] Init failed:', err);
  });
});