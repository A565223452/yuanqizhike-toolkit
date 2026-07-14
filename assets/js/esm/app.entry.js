// ===================================
// YuanqiZhiKe Toolkit - ESM Entry Point
// 使用方式（所有HTML页统一按此引入）：
//
// <!-- 1. 先 importmap 映射短名到 ESM 文件 -->
// <script type="importmap" src="/assets/js/importmap.json"></script>
//
// <!-- 2. cookie-consent 仍保留经典同步脚本（合规要求，最早执行） -->
// <script src="/assets/js/cookie-consent.js"></script>
//
// <!-- 3. 用 module 方式加载入口 -->
// <script type="module" src="/assets/js/esm/app.entry.js"></script>
//
// ===================================

import '@yuanqi/i18n';
import '@yuanqi/statistics';
import '@yuanqi/main';
import '@yuanqi/date-utils';

console.debug('[YuanqiZhiKe ESM] All modules loaded successfully');
