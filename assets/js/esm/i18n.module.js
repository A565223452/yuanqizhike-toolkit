// ===================================
// YuanqiZhiKe Toolkit - ESM: Internationalization (i18n)
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

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const langFromUrl = urlParams.get('lang');
    this.currentLang = (langFromUrl && this.supportedLangs.find(l => l.code === langFromUrl)) ? langFromUrl : 'en';
    this.setLangCookie(this.currentLang);
    await this.loadTranslations(this.currentLang);
    this.applyTranslations();
    document.documentElement.lang = this.currentLang;
    this.updateMetaTags();
    this.updateGiscusLang();
    this.setupLangChangeHandler();
    this.injectEarthIcon();
  },

  setLangCookie(lang) {
    try {
      document.cookie = 'yqz_lang=' + lang + ';path=/;max-age=31536000;SameSite=Lax';
    } catch (e) {}
  },

  detectBrowserLanguage() {
    const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (browserLang.startsWith('zh')) return 'zh';
    if (browserLang.startsWith('ko')) return 'ko';
    if (browserLang.startsWith('ja')) return 'ja';
    if (browserLang.startsWith('nl')) return 'nl';
    if (browserLang.startsWith('es')) return 'es';
    return 'en';
  },

  async loadTranslations(lang) {
    try {
      let data;
      const localePath = `/locales/${lang}.json`;
      const isLocal = window.location.protocol === 'file:';
      if (isLocal) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', localePath, false);
        xhr.send();
        if (xhr.status === 0 || xhr.status === 200) data = JSON.parse(xhr.responseText);
      } else {
        const response = await fetch(localePath);
        if (response.ok) data = await response.json();
      }
      this.translations[lang] = data || {};
    } catch (error) {
      if (this.currentLang !== 'en') {
        this.currentLang = 'en';
        await this.loadTranslations('en');
      }
    }
  },

  t(key, fallback) {
    const keys = key.split('.');
    let value = this.translations[this.currentLang];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) value = value[k];
      else return this._fallbackToEnglish(key, fallback);
    }
    if (typeof value !== 'string') return this._fallbackToEnglish(key, fallback);
    return value;
  },

  _fallbackToEnglish(key, fallback) {
    if (this.currentLang === 'en') return fallback || key;
    const keys = key.split('.');
    let value = this.translations['en'];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) value = value[k];
      else return fallback || key;
    }
    return typeof value === 'string' ? value : fallback || key;
  },

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (el.tagName === 'TITLE') {
        document.title = text;
      } else if (el.tagName === 'META') {
        const attr = el.getAttribute('data-i18n-attr');
        if (attr) el.setAttribute(attr, text); else el.textContent = text;
      } else {
        if (text.includes('<')) el.innerHTML = text; else el.textContent = text;
      }
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = this.t(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = this.t(el.getAttribute('data-i18n-title'));
    });
    document.querySelectorAll('[data-i18n-keys]').forEach(el => {
      const keys = el.getAttribute('data-i18n-keys').split(',');
      const texts = keys.map(k => this.t(k.trim()));
      if (texts.length === 1) el.textContent = texts[0]; else el.innerHTML = texts.join('');
    });
    document.querySelectorAll('[data-i18n-desc]').forEach(el => {
      el.textContent = this.t(el.getAttribute('data-i18n-desc'));
    });
  },

  updateLanguageSwitcher() {
    const menu = document.getElementById('earthLangMenu');
    if (!menu) return;
    menu.innerHTML = this.supportedLangs.map(lang => `
      <button class="earth-lang-option ${lang.code === this.currentLang ? 'selected' : ''}" data-lang="${lang.code}">
        <span class="lang-flag">${lang.flag}</span>
        <span class="lang-name">${lang.nativeName}</span>
        <span class="check-icon">${lang.code === this.currentLang ? '✓' : ''}</span>
      </button>
    `).join('');
    menu.querySelectorAll('.earth-lang-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchTo(btn.getAttribute('data-lang'));
        menu.classList.remove('open');
      });
    });
  },

  async switchTo(lang) {
    if (!this.supportedLangs.find(l => l.code === lang)) return;
    this.currentLang = lang;
    this.setLangCookie(lang);
    const url = new URL(window.location);
    url.searchParams.set('lang', lang);
    window.history.pushState({}, '', url);
    await this.loadTranslations(lang);
    this.applyTranslations();
    this.updateLanguageSwitcher();
    document.documentElement.lang = lang;
    this.updateMetaTags();
    this.updateGiscusLang();
    const dropdown = document.getElementById('languageDropdown');
    if (dropdown) dropdown.classList.remove('open');
  },

  setupLangChangeHandler() {
    window.addEventListener('popstate', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const lang = urlParams.get('lang') || this.currentLang;
      this.switchTo(lang);
    });
  },

  _shouldOverrideSeoMeta() {
    const path = window.location.pathname;
    const tail = path.split('/').pop();
    const isHome = path === '/' || /^index(\.html?)?$/i.test(tail) || tail === '';
    const titleAsksI18n = !!(document.querySelector('title[data-i18n]'));
    return isHome || titleAsksI18n;
  },

  updateMetaTags() {
    const t = this.t.bind(this);
    const overrideSeo = this._shouldOverrideSeoMeta();
    if (overrideSeo) {
      document.title = `${t('hero.title')} - YuanqiZhiKe Toolkit`;
      const descEl = document.querySelector('meta[name="description"]');
      if (descEl) descEl.content = t('hero.description');
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.content = document.title;
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.content = t('hero.description');
    }
    this.updateHreflangs();
  },

  updateHreflangs() {
    document.querySelectorAll('link[hreflang]').forEach(el => el.remove());
    const baseUrl = window.location.origin + window.location.pathname;
    this.supportedLangs.forEach(lang => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = lang.code;
      link.href = `${baseUrl}?lang=${lang.code}`;
      document.head.appendChild(link);
    });
    const defaultLink = document.createElement('link');
    defaultLink.rel = 'alternate';
    defaultLink.hreflang = 'x-default';
    defaultLink.href = baseUrl;
    document.head.appendChild(defaultLink);
  },

  injectEarthIcon() {
    let earthIcon = document.getElementById('globalEarthIcon');
    const needsCreate = !earthIcon;
    if (needsCreate) {
      earthIcon = document.createElement('div');
      earthIcon.id = 'globalEarthIcon';
      earthIcon.className = 'global-earth-icon';
      earthIcon.textContent = '🌐';
      earthIcon.title = 'Switch Language';
      document.body.appendChild(earthIcon);
    }
    let langMenu = document.getElementById('earthLangMenu');
    if (!langMenu) {
      langMenu = document.createElement('div');
      langMenu.id = 'earthLangMenu';
      langMenu.className = 'earth-lang-menu';
      document.body.appendChild(langMenu);
    }
    this.updateLanguageSwitcher();
    earthIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!earthIcon.contains(e.target) && !langMenu.contains(e.target)) {
        langMenu.classList.remove('open');
      }
    });
  },

  updateGiscusLang() {
    const giscusFrame = document.querySelector('giscus-widget');
    if (!giscusFrame) return;
    const langMap = { 'en': 'en', 'zh': 'zh-CN', 'ko': 'ko', 'ja': 'ja' };
    const giscusLang = langMap[this.currentLang] || 'en';
    if (giscusFrame.shadowRoot) {
      const iframe = giscusFrame.shadowRoot.querySelector('iframe');
      if (iframe) {
        iframe.contentWindow.postMessage({ giscus: { setConfig: { lang: giscusLang } } }, 'https://giscus.app');
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.I18N = I18N;
  document.addEventListener('DOMContentLoaded', function() {
    I18N.init().catch(() => {});
  });
}

export { I18N };
export default I18N;
