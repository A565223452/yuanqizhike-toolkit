/**
 * YuanqiZhiKe 表单 Worker 诊断脚本
 *
 * 用法（在 workers/contact-form 目录下）：
 *   node diagnose.mjs
 *
 * 检查项：
 *   1. 本地 wrangler.toml 配置完整性
 *   2. Turnstile sitekey 字符识别（I vs l 陷阱）
 *   3. D1 数据库绑定与表结构
 *   4. Secrets 配置（TURNSTILE_SECRET_KEY / RESEND_API_KEY / ADMIN_TOKEN）
 *   5. Worker 路由绑定
 *   6. 前端 customize.html 的 sitekey 一致性
 *
 * 不修改任何业务代码，纯只读诊断。
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const COLORS = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  gray: s => `\x1b[90m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
};

let pass = 0, fail = 0, warn = 0;
const log = (icon, msg, detail = '') => console.log(`  ${icon} ${msg}${detail ? '\n     ' + detail : ''}`);
const ok = (m, d='') => { pass++; log(COLORS.green('✓'), m, d); };
const bad = (m, d='') => { fail++; log(COLORS.red('✗'), m, d); };
const mid = (m, d='') => { warn++; log(COLORS.yellow('!'), m, d); };
const hdr = (s) => console.log(`\n${COLORS.bold(COLORS.cyan('── ' + s + ' ──'))}`);

// ---------- 1. wrangler.toml ----------
hdr('1. wrangler.toml 配置检查');
const tomlPath = path.join(__dirname, 'wrangler.toml');
if (!fs.existsSync(tomlPath)) {
  bad('wrangler.toml 不存在');
} else {
  const toml = fs.readFileSync(tomlPath, 'utf8');
  const get = (re) => { const m = toml.match(re); return m ? m[1] : null; };

  const name = get(/^name\s*=\s*"([^"]+)"/m);
  const main = get(/^main\s*=\s*"([^"]+)"/m);
  const binding = get(/^binding\s*=\s*"([^"]+)"/m);
  const dbId = get(/^database_id\s*=\s*"([^"]+)"/m);
  const dbName = get(/^database_name\s*=\s*"([^"]+)"/m);
  const siteKey = get(/^TURNSTILE_SITE_KEY\s*=\s*"([^"]+)"/m);
  const allowedOrigin = get(/^ALLOWED_ORIGIN\s*=\s*"([^"]+)"/m);
  const toEmail = get(/^CONTACT_TO_EMAIL\s*=\s*"([^"]+)"/m);
  const fromEmail = get(/^CONTACT_FROM_EMAIL\s*=\s*"([^"]+)"/m);

  name ? ok(`Worker name: ${name}`) : bad('Worker name 未配置');
  main ? ok(`main: ${main}`) : bad('main 未配置');

  if (binding === 'DB') ok('D1 binding 名为 "DB"（与代码 env.DB 一致）');
  else bad(`D1 binding 名为 "${binding}"，但代码用的是 env.DB`, '需改为 binding = "DB"');

  if (!dbId) bad('database_id 未配置');
  else if (dbId === 'YOUR_D1_DATABASE_ID') bad('database_id 还是占位符，需填真实 ID');
  else ok(`database_id: ${dbId}`);

  dbName ? ok(`database_name: ${dbName}`) : bad('database_name 未配置');

  if (siteKey) {
    ok(`TURNSTILE_SITE_KEY: ${siteKey}`);
    // 字符识别：把最后 4 位单独高亮
    const last4 = siteKey.slice(-4);
    const codePoints = [...last4].map(c => `${c}(U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4,'0')})`).join(' ');
    console.log(`     ${COLORS.gray('末尾 4 位字符 Unicode：')}${codePoints}`);
    // 检测易混淆字符
    if (/[Il1|]/.test(last4)) {
      mid('末尾含易混淆字符（I/l/1/|），需对照 Cloudflare 后台逐字符核对',
         '建议：复制到记事本，改字体为 Consolas，看倒数第 2 位是小写 L 还是大写 I');
    }
  } else bad('TURNSTILE_SITE_KEY 未配置');

  allowedOrigin ? ok(`ALLOWED_ORIGIN: ${allowedOrigin}`) : mid('ALLOWED_ORIGIN 未配置（CORS 将放行所有来源）');
  toEmail ? ok(`CONTACT_TO_EMAIL: ${toEmail}`) : bad('CONTACT_TO_EMAIL 未配置');
  fromEmail ? ok(`CONTACT_FROM_EMAIL: ${fromEmail}`) : bad('CONTACT_FROM_EMAIL 未配置');
}

// ---------- 2. 前端 sitekey 一致性 ----------
hdr('2. 前端 customize.html sitekey 一致性');
const htmlPath = path.join(ROOT, 'customize.html');
if (!fs.existsSync(htmlPath)) {
  bad('customize.html 不存在');
} else {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/TURNSTILE_SITE_KEY\s*=\s*['"]([^'"]+)['"]/);
  if (!m) bad('前端未找到 TURNSTILE_SITE_KEY');
  else {
    const feKey = m[1];
    const toml = fs.readFileSync(tomlPath, 'utf8');
    const beMatch = toml.match(/^TURNSTILE_SITE_KEY\s*=\s*"([^"]+)"/m);
    const beKey = beMatch ? beMatch[1] : null;

    ok(`前端 sitekey: ${feKey}`);
    if (beKey && feKey === beKey) {
      ok(`前后端 sitekey 一致 ✓`);
    } else if (beKey) {
      bad(`前后端 sitekey 不一致！`, `前端: ${feKey}\n     后端: ${beKey}\n     必须改成完全相同的字符串`);
    }

    // 检测 data-sitekey 属性（如果同时用了显式渲染，会冲突）
    const dataKey = html.match(/data-sitekey=["']([^"']+)["']/);
    if (dataKey) {
      mid('HTML 中存在 data-sitekey 属性', '同时用 data-sitekey + 显式 turnstile.render() 会冲突，应只用一种');
    }
  }
}

// ---------- 3. Cloudflare 后台配置（需 wrangler 登录） ----------
hdr('3. Cloudflare 远程配置检查（需 wrangler login）');

function run(cmd, label) {
  try {
    const out = execSync(cmd, { cwd: __dirname, encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: e.stdout || e.stderr || e.message };
  }
}

// 3a. 检查 wrangler 是否登录
const whoami = run('npx wrangler whoami', 'wrangler whoami');
if (!whoami.ok) {
  mid('wrangler 未登录或超时', '请先执行：npx wrangler login');
  console.log(`     ${COLORS.gray('跳过远程检查，仅靠本地配置判断')}`);
} else {
  ok('wrangler 已登录');

  // 3b. 检查 Worker 是否部署
  const workerList = run('npx wrangler deployments list', '');
  if (workerList.ok && /yuanqizhike-contact/i.test(workerList.out)) {
    ok('Worker 已部署');
  } else {
    mid('无法确认 Worker 部署状态', '请手动执行：npx wrangler deploy');
  }

  // 3c. 检查 Secrets
  const secretList = run('npx wrangler secret list', '');
  if (secretList.ok) {
    const out = secretList.out;
    const required = ['TURNSTILE_SECRET_KEY', 'RESEND_API_KEY', 'ADMIN_TOKEN'];
    required.forEach(s => {
      // 用简单的字符串包含判断，避免 \b 在下划线名上的边界问题
      if (out.includes(s)) {
        ok(`Secret ${s} 已配置`);
      } else {
        bad(`Secret ${s} 未配置`, `执行：npx wrangler secret put ${s}`);
      }
    });
  } else {
    mid('无法读取 secret list', '请确认 wrangler 已登录');
  }

  // 3d. 检查 D1 数据库
  const d1List = run('npx wrangler d1 list', '');
  if (d1List.ok) {
    if (/yuanqizhike-db/i.test(d1List.out)) {
      ok('D1 数据库 yuanqizhike-db 存在');
    } else {
      bad('D1 数据库 yuanqizhike-db 不存在', '执行：npx wrangler d1 create yuanqizhike-db');
    }
  } else {
    mid('无法读取 D1 列表');
  }

  // 3e. 检查 D1 表结构
  const schemaCheck = run('npx wrangler d1 execute yuanqizhike-db --remote --command "SELECT name FROM sqlite_master WHERE type=\'table\'"', '');
  if (schemaCheck.ok) {
    const out = schemaCheck.out;
    if (/messages/i.test(out)) ok('D1 表 messages 已创建');
    else bad('D1 表 messages 未创建', '执行：npm run db:init:remote');
    if (/rate_limit/i.test(out)) ok('D1 表 rate_limit 已创建');
    else bad('D1 表 rate_limit 未创建', '执行：npm run db:init:remote');
  } else {
    mid('无法查询 D1 表结构', '请确认 D1 数据库已创建且可访问');
  }
}

// ---------- 4. 健康检查（线上端点） ----------
hdr('4. 线上端点测试');
const healthCheck = run('curl -s -o NUL -w "%{http_code}" https://yuanqizhike.com/api/health', '');
if (healthCheck.ok) {
  const code = healthCheck.out.trim();
  if (code === '200') ok('GET /api/health 返回 200（Worker 路由已生效）');
  else if (code === '404') bad(`GET /api/health 返回 ${code}`, 'Worker 路由未绑定，需在 Cloudflare 后台加 route: yuanqizhike.com/api/* → yuanqizhike-contact');
  else if (code === '521' || code === '522' || code === '523') bad(`GET /api/health 返回 ${code}`, 'Cloudflare 无法连到源站，请检查 DNS/路由');
  else mid(`GET /api/health 返回 ${code}`, '非预期状态码，请手动检查');
} else {
  mid('健康检查请求失败', '可能无网络或域名未解析');
}

// ---------- 5. 总结 ----------
hdr('总结');
console.log(`  ${COLORS.green('通过: ' + pass)}  ${COLORS.red('失败: ' + fail)}  ${COLORS.yellow('警告: ' + warn)}`);
console.log('');
if (fail > 0) {
  console.log(COLORS.red('  ⚠ 存在必须修复的问题，按上述 ✗ 项处理'));
} else if (warn > 0) {
  console.log(COLORS.yellow('  ⚠ 无致命问题，但建议处理警告项'));
} else {
  console.log(COLORS.green('  ✓ 所有检查通过，表单应该可正常工作'));
}
console.log('');
console.log(COLORS.gray('  提示：若 503 持续，执行 npx wrangler tail yuanqizhike-contact 实时查看 Worker 日志'));
