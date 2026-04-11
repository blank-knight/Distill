# Distill — 实施计划

> 每步都小而具体，含验证测试。严禁包含代码，只写清晰指令。
> 每步完成后更新 progress.md。

---

## Phase 1：项目脚手架

### Step 1 — 初始化项目

指令：
- 使用 `pnpm create vite` 创建 React + TypeScript 项目，名称为 `distill-extension`
- 安装 CRXJS Vite 插件：`@crxjs/vite-plugin`
- 安装依赖：`@anthropic-ai/sdk`, `jszip`, `tailwindcss`, `@types/chrome`
- 配置 `vite.config.ts`，加入 crxjs 插件指向 `public/manifest.json`
- 配置 Tailwind CSS

验证：运行 `pnpm dev`，插件能在 Chrome 开发者模式下加载，不报错。

---

### Step 2 — 定义共享类型和 manifest

指令：
- 创建 `src/types/index.ts`，定义 `KnowledgePoint` 接口（含 id/question/answer/extension/tags/source_url/created_at）
- 创建 `public/manifest.json`（Manifest V3），配置：
  - name: "Distill"
  - permissions: storage, activeTab, scripting
  - host_permissions: `https://gemini.google.com/*`
  - content_scripts 指向 gemini.ts（matches gemini.google.com）
  - background service_worker
  - action popup

验证：manifest 语法正确，Chrome 能加载插件，图标显示在工具栏。

---

## Phase 2：Gemini 对话抓取

### Step 3 — 编写 Gemini Content Script

指令：
- 创建 `src/content/gemini.ts`
- 实现 `extractConversation()` 函数：
  - 使用多选择器降级策略（见 tech-stack.md）尝试抓取用户消息和 AI 回复
  - 将消息按顺序组合为 `{ role: 'user' | 'model', content: string }[]`
  - 如果没有抓取到任何内容，返回空数组
- 监听来自 background 的 `EXTRACT_CONVERSATION` 消息，调用函数并返回结果
- 在 console 打印抓取到的消息数量用于调试

验证：在 Gemini 打开一个有对话的页面，在 DevTools Console 确认 content script 已注入，手动触发消息可以返回对话数组。

---

### Step 4 — 调试 Gemini DOM 选择器

指令：
- 打开 gemini.google.com，进行一次真实对话
- 打开 DevTools，手动用 `document.querySelectorAll` 测试各选择器
- 找到实际有效的选择器，更新 `gemini.ts` 中的选择器列表
- 确保能正确区分用户消息和 AI 回复

验证：抓取到的对话结构中，role 字段正确区分 user 和 model，content 为干净文本（无多余 HTML 标签）。

---

## Phase 3：Claude API 知识提取

### Step 5 — 编写 Background Service Worker

指令：
- 创建 `src/background/index.ts`
- 监听来自 Popup 的 `EXTRACT_KNOWLEDGE` 消息：
  1. 向当前 tab 的 content script 发送 `EXTRACT_CONVERSATION` 消息获取对话
  2. 将对话传给 extractor 模块
  3. 将提取结果存入 `chrome.storage.local`（key: `knowledge_points`）
  4. 返回结果给 Popup
- 监听 `GET_KNOWLEDGE_POINTS` 消息：从 storage 读取并返回

验证：在 background service worker 的 DevTools 中，能看到消息收发日志，storage 中有数据写入。

---

### Step 6 — 编写 Claude API 知识提取器

指令：
- 创建 `src/background/extractor.ts`
- 实现 `extractKnowledge(conversation, apiKey, language)` 异步函数：
  - 将对话数组格式化为纯文本（`User: ...\nAssistant: ...`）
  - System Prompt（使用 cache_control）要求 AI 输出严格的 JSON 格式，包含 `knowledge_points` 数组，每项有 question/answer/extension/tags
  - 语言参数控制输出语言（中文/英文/跟随对话）
  - 解析响应 JSON，为每个知识点生成 uuid 和 created_at
  - 返回 `KnowledgePoint[]`
- 处理 API 错误（网络错误、invalid key、rate limit），返回友好错误信息

验证：用一段测试对话文本调用函数，能返回正确格式的知识点数组；用错误的 API Key 测试，能返回友好错误。

---

## Phase 4：Popup UI

### Step 7 — 编写 Settings/Options 页面

指令：
- 创建 `src/options/` 页面，包含以下设置项：
  - Claude API Key（password 类型输入框 + 测试按钮）
  - 默认语言（中文/英文/跟随对话）
  - 默认导出格式（Anki / Obsidian）
