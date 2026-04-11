# 生成器 G — 规则文件 v1.0

> 由元生成器 M 维护，记录生成提示词 P 的规则。
> 初始版本由人工基于项目特征制定。

---

## 核心规则

### R1 — 始终锚定 memory-bank

每条提示词必须以以下开头（或包含等价指令）：
```
阅读 memory-bank/ 中的所有文档，特别是：
- program-design-document.md（理解整体目标）
- tech-stack.md（确认技术选型）
- architecture.md（了解现有文件结构）
- progress.md（确认当前进度，不重复已完成的工作）
```

### R2 — 明确输入输出

每条提示词必须包含：
- **输入**：该 Step 需要读取哪些已有文件
- **输出**：该 Step 需要创建/修改哪些文件
- **不触碰**：明确列出不能修改的文件

### R3 — Chrome Extension 特有规则

- Content Script 只能访问 DOM，不能直接调用 Claude API（需通过 background）
- Background Service Worker 不能访问 DOM
- Popup 通过 `chrome.runtime.sendMessage` 与 background 通信
- 所有 API Key 存储在 `chrome.storage.sync`，不硬编码
- Manifest V3 的 CSP 限制：不能使用 `eval`，不能内联 script

### R4 — TypeScript 规则

- 所有函数必须有明确的返回类型注解
- 使用 `src/types/index.ts` 中定义的共享类型，不重复定义
- 错误处理：async 函数必须有 try/catch，错误信息传给调用方

### R5 — 模块化规则

- 单文件不超过 150 行
- 一个文件只做一件事（单一职责）
- 导出适配器（Anki/Obsidian）互不依赖，通过统一接口调用

### R6 — 验证规则

每条提示词的验证标准必须：
- 可以在不运行完整项目的情况下局部验证
- 包含具体的 DevTools 操作步骤或 console 命令
- 明确成功/失败的判断标准

### R7 — 进度更新规则

每个 Step 完成后，提示词必须要求 AI：
1. 更新 `memory-bank/progress.md`，记录完成了什么
2. 更新 `memory-bank/architecture.md`，记录新增文件的作用

---

## 项目特有上下文（G 生成时注入）

```
项目：Distill Chrome Extension
语言：TypeScript + React + Tailwind
构建：Vite + CRXJS
目标平台：Gemini (gemini.google.com)
知识提取：Claude API (claude-haiku-4-5-20251001)
导出：Anki (.txt) + Obsidian (.md zip)
代码注释：中文
```
