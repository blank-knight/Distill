# 提示词历史 P — Distill Chrome Extension

> 每条提示词都经过优化器 O 按标准 Ω 处理。
> 直接复制对应 Step 的提示词给 Claude Code 使用。

---

## Phase 1 — 项目脚手架

### P-01：初始化项目（Step 1）

```
阅读 memory-bank/ 中所有文档（program-design-document.md、tech-stack.md、implementation-plan.md）。

任务：初始化 Distill Chrome Extension 项目脚手架。

输出文件：
- package.json（pnpm 管理）
- vite.config.ts（配置 CRXJS 插件，指向 public/manifest.json）
- tsconfig.json（strict 模式，包含 chrome 类型）
- tailwind.config.js + postcss.config.js
- src/index.css（引入 Tailwind 指令）

安装的依赖（pnpm add）：
- 生产依赖：react, react-dom, @anthropic-ai/sdk, jszip
- 开发依赖：@crxjs/vite-plugin, @types/chrome, @types/react, @types/react-dom, typescript, tailwindcss, autoprefixer, postcss, vite

约束：
- 不创建任何业务逻辑文件，只配置构建环境
- vite.config.ts 必须正确配置 crxjs，使 Chrome 能识别插件
- tsconfig.json 必须包含 "lib": ["ES2020"] 和 Chrome 类型

验证标准：
- 运行 `pnpm dev`，控制台无报错
- 打开 Chrome 开发者模式，加载 dist/ 目录，插件出现在扩展列表中且无错误标志

完成后：更新 memory-bank/progress.md 和 memory-bank/architecture.md。
```

---

### P-02：定义类型和 Manifest（Step 2）

```
阅读 memory-bank/ 中所有文档。确认 Step 1 已完成（检查 progress.md）。

任务：定义共享类型和插件 Manifest。

输出文件：
- src/types/index.ts — 定义所有共享类型
- public/manifest.json — Chrome Extension Manifest V3 配置
- public/icons/icon-16.png, icon-32.png, icon-48.png, icon-128.png — 占位图标（用纯色 PNG 即可）

src/types/index.ts 必须定义：
- KnowledgePoint 接口（字段：id: string, question: string, answer: string, extension: string, tags: string[], source_url: string, created_at: string）
- ConversationMessage 接口（字段：role: 'user' | 'model', content: string）
- ExtractionStatus 类型（'idle' | 'extracting' | 'done' | 'error'）
- MessageType 枚举（EXTRACT_CONVERSATION, EXTRACT_KNOWLEDGE, GET_KNOWLEDGE_POINTS）
- 所有类型必须 export

public/manifest.json 必须包含：
- manifest_version: 3
- name: "Distill", version: "0.1.0"
- permissions: ["storage", "activeTab", "scripting", "downloads"]
- host_permissions: ["https://gemini.google.com/*"]
- content_scripts: matches gemini.google.com，js 指向 src/content/gemini.ts
- background: service_worker 指向 src/background/index.ts
- action: popup 指向 src/popup/index.html，default_icons 引用 icons/
- options_page 指向 src/options/index.html
- icons 引用 16/32/48/128 尺寸

约束：
- 不修改 vite.config.ts 和其他构建配置文件
- 不创建任何 React 组件或业务逻辑

验证标准：
- TypeScript 编译 `pnpm tsc --noEmit` 无报错
- Chrome 重新加载插件后，manifest 信息显示正确（名称、权限）

完成后：更新 memory-bank/progress.md 和 memory-bank/architecture.md。
```

---

## Phase 2 — Gemini 对话抓取

### P-03：编写 Gemini Content Script（Step 3）

