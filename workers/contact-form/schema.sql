-- 留言表单 D1 schema
-- 用法：wrangler d1 execute yuanqizhike-db --file=./schema.sql
--       远程：wrangler d1 execute yuanqizhike-db --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  project_type TEXT,
  description TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  is_read INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 索引：按时间倒序查询（后台列表常用）
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- 简易频率限制表（按 IP + 小时桶）
CREATE TABLE IF NOT EXISTS rate_limit (
  ip TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  count INTEGER DEFAULT 1,
  PRIMARY KEY (ip, bucket)
);

-- ============ 留言板表 ============
-- 用法同上，重新执行本文件即可（IF NOT EXISTS 幂等）
CREATE TABLE IF NOT EXISTS guestbook (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT DEFAULT 'Anonymous',
  category TEXT DEFAULT 'feedback',     -- feedback / suggestion / cooperation / other
  content TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'pending',        -- pending / approved / rejected / spam
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_guestbook_status_created ON guestbook(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guestbook_category ON guestbook(category, status);

-- IP 黑名单表（管理员拉黑的 IP）
CREATE TABLE IF NOT EXISTS ip_blacklist (
  ip TEXT PRIMARY KEY,
  reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- ============ 工具下载统计表 ============
CREATE TABLE IF NOT EXISTS downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL,              -- 工具名称/标识
  tool_zip_url TEXT,                    -- 下载链接
  ip TEXT,                              -- 访客 IP（匿名化后3段）
  user_agent TEXT,                      -- 浏览器信息
  referrer TEXT,                        -- 来源页面
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_downloads_tool_created ON downloads(tool_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_created ON downloads(created_at DESC);

-- ============ 语言切换统计表 ============
CREATE TABLE IF NOT EXISTS language_switches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_lang TEXT DEFAULT 'zh',          -- 原语言
  to_lang TEXT NOT NULL,                -- 目标语言
  ip TEXT,                              -- 访客 IP（匿名化后3段）
  user_agent TEXT,                      -- 浏览器信息
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_language_switches_lang ON language_switches(to_lang, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_language_switches_created ON language_switches(created_at DESC);

-- ============ 全站 PV 统计表（匿名） ============
CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_path TEXT NOT NULL,              -- 页面路径
  lang TEXT DEFAULT 'zh',               -- 当前语言
  ip TEXT,                              -- 访客 IP（匿名化后3段）
  user_agent TEXT,                      -- 浏览器信息
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_page_views_path_created ON page_views(page_path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at DESC);