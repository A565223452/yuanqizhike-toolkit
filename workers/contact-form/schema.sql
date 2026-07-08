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