```
阅读 memory-bank/ 中所有文档。确认 Step 1、2 已完成。

任务：编写 Gemini 对话提取的 Content Script。

输入文件（只读）：src/types/index.ts

输出文件：
- src/content/gemini.ts（不超过 150 行）

实现要求：
1. 定义 SELECTORS 常量对象，包含多组降级选择器：
   - userMessage：至少 3 个候选选择器
   - modelResponse：至少 3 个候选选择器
2. 实现 trySelector(selectors: string[]): Element[] 函数，
   依次尝试选择器，返回第一个有结果的结果集
3. 实现 extractConversation(): ConversationMessage[] 函数：
   - 调用 trySelector 获取用户消息和 AI 回复
   - 按 DOM 顺序排列，交替组合为 ConversationMessage 数组
   - 提取纯文本（使用 element.innerText，去除首尾空白）
   - 如果没有抓取到内容，返回空数组并在 console.warn 中说明
4. 监听 chrome.runtime.onMessage，处理 MessageType.EXTRACT_CONVERSATION 消息：
   - 调用 extractConversation()
   - 用 sendResponse({ success: true, data: messages }) 返回
   - 错误时返回 { success: false, error: error.message }
5. 在 console.log 打印：已注入 Distill content script，并打印抓取到的消息数量

约束：
- 不能在 Content Script 中调用 Claude API 或 chrome.storage
- 必须使用 src/types/index.ts 中的 ConversationMessage 和 MessageType
- 不创建其他文件

验证标准：
- 打开 gemini.google.com 并进行一次对话
- 在 DevTools Console 看到 Distill 注入成功的日志
- 在 Console 执行：chrome.runtime.sendMessage({type: 'EXTRACT_CONVERSATION'}, console.log)
  能收到包含对话数组的响应

完成后：更新 memory-bank/progress.md 和 memory-bank/architecture.md。
```

---

### P-04：调试 Gemini 选择器（Step 4）

```
阅读 memory-bank/ 中所有文档。确认 Step 3 已完成（检查 progress.md）。

任务：在真实 Gemini 页面验证并修复 DOM 选择器。

操作步骤：
1. 打开 gemini.google.com，和 AI 进行至少 2 轮对话
2. 打开 DevTools > Console
3. 逐一测试 src/content/gemini.ts 中定义的所有选择器：
   document.querySelectorAll('选择器').length
4. 记录哪些选择器有效、返回了多少元素
5. 根据测试结果，更新 SELECTORS 常量，将有效选择器排在最前面

更新文件：
- src/content/gemini.ts（只更新 SELECTORS 常量，不改动逻辑）

验证标准：
- extractConversation() 能正确返回对话数组
- role 字段正确区分 'user' 和 'model'
- content 是干净的纯文本，不含 HTML 标签或多余空白
- 至少能抓取 2 轮对话（4 条消息）

完成后：更新 memory-bank/progress.md，记录最终有效的选择器。
```

---

## Phase 3 — Claude API 知识提取

### P-05：编写 Background Service Worker（Step 5）

```
阅读 memory-bank/ 中所有文档。确认 Phase 2 已完成。

任务：编写 Background Service Worker，作为消息路由中心。

输入文件（只读）：src/types/index.ts

输出文件：
- src/background/index.ts（不超过 100 行）

实现要求：
1. 监听 chrome.runtime.onMessage，根据 MessageType 路由：
   - EXTRACT_KNOWLEDGE：
     a. 从 chrome.storage.sync 读取 apiKey 和 language 配置
     b. 如果 apiKey 为空，返回 { success: false, error: 'NO_API_KEY' }
     c. 向当前激活 tab 发送 EXTRACT_CONVERSATION 消息，获取对话
     d. 如果对话为空，返回 { success: false, error: 'NO_CONVERSATION' }
     e. 调用 extractor 模块的 extractKnowledge 函数（此时 extractor.ts 尚未实现，先写 import 和调用，用 TODO 注释标记）
     f. 将结果存入 chrome.storage.local，key: 'knowledge_points'
     g. 返回 { success: true, data: knowledgePoints }
   - GET_KNOWLEDGE_POINTS：
     a. 从 chrome.storage.local 读取 knowledge_points
     b. 返回 { success: true, data: points ?? [] }
2. 所有消息处理函数必须是 async，return true 确保异步响应

约束：
- 不实现 extractor.ts 的内容，只写 import 和调用
- 不访问任何 DOM API
- 必须处理 tab 查询失败的情况（用户可能不在 Gemini 页面）

验证标准：
- 在 background service worker 的 DevTools 中能看到消息日志
- 发送 EXTRACT_KNOWLEDGE 消息时，若无 API Key 配置，正确返回 NO_API_KEY 错误

完成后：更新 memory-bank/progress.md 和 memory-bank/architecture.md。
```

---

### P-06：编写 Claude API 知识提取器（Step 6）

