# Google AdSense 变现 - 待执行清单

> **状态**: ⏸️ 等待谷歌账号申诉通过
> **创建日期**: 2026-06-30
> **目标站点**: https://yuanqizhike-toolkit.pages.dev

---

## 📋 当前项目状态检查

### ✅ 已就绪（无需修改）
| 项目 | 状态 | 说明 |
|------|------|------|
| 隐私政策页 | ✅ 完整 | `privacy.html` 内容详实，含GDPR/CCPA合规 |
| Cookie声明页 | ✅ 完整 | `cookie.html` 已存在 |
| 关于我们页 | ✅ 完整 | `about.html` 内容丰富 |
| 许可证页 | ✅ 完整 | `license.html` 已存在 |
| 联系页 | ✅ 完整 | `customize.html` 含咨询表单 |
| robots.txt | ✅ 基础可用 | 仅排除 `/assets/zip-packages/` |
| HTTPS | ✅ 正常 | Cloudflare Pages自动提供 |
| 移动端适配 | ✅ 正常 | 已有响应式设计 |

### ⚠️ 待替换占位符（账号开通后执行）
| 文件 | 当前内容 | 需替换为 |
|------|----------|----------|
| `index.html` 第11行 | `ca-pub-0000000000000000` | 你的真实AdSense ID |
| `privacy.html` 第10行 | `ca-pub-0000000000000000` | 你的真实AdSense ID |
| `about.html` 第10行 | `ca-pub-0000000000000000` | 你的真实AdSense ID |
| `tools.html` 第10行 | `ca-pub-0000000000000000` | 你的真实AdSense ID |
| `customize.html` 第10行 | `ca-pub-0000000000000000` | 你的真实AdSense ID |
| `ads.txt` 第1行 | `pub-0000000000000000` | 你的真实AdSense ID |

### ❌ 尚未创建（账号开通后执行）
| 项目 | 说明 |
|------|------|
| 站点所有权验证代码 | AdSense审核通过后放置 |
| Cloudflare自定义域名规则 | 放行ads.txt爬虫 |

---

## 🚀 执行步骤（按顺序操作）

### 第一步：注册Google AdSense（20分钟）

1. 打开 https://www.google.com/adsense/start/
2. 用Gmail登录
3. 填写信息：
   - 网站URL: `https://yuanqizhike-toolkit.pages.dev`（不带末尾斜杠）
   - 站点语言: 英文 / 简体中文
   - 收款人信息: **真实姓名 + 国内详细地址**（后续收PIN码用）
4. 进入「添加网站」环节，选择「AdSense代码验证」

### 第二步：获取关键代码（5分钟）

注册后从AdSense后台获取两样东西：

**A. 广告代码（替换所有HTML页面的 `<head>` 中的占位符）**
```html
<!-- 替换前（当前状态） -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0000000000000000" crossorigin="anonymous"></script>

<!-- 替换后（你的真实ID） -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
```

**B. ads.txt 文件内容（替换根目录ads.txt）**
```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

### 第三步：批量替换所有HTML文件（5分钟）

需要修改的文件列表（共5个HTML文件 + 1个txt文件）：
- `index.html`
- `tools.html`
- `customize.html`
- `privacy.html`
- `about.html`
- `ads.txt`

**替换规则**: 将所有 `ca-pub-0000000000000000` 替换为你的真实ID `ca-pub-XXXXXXXXXXXXXXXX`

> ⚠️ 注意：`license.html`、`cookie.html`、`tools/*.html`、`tools/article-rewrite/*.html` 目前**没有**嵌入AdSense代码，如需投放广告可后续手动添加。

### 第四步：更新ads.txt文件（2分钟）

编辑 `ads.txt` 文件，将 `pub-0000000000000000` 替换为你的真实ID。

### 第五步：Git提交并推送（2分钟）

```bash
git add .
git commit -m "feat: integrate Google AdSense with real pub ID"
git push origin main
```

Cloudflare Pages 会自动部署，等待几分钟生效。

### 第六步：完成AdSense验证（5分钟）

1. 回到AdSense后台
2. 勾选「我已放置代码」
3. 提交网站进入审核队列

### 第七步：Cloudflare配置（5分钟）

1. 进入 Cloudflare Dashboard → Rules → Configuration Rules
2. 新建规则：
   - 匹配: `URI equals /ads.txt`
   - 关闭「浏览器完整性校验」
   - 安全等级: 最低

---

## 📝 审核期间优化事项

### 必须完成（否则100%拒审）
- [ ] 站点内容充足：至少8~15篇原创工具相关文案
- [ ] 所有页面可正常访问（隐私政策、关于、联系）
- [ ] 不要挂其他平台广告

### 建议完成
- [ ] 完善 `robots.txt`，添加Sitemap
- [ ] 确保移动端排版正常
- [ ] 检查所有链接无死链

---

## 🔧 快速替换脚本（账号开通后可用）

如果需要，我可以提前写好一个PowerShell脚本，一键替换所有HTML文件中的占位符。格式如下：

```powershell
# 一键替换脚本（待启用）
$oldId = "ca-pub-0000000000000000"
$newId = "ca-pub-XXXXXXXXXXXXXXXX"
Get-ChildItem -Recurse -Filter "*.html" | ForEach-Object {
    (Get-Content $_.FullName -Raw) -replace $oldId, $newId | Set-Content $_.FullName
}
# 同时替换ads.txt
(Get-Content ads.txt -Raw) -replace "pub-0000000000000000", "pub-XXXXXXXXXXXXXXXX" | Set-Content ads.txt
```

---

## ✅ 完成检查清单

当所有步骤完成后，逐项确认：

- [ ] AdSense账号已注册并通过初步审核
- [ ] 所有HTML页面已替换真实AdSense ID
- [ ] ads.txt已更新并可访问（https://yuanqizhike-toolkit.pages.dev/ads.txt）
- [ ] Cloudflare爬虫规则已配置
- [ ] Git已推送最新代码
- [ ] Cloudflare Pages已重新部署
- [ ] 访问 https://yuanqizhike-toolkit.pages.dev/ads.txt 能看到正确内容
- [ ] 浏览器右键「查看源码」能看到AdSense JS代码
- [ ] 站点已通过谷歌审核

---

## 📞 联系方式（已配置）
- 统一联系邮箱: 260330663@qq.com

---

*最后更新: 2026-06-30*
*等待事项: 谷歌账号申诉通过*