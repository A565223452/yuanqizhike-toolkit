// ===================================
// YuanqiZhiKe Toolkit - ESM: Statistics SDK
// ===================================

import { I18N } from './i18n.module.js';

const YQZ_STATS = {
  apiBase: '/api/stat',

  getCurrentLang() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name === 'yqz_lang') return valueParts.join('=') || 'en';
    }
    try { return localStorage.getItem('yqz_lang') || 'en'; } catch (_) { return 'en'; }
  },

  _track(endpoint, data) {
    const payload = { ...data, timestamp: Date.now() };
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(this.apiBase + endpoint, blob);
      } catch (e) {}
    } else {
      fetch(this.apiBase + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    }
  },

  download(toolName, toolZipUrl) {
    this._track('/download', {
      toolName: toolName,
      toolZipUrl: toolZipUrl || window.location.href
    });
  },

  languageSwitch(fromLang, toLang) {
    if (fromLang === toLang) return;
    this._track('/language', { fromLang, toLang });
  },

  pageView(pagePath, lang) {
    const path = pagePath || window.location.pathname + window.location.search;
    const currentLang = lang || this.getCurrentLang();
    this._track('/pv', { pagePath: path, lang: currentLang });
  },

  init() {
    this.pageView();
    const checkI18N = setInterval(() => {
      if (window.I18N && typeof window.I18N.switchTo === 'function') {
        clearInterval(checkI18N);
        const originalSwitchTo = window.I18N.switchTo;
        window.I18N.switchTo = async function(lang) {
          const fromLang = window.I18N.currentLang || 'en';
          await originalSwitchTo.call(window.I18N, lang);
          YQZ_STATS.languageSwitch(fromLang, lang);
        };
      }
    }, 100);
  }
};

if (typeof window !== 'undefined') {
  window.YQZ_STATS = YQZ_STATS;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => YQZ_STATS.init(), 0);
    });
  } else {
    setTimeout(() => YQZ_STATS.init(), 0);
  }
}

export { YQZ_STATS };
export default YQZ_STATS;