```
阅读 memory-bank/ 中所有文档。确认 Step 5 已完成。

任务：实现 Claude API 知识提取器。

输入文件（只读）：src/types/index.ts, src/background/index.ts

输出文件：
- src/background/extractor.ts（不超过 150 行）

实现要求：
1. 实现 SYSTEM_PROMPT 常量（标记 cache_control，用中文描述任务）：
   要求 AI 从对话中提取知识点，输出严格的 JSON 格式：
   { "knowledge_points": [ { "question": "...", "answer": "...", "extension": "...", "tags": ["..."] } ] }
   强调：
   - 只提取有实质学习价值的知识点，不提取闲聊
   - question 要具体且独立（即使脱离对话也能理解）
   - answer 要完整准确
   - extension 要包含：相关概念、延伸阅读方向、常见误区（如果有）
   - tags 用英文小写，2~5 个

2. 实现 formatConversation(messages: ConversationMessage[]): string 函数：
   将消息数组转为 "User:\n{content}\n\nAssistant:\n{content}\n\n..." 格式

3. 实现 extractKnowledge(messages, apiKey, language): Promise<KnowledgePoint[]> 函数：
   - 创建 Anthropic client（不使用 dangerouslyAllowBrowser，需在 background worker 中设置）
   - 调用 claude-haiku-4-5-20251001，max_tokens: 4096
   - system 使用 cache_control: { type: "ephemeral" }
   - user message 包含格式化的对话文本 + language 参数提示
   - 解析响应中的 JSON（从 text content 中提取，处理可能的 markdown 代码块包裹）
   - 为每个知识点生成 uuid（用 crypto.randomUUID()）和 created_at（ISO 字符串）
   - 填充 source_url（从参数传入，或用空字符串）
   - 返回 KnowledgePoint[]
   - try/catch 捕获所有错误，throw 包含友好信息的 Error

约束：
- 不修改 src/background/index.ts
- 不硬编码任何 API Key
- 必须使用 src/types/index.ts 的 KnowledgePoint 和 ConversationMessage 类型
- Anthropic client 初始化时传入 { apiKey, dangerouslyAllowBrowser: true }（Chrome Extension 环境需要此配置）

验证标准：
- 用一段硬编码的测试对话数组调用 extractKnowledge，能返回正确格式的 KnowledgePoint 数组
- 传入错误 API Key，函数抛出含友好信息的错误
- 响应的 JSON 解析能处理带 ```json 代码块的情况

完成后：更新 memory-bank/progress.md 和 memory-bank/architecture.md。
```

---

## Phase 4 — Popup UI

### P-07：Settings / Options 页面（Step 7）

```
阅读 memory-bank/ 中所有文档。确认 Phase 3 已完成。

任务：实现插件设置页面（Options Page）。

输出文件：
- src/options/index.html
- src/options/main.tsx
- src/options/OptionsApp.tsx（不超过 120 行）

OptionsApp.tsx 实现要求：
1. 表单字段：
   - Claude API Key（type="password"，placeholder 提示去 console.anthropic.com 获取）
   - 默认语言（select：跟随对话 / 中文 / 英文）
   - 默认导出格式（radio：Anki / Obsidian）
2. 「保存设置」按钮：将所有字段保存到 chrome.storage.sync
3. 「测试 API Key」按钮：
   - 向 background 发送测试消息（或直接用 fetch 测 Anthropic API 的 /v1/models 端点）
   - 显示成功（✓ API Key 有效）或失败（✗ Key 无效或网络错误）的内联提示
4. 页面加载时，从 chrome.storage.sync 读取已保存的设置并填充表单
5. 使用 Tailwind 样式，页面宽度 500px，简洁清晰

约束：
- 不修改 Phase 1-3 的任何文件
- 不在此文件中定义新类型，使用 src/types/index.ts

验证标准：
- 右键点击插件图标 > 选项，进入设置页面
- 输入 API Key 并保存，关闭页面再重新打开，设置仍存在
- 测试 API Key 按钮能正确判断 Key 有效性

完成后：更新 memory-bank/progress.md 和 memory-bank/architecture.md。
```

---

### P-08：Popup 主界面（Step 8）

```
阅读 memory-bank/ 中所有文档。确认 Step 7 已完成。

任务：实现插件弹窗主界面。

输出文件：
- src/popup/index.html
- src/popup/main.tsx
- src/popup/PopupApp.tsx（主容器，不超过 100 行）
- src/popup/components/KnowledgeCard.tsx（不超过 80 行）
- src/popup/components/KnowledgeList.tsx（不超过 60 行）
- src/popup/components/ExportPanel.tsx（不超过 80 行）

