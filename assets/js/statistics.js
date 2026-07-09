/**
 * 元启智客 - 统计 SDK
 * 
 * 功能：
 * 1. 下载统计（匿名，仅记录工具名称）
 * 2. 语言切换统计（匿名，记录语言流向）
 * 3. 全站 PV 统计（匿名，严格隐私合规）
 * 
 * 隐私说明：
 * - IP 地址在 Worker 端自动匿名化（保留前 3 段）
 * - 不收集任何个人身份信息 (PII)
 * - 不做 UV 独立访客识别
 * - 所有数据仅管理后台可见
 */

const YQZ_STATS = {
  /**
   * 统计接口基础路径
   * 使用相对路径，适配 Cloudflare Pages Functions
   */
  apiBase: '/api/stat',
  
  /**
   * 获取当前语言
   */
  getCurrentLang() {
    // 优先从 cookie 读取
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name === 'yqz_lang') {
        return valueParts.join('=');
      }
    }
    // 其次从 localStorage 读取
    try {
      return localStorage.getItem('yqz_lang') || 'zh';
    } catch (_) {
      return 'zh';
    }
  },
  
  /**
   * 发送统计请求（使用 sendBeacon，页面关闭时也能发送）
   * @param {string} endpoint - API 端点
   * @param {object} data - 统计数据
   */
  _track(endpoint, data) {
    const payload = {
      ...data,
      timestamp: Date.now()
    };
    
    // 优先使用 sendBeacon（页面卸载时可靠）
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(this.apiBase + endpoint, blob);
    } else {
      // 降级为 fetch
      fetch(this.apiBase + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {}); // 静默失败
    }
  },
  
  /**
   * 统计下载事件
   * @param {string} toolName - 工具名称/标识
   * @param {string} [toolZipUrl] - 下载链接（可选）
   */
  download(toolName, toolZipUrl) {
    this._track('/download', {
      toolName: toolName,
      toolZipUrl: toolZipUrl || window.location.href
    });
  },
  
  /**
   * 统计语言切换事件
   * @param {string} fromLang - 切换前的语言
   * @param {string} toLang - 切换后的语言
   */
  languageSwitch(fromLang, toLang) {
    if (fromLang === toLang) return; // 同语言切换不统计
    this._track('/language', {
      fromLang: fromLang,
      toLang: toLang
    });
  },
  
  /**
   * 统计页面浏览（PV）
   * @param {string} [pagePath] - 页面路径（默认当前路径）
   * @param {string} [lang] - 当前语言（默认自动检测）
   */
  pageView(pagePath, lang) {
    const path = pagePath || window.location.pathname + window.location.search;
    const currentLang = lang || this.getCurrentLang();
    this._track('/pv', {
      pagePath: path,
      lang: currentLang
    });
  },
  
  /**
   * 初始化全局统计
   * - 页面加载时自动统计 PV
   * - 监听语言切换事件
   */
  init() {
    // 页面 PV 统计
    this.pageView();
    
    // 监听语言切换（如果 i18n.js 已加载）
    const originalSetLang = window.setLanguage;
    if (originalSetLang) {
      window.setLanguage = function(lang) {
        const fromLang = window.yqzCurrentLang || 'zh';
        originalSetLang(lang);
        window.yqzCurrentLang = lang;
        // 延迟一下确保 cookie 已写入
        setTimeout(() => {
          YQZ_STATS.languageSwitch(fromLang, lang);
        }, 100);
      };
    }
  }
};

// 页面加载完成后自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => YQZ_STATS.init());
} else {
  YQZ_STATS.init();
}

// 导出到全局
window.YQZ_STATS = YQZ_STATS;