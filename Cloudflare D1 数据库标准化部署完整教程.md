## 一、指令标准化模板（强制格式，AI执行专用）
**核心动作**：完成Cloudflare D1数据库初始化、数据表创建、项目绑定、权限校验全流程标准化部署
**限定范围**：仅针对单项目独立D1实例，不跨库、不共用数据库；仅执行标准建表SQL，禁止删除已有数据表
**强制性规范**
1. 所有建表语句必须携带 `IF NOT EXISTS`，兼容重复执行
2. 必须先创建D1实例 → 复制数据库ID → 绑定Pages/Wrangler → 执行SQL → 校验数据表数量
3. 执行后必须校验读写查询是否正常，输出校验结果
**输出要求**：分步执行，每一步完成后输出结果，确认无误再进入下一步；最终生成可复用配置清单

---

## 二、分步标准化完整流程（可直接丢给AI全自动执行）
### 步骤1：创建独立D1 SQLite数据库实例
1. 进入Cloudflare控制台 → Storage & databases → D1 SQLite Database
2. 点击Create database，填写数据库名称（项目统一命名规范：`项目标识-db`）
3. 选择默认区域，完成创建，复制**数据库UUID（唯一ID）**
4. 标准输出结果：数据库名称、UUID、创建区域

### 步骤2：标准化建表SQL脚本（固定模板，全局复用）
```sql
-- 标准化D1数据表初始化脚本 带安全重复执行校验
-- 1.留言记录表
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
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- 2.接口限流表
CREATE TABLE IF NOT EXISTS rate_limit (
  ip TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  count INTEGER DEFAULT 1,
  PRIMARY KEY (ip, bucket)
);

-- 3.访客留言板表
CREATE TABLE IF NOT EXISTS guestbook (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT DEFAULT 'Anonymous',
  category TEXT DEFAULT 'feedback',
  content TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_guestbook_status_created ON guestbook(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guestbook_category ON guestbook(category, status);

-- 4.IP黑名单表
CREATE TABLE IF NOT EXISTS ip_blacklist (
  ip TEXT PRIMARY KEY,
  reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 5.工具下载统计表
CREATE TABLE IF NOT EXISTS downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL,
  tool_zip_url TEXT,
  ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_downloads_tool_created ON downloads(tool_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_created ON downloads(created_at DESC);

-- 6.页面访问PV统计表
CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_path TEXT NOT NULL,
  lang TEXT DEFAULT 'zh',
  ip TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 7.语言切换统计表
CREATE TABLE IF NOT EXISTS language_switches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_lang TEXT DEFAULT 'zh',
  to_lang TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 8.404错误日志表
CREATE TABLE IF NOT EXISTS not_found_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  query_string TEXT,
  method TEXT DEFAULT 'GET',
  ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_not_found_created ON not_found_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_not_found_path ON not_found_log(path, created_at DESC);
```

### 步骤3：D1控制台标准化执行SQL
1. 打开目标D1数据库 → Console控制台
2. 清空输入框，完整粘贴上方标准SQL脚本
3. 点击Execute执行
4. 校验标准：切换Overview页面，查看`Number of Tables`数值，固定为8张数据表即为初始化成功

### 步骤4：项目绑定D1数据库（Wrangler + Pages双标准化绑定）
#### 方式A：wrangler.toml 配置绑定（Workers标准）
```toml
[[d1_databases]]
binding = "DB"
database_name = "yuanqizhike-db"
database_id = "填写步骤1复制的D1 UUID"
migrations_dir = "d1/migrations"
```

#### 方式B：Cloudflare Pages环境变量绑定
1. Pages项目 → Settings → Environment variables
2. 新增变量：
   - `D1_BINDING_NAME` = DB
   - `D1_DATABASE_ID` = 数据库UUID
3. 开启Production与Preview环境同步

### 步骤5：标准化读写校验（AI自动校验步骤）
在Console输入两条测试语句，验证数据库读写完全正常
1. 写入测试
```sql
INSERT INTO page_views (page_path,lang) VALUES ('/test','zh');
```
2. 读取校验
```sql
SELECT * FROM page_views ORDER BY created_at DESC LIMIT 1;
```
3. 校验判定：可以正常返回数据 → 数据库链路打通

### 步骤6：项目重新部署生效
1. 提交代码至远程Git仓库
2. 触发Cloudflare Pages自动构建部署
3. 部署完成后，访问网站接口，再次查看D1的Queries面板，出现新增INSERT/SELECT请求，代表全流程标准化部署完成

---

## 三、AI复用执行规则（标准化约束）
1. 每次新建项目，严格复刻以上6步流程，数据表结构统一，配置格式统一
2. 禁止手动删减SQL内数据表，新增功能仅在脚本尾部追加新表，保留原有结构
3. 重复执行部署流程时，依靠`IF NOT EXISTS`保证数据安全，不会覆盖旧数据
4. 部署结束必须输出：数据库名称、UUID、数据表总数、读写校验结果四项标准化回执