PopupApp.tsx 实现要求：
- 状态：status: ExtractionStatus, points: KnowledgePoint[], error: string
- 「提取知识点」按钮：发送 EXTRACT_KNOWLEDGE 消息，更新状态
- 根据 status 显示不同 UI：
  - idle：显示欢迎语 + 按钮
  - extracting：显示加载动画 + "AI 正在提取知识点..."
  - done：显示 KnowledgeList
  - error：显示错误信息（特殊处理 NO_API_KEY：显示「请先在设置页面配置 API Key」并附链接打开 options 页）

KnowledgeCard.tsx 实现要求：
- 展示 question（加粗标题）、answer、extension
- 默认折叠 extension，点击展开
- 「编辑」按钮：点击后 question/answer/extension 变为 textarea 可编辑，保存更新 points 状态
- 「删除」按钮：从列表中移除该卡片
- tags 以小标签形式展示在底部

KnowledgeList.tsx 实现要求：
- 接收 points 数组，渲染 KnowledgeCard 列表
- 顶部显示「共 N 个知识点」
- 空数组时显示「未提取到知识点」

ExportPanel.tsx 实现要求：
- 「导出 Anki」按钮（连接 Step 9 的适配器，暂时用 console.log 占位）
- 「导出 Obsidian」按钮（连接 Step 10 的适配器，暂时用 console.log 占位）
- 导出成功后显示「✓ 已下载 distill-xxxx.txt」提示

Popup 尺寸：width: 420px, min-height: 500px, max-height: 600px，overflow-y: auto

约束：
- 必须使用 src/types/index.ts 的 KnowledgePoint、ExtractionStatus、MessageType 类型
- 不修改 background 和 content script 文件
- 不在组件文件中写业务逻辑，逻辑放在 PopupApp.tsx

验证标准：
- 点击插件图标，Popup 正常打开，尺寸正确
- 在 Gemini 对话页面点击提取，看到加载动画，成功后显示卡片列表
- 可以展开/折叠 extension，可以编辑和删除卡片
- 在非 Gemini 页面打开 Popup，显示友好提示

完成后：更新 memory-bank/progress.md 和 memory-bank/architecture.md。
```

---

## Phase 5 — 导出适配器

### P-09：Anki 导出适配器（Step 9）

```
阅读 memory-bank/ 中所有文档。确认 Phase 4 已完成。

任务：实现 Anki 导出适配器，并接入 ExportPanel。

输出文件：
- src/export/anki.ts（不超过 60 行）

修改文件：
- src/popup/components/ExportPanel.tsx（只修改 Anki 按钮的 onClick 逻辑）

anki.ts 实现要求：
1. 实现 exportToAnki(points: KnowledgePoint[]): void 函数：
   - 第一行写 Anki 导入头：#separator:Tab\n#html:false\n#tags column:4\n
   - 每个知识点生成一行：{question}\t{answer}\n\n延伸：{extension}\t{tags.join(' ')}
   - 用 Blob 和 URL.createObjectURL 生成下载链接
   - 触发下载，文件名：distill-anki-{YYYY-MM-DD}.txt
   - 下载后清理 URL 对象

约束：
- 不修改 src/types/index.ts 和任何 background 文件
- 使用 KnowledgePoint 类型，从 src/types/index.ts 导入

验证标准：
- 点击「导出 Anki」，浏览器弹出下载 .txt 文件
- 用文本编辑器打开，第一行是 #separator:Tab，后续每行是一个知识点
- 在 Anki 中：File > Import，选择该文件，字段映射正确，能成功创建卡片

完成后：更新 memory-bank/progress.md 和 memory-bank/architecture.md。
```

---

### P-10：Obsidian 导出适配器（Step 10）

```
阅读 memory-bank/ 中所有文档。确认 Step 9 已完成。

任务：实现 Obsidian 导出适配器，并接入 ExportPanel。

输出文件：
- src/export/obsidian.ts（不超过 80 行）

修改文件：
- src/popup/components/ExportPanel.tsx（只修改 Obsidian 按钮的 onClick 逻辑）

obsidian.ts 实现要求：
1. 实现 toSlug(text: string): string 辅助函数：
   - 取前 40 个字符
   - 移除非字母数字中文字符，空格转为短横线
   - 结果用于文件名