- 设置保存到 `chrome.storage.sync`
- 点击「测试 API Key」按钮，发一个最小请求验证 key 有效性，显示成功/失败

验证：进入插件的 Options 页面，输入 API Key 并保存，重新打开 Options 页面设置仍在。

---

### Step 8 — 编写 Popup 主界面

指令：
- 创建 `src/popup/components/KnowledgeCard.tsx`：展示单个知识点（question/answer/extension），支持展开/折叠，支持编辑和删除
- 创建 `src/popup/components/KnowledgeList.tsx`：展示知识点列表，显示加载状态和空状态
- 创建 `src/popup/components/ExportPanel.tsx`：展示导出按钮（Anki / Obsidian），显示导出状态
- 创建 `src/popup/main.tsx`：组合以上组件，点击「提取知识点」按钮触发整个流程，显示进度
- Popup 尺寸设为 420x600px

验证：点击插件图标能打开 Popup，点击「提取知识点」按钮，显示加载动画，成功后显示知识点列表，可以编辑每个知识点的内容。

---

## Phase 5：导出适配器

### Step 9 — Anki 导出适配器

指令：
- 创建 `src/export/anki.ts`
- 实现 `exportToAnki(points: KnowledgePoint[])` 函数：
  - 生成 Tab 分隔的文本：`question\tanswer\nextension\ttags（空格分隔）`
  - 文件首行加 Anki 导入注释 `#separator:tab\n#html:false\n#tags column:4`
  - 使用 `chrome.downloads.download` 下载为 `distill-{date}.txt`
- 在 ExportPanel 中加入 Anki 导出按钮，连接此函数

验证：点击导出 Anki，浏览器下载一个 .txt 文件，用文本编辑器打开，格式正确（Tab 分隔，每行一个知识点）。在 Anki 中导入测试：File > Import，选择该文件，能成功创建卡片。

---

### Step 10 — Obsidian 导出适配器

指令：
- 创建 `src/export/obsidian.ts`
- 实现 `exportToObsidian(points: KnowledgePoint[])` 函数：
  - 为每个知识点生成一个 `.md` 文件，内容格式：
    ```
    ---
    tags: [tag1, tag2]
    created: 2026-04-11
    source: https://gemini.google.com/...
    ---
    
    ## Question
    {question}
    
    ## Answer
    {answer}
    
    ## Extension
    {extension}
    ```
  - 文件名：取 question 前 40 个字符，转为 slug（去除特殊字符，空格转短横线）
  - 使用 JSZip 将所有 .md 文件打包为 `distill-{date}.zip`
  - 触发浏览器下载

验证：点击导出 Obsidian，下载 zip 文件，解压后每个知识点对应一个 .md 文件，frontmatter 格式正确，在 Obsidian 中能正确识别 tags。

---

## Phase 6：收尾和打磨

### Step 11 — 错误处理和边界情况

指令：
- 处理未配置 API Key 时，点击提取按钮，弹出提示引导用户去 Options 页面配置
- 处理非 Gemini 页面打开 Popup，显示「请在 Gemini 对话页面使用」提示
- 处理 Gemini 页面但没有对话内容，显示「未检测到对话内容」提示
- 处理 Claude API 调用失败，显示具体错误信息（不要只说"出错了"）
- 添加 manifest 中的 `manifest_icons`（16/32/48/128px）

验证：逐一测试以上场景，每种情况都有清晰的用户提示。

---

### Step 12 — 本地构建和打包

指令：
- 运行 `pnpm build`，生成 `dist/` 目录
- 在 Chrome 的 `chrome://extensions/` 以开发者模式加载 `dist/` 目录
- 进行完整的端到端测试：打开 Gemini → 对话 → 提取 → 导出 Anki → 导出 Obsidian
- 修复所有发现的问题

验证：完整流程无报错，Anki 和 Obsidian 文件均能正确导入。

---

## 里程碑总结

| Phase | 内容 | 交付物 |
|-------|------|--------|
| Phase 1 | 脚手架 | 可加载的空插件 |
| Phase 2 | Gemini 抓取 | 能读取对话内容 |
| Phase 3 | Claude 提取 | 能生成知识点 |
| Phase 4 | Popup UI | 可视化操作界面 |
| Phase 5 | 导出适配 | Anki + Obsidian 导出 |
| Phase 6 | 收尾 | 可用的 MVP |
