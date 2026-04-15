# Distill — Privacy Policy / 隐私政策

**Last updated / 更新日期**: 2026-04-15

---

## English

### Summary

Distill is a browser extension that extracts structured knowledge points from AI chat conversations. We take privacy seriously: **Distill has no backend server of its own, does not collect telemetry, does not use analytics, and does not sell or share any user data.**

### What data Distill handles

1. **API keys** you configure (Claude / OpenAI / DeepSeek / Qwen / Moonshot / Doubao / GLM)
   - Stored **only** via `chrome.storage.sync` (encrypted at rest by your browser, synced across your own signed-in Chrome profile)
   - Never transmitted anywhere except to the corresponding AI provider's official API endpoint when you trigger an extraction
2. **Conversation content** on supported AI chat pages (ChatGPT, Gemini, Claude, DeepSeek, Kimi, Doubao, Qwen, Wenxin, Spark)
   - Read **only** when you explicitly trigger an extraction (toolbar button or `Ctrl+Shift+E`)
   - Sent **directly** from your browser to the AI provider you selected (no intermediary server)
3. **Extracted knowledge points and source URL**
   - Stored **locally** via `chrome.storage.local` on your device
   - Never transmitted anywhere; fully under your control (edit, delete, or clear at any time)

### What Distill does NOT do

- Does not run a backend, database, or proxy server of its own
- Does not collect analytics, telemetry, crash reports, or usage statistics
- Does not read any page other than the supported AI chat pages, and only when you explicitly trigger extraction
- Does not share, sell, or disclose your data to third parties
- Does not use cookies or tracking pixels

### Third-party AI providers

When you trigger extraction, your API key and the conversation text are sent directly from your browser to the AI provider **you chose** in settings. That request is governed by the provider's own privacy policy:

- Anthropic (Claude): https://www.anthropic.com/legal/privacy
- OpenAI: https://openai.com/policies/privacy-policy
- DeepSeek: https://platform.deepseek.com
- Alibaba Qwen / Tongyi: https://dashscope.console.aliyun.com
- Moonshot (Kimi): https://platform.moonshot.cn
- ByteDance Doubao (Volcengine): https://www.volcengine.com/
- Zhipu GLM: https://open.bigmodel.cn

You are responsible for choosing a provider you trust.

### Permissions requested

| Permission | Purpose |
|---|---|
| `storage` | Save your settings, API keys, and extracted knowledge points locally |
| `activeTab` | Read conversation content from the current AI chat tab when you click Extract |
| `scripting` | Inject the content script into supported AI chat pages when needed |
| `downloads` | Let you export knowledge points as Anki / Obsidian / Notion files |
| `notifications` | Show completion / error notifications after background extraction |
| `host_permissions` | Listed AI chat domains only — required to read conversation DOM |

### Data deletion

- Click **Clear** in the popup to delete all stored knowledge points
- Uninstall the extension to remove all locally stored data
- Remove API keys via the Settings page at any time

### Contact

Issues & source code: https://github.com/blank-knight/Distill

---

## 中文

### 概述

Distill 是一款浏览器扩展，用于从 AI 对话页面提取结构化知识点。我们重视用户隐私：**Distill 没有自己的服务器后端，不收集遥测数据，不使用分析工具，也不会出售或分享任何用户数据。**

### Distill 处理的数据

1. **您配置的 API Key**（Claude / OpenAI / DeepSeek / 通义千问 / 月之暗面 / 豆包 / 智谱 GLM）
   - **仅**通过 `chrome.storage.sync` 保存（由浏览器本地加密，并在您登录的 Chrome 账号间同步）
   - 除提取时发送给对应的官方 API 以外，不会传输到任何其他地方
2. **支持的 AI 对话页面上的对话内容**（ChatGPT、Gemini、Claude、DeepSeek、Kimi、豆包、通义千问、文心一言、星火）
   - **仅**在您主动触发提取（点击工具栏按钮或 `Ctrl+Shift+E`）时读取
   - 从您的浏览器**直接**发送到您选择的 AI 服务商，不经过任何中间服务器
3. **提取出的知识点和来源 URL**
   - **本地**保存在 `chrome.storage.local`
   - 不会传输到任何地方；您可随时编辑、删除或清空

### Distill 不会做的事

- 不运行任何服务器、数据库或代理
- 不收集分析数据、遥测、崩溃报告或使用统计
- 除在您主动触发提取时，不会读取任何支持页面以外的内容
- 不与任何第三方分享、出售或披露您的数据
- 不使用 Cookie 或追踪像素

### 第三方 AI 服务商

触发提取时，您的 API Key 和对话文本会从您的浏览器**直接**发送到您在设置中选择的 AI 服务商，该请求受对应服务商的隐私政策约束：

- Anthropic (Claude): https://www.anthropic.com/legal/privacy
- OpenAI: https://openai.com/policies/privacy-policy
- DeepSeek: https://platform.deepseek.com
- 阿里通义千问: https://dashscope.console.aliyun.com
- Moonshot (Kimi): https://platform.moonshot.cn
- 字节豆包 (火山引擎): https://www.volcengine.com/
- 智谱 GLM: https://open.bigmodel.cn

选择值得信赖的服务商由您自行决定。

### 申请的权限

| 权限 | 用途 |
|---|---|
| `storage` | 本地保存设置、API Key 和提取的知识点 |
| `activeTab` | 在您点击"提取"时读取当前 AI 对话标签页的内容 |
| `scripting` | 按需在支持的 AI 对话页注入 content script |
| `downloads` | 导出知识点为 Anki / Obsidian / Notion 文件 |
| `notifications` | 后台提取完成/失败时显示系统通知 |
| `host_permissions` | 仅限列出的 AI 对话域名——用于读取对话 DOM |

### 数据删除

- 在弹窗中点击**清空**即可删除全部知识点
- 卸载扩展即清除全部本地数据
- 随时可在设置页删除 API Key

### 联系方式

问题反馈 / 源码：https://github.com/blank-knight/Distill