2. 实现 generateMarkdown(point: KnowledgePoint): string 函数：
   生成以下格式的内容：
   ---
   tags: [{point.tags.join(', ')}]
   created: {YYYY-MM-DD}
   source: {point.source_url}
   ---
   
   ## Question
   {point.question}
   
   ## Answer
   {point.answer}
   
   ## Extension
   {point.extension}

3. 实现 exportToObsidian(points: KnowledgePoint[]): Promise<void> 函数：
   - 使用 JSZip 创建 zip 实例
   - 为每个知识点调用 generateMarkdown，以 toSlug(question) + '.md' 为文件名加入 zip
   - 生成 zip Blob，触发下载，文件名：distill-obsidian-{YYYY-MM-DD}.zip
   - 函数需要 async（JSZip 的 generateAsync 是异步的）

约束：
- 使用 jszip 库（已在 package.json 中）
- 不修改 src/types/index.ts 和任何 background 文件

验证标准：
- 点击「导出 Obsidian」，下载 .zip 文件
- 解压后，每个知识点对应一个 .md 文件
- 文件包含正确的 YAML frontmatter，在 Obsidian 中打开能识别 tags
- 文件名为 slug 格式，无特殊字符

完成后：更新 memory-bank/progress.md 和 memory-bank/architecture.md。
```

---

## Phase 6 — 收尾打磨

### P-11：错误处理和边界情况（Step 11）

```
阅读 memory-bank/ 中所有文档。确认 Phase 5 已完成。

任务：补全所有边界情况的错误处理。

需要检查并修复以下场景（逐一测试）：
1. 未配置 API Key → Popup 显示「请先配置 API Key」 + 打开 Options 页面的按钮
2. 在非 Gemini 页面打开 Popup → 显示「请在 Gemini 对话页面使用本插件」
3. Gemini 页面无对话内容 → 显示「未检测到对话内容，请先进行对话」
4. Claude API 调用失败（网络错误）→ 显示「网络错误，请检查网络连接」
5. Claude API 返回非 JSON 内容 → 显示「AI 响应格式异常，请重试」
6. 知识点数量为 0（AI 认为对话无知习价值）→ 显示「当前对话暂无可提取的知识点」

修改范围：
- src/popup/PopupApp.tsx（错误状态展示）
- src/background/index.ts（完善错误返回信息）
- src/background/extractor.ts（完善错误分类）

约束：
- 不改变任何正常流程的逻辑
- 错误信息必须是中文，对用户友好，不暴露技术细节

验证标准：
- 逐一模拟上述 6 种场景，每种都有对应的清晰提示
- 提示信息不包含 "undefined"、"null"、英文错误堆栈等技术信息

完成后：更新 memory-bank/progress.md。
```

---

### P-12：构建、打包和端到端测试（Step 12）

```
阅读 memory-bank/ 中所有文档。确认 Step 11 已完成。

任务：生产构建并进行完整端到端测试。

操作步骤：
1. 运行 pnpm build，确认无错误，dist/ 目录生成
2. 在 Chrome 以开发者模式加载 dist/ 目录
3. 按以下顺序进行完整端到端测试：
   a. 打开 Options 页面，配置真实 Claude API Key，保存
   b. 打开 gemini.google.com，进行一次包含 2~3 个技术概念的对话
   c. 点击 Distill 图标，点击「提取知识点」
   d. 等待提取完成，检查知识点内容是否准确
   e. 编辑一个知识点，删除一个知识点
   f. 点击「导出 Anki」，验证下载文件格式
   g. 点击「导出 Obsidian」，验证 zip 文件内容
4. 记录发现的所有问题并修复

验证标准：
- pnpm build 无 TypeScript 错误，无 Vite 警告
- 完整端到端流程无报错
- Anki 文件能在 Anki 中成功导入
- Obsidian zip 解压后文件能在 Obsidian 中正常显示

完成后：
- 更新 memory-bank/progress.md（标记所有 Step 完成）
- 更新 memory-bank/architecture.md（记录最终文件结构和每个文件的作用）
- 在 progress.md 底部写一段「MVP 验收报告」，包含测试结果和已知限制
```

---

## 变更日志

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-04-11 | G 初始生成，O 优化，覆盖全部 12 个 Step |
