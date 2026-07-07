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
