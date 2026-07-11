# 工具上传流程教程 · AI调用机制说明

## 前端配置流程

### 1. AI配置获取 (uploader.html)
```javascript
function getAIConfig() {
    // 从localStorage读取AI配置
    return {
        provider: localStorage.getItem('aiProvider') || 'agnes',
        apiKey: localStorage.getItem('aiApiKey') || '',
        baseUrl: localStorage.getItem('aiBaseUrl') || '',
        model: localStorage.getItem('aiModel') || ''
    };
}
```

### 2. 扫描触发AI识别 (uploader.html)
```javascript
const aiCfg = getAIConfig();
const headers = {
    'Content-Type': 'application/json',
    'x-ai-provider': aiCfg.provider,
    'x-ai-key': aiCfg.apiKey,        // API Key
    'x-ai-base-url': aiCfg.baseUrl,  // API地址
    'x-ai-model': aiCfg.model        // 模型名称
};

fetch('/api/process', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ folders: folderNames })
});
```

## 后端调用流程

### 1. 接收前端请求 (uploader.mjs)
```javascript
async function processFolders(req, res) {
    const { folders } = await readBody(req);
    
    // 从header读取AI配置
    const aiConfigFromHeader = {
        provider: req.headers['x-ai-provider'],
        apiKey: req.headers['x-ai-key'],
        baseUrl: req.headers['x-ai-base-url'],
        model: req.headers['x-ai-model']
    };
    
    // ...后续传递给analyzeTool
}
```

### 2. AI分析调用 (ai.mjs)
```javascript
export async function analyzeTool({ folderName, fileContents, aiConfig: dynamicCfg }) {
    const apiKey = dynamicCfg?.apiKey || cfg.ai.apiKey;      // 优先用前端配置
    const baseUrl = dynamicCfg?.baseUrl || cfg.ai.baseUrl;    // 否则用本地配置
    const model = dynamicCfg?.model || cfg.ai.model;
    const timeout = dynamicCfg?.timeout || cfg.ai.timeoutMs;
    
    const data = await callAI(SYSTEM_PROMPT, userMsg, 0.3, timeout, apiKey, baseUrl, model);
    // ...
}
```

### 3. API请求发送 (ai.mjs)
```javascript
async function callAI(systemPrompt, userMsg, temperature, timeoutMs, apiKey, baseUrl, model) {
    return rateLimitedRequest(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            log(`[AI] 超时触发 ${timeoutMs}ms`, 'warn');
            controller.abort();
        }, timeoutMs);
        
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }],
                temperature
            }),
            signal: controller.signal
        });
        // ...
    });
}
```

## 常见问题排查

### AI调用失败原因
1. **前端header未传递** → 检查Network → Request Headers → x-ai-key是否存在
2. **API地址错误** → 确认baseUrl格式: `https://api.example.com/v1/chat/completions`
3. **模型名称错误** → 确认model存在于厂商模型列表
4. **网络超时** → 检查timeoutMs（当前60000ms）

### 日志查看
- 查看 `tools-uploader/uploader.log`
- 搜索 `[AI]` 前缀日志

## 重要提醒
- tools-uploader/config.mjs 保存API Key，已被.gitignore排除
- 前端配置优先级高于本地配置
- 分类名称需完全匹配config.mjs categoryMap键