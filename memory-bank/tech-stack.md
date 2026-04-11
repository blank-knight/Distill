# Distill — 技术栈

---

## 核心选择原则（胶水编程）

- 优先用成熟轮子，最小化自写代码
- Chrome Extension Manifest V3（现代标准，未来兼容）
- TypeScript 全栈，类型安全

---

## 技术栈清单

### 构建工具
| 工具 | 选型 | 理由 |
|------|------|------|
| 构建框架 | **Vite + CRXJS** | 专为 Chrome 插件设计，HMR 热更新，开发体验极佳 |
| 语言 | **TypeScript** | 类型安全，IDE 支持好 |
| UI 框架 | **React 18** | 生态成熟，Popup 组件开发效率高 |
| 样式 | **Tailwind CSS** | 原子化 CSS，快速出 UI |

### AI 能力
| 工具 | 选型 | 理由 |
|------|------|------|
| 知识提取 | **Claude API (claude-haiku-4-5)** | 速度快、成本低、够用；复杂对话可升级到 sonnet |
| SDK | **@anthropic-ai/sdk** | 官方 SDK，支持 prompt caching |

### 导出适配
| 平台 | 方案 | 依赖 |
|------|------|------|
| Anki | 生成 Tab 分隔 `.txt` 文件 | 无额外依赖 |
| Obsidian | 生成 `.md` 文件 + JSZip 打包 | `jszip` |
| Notion | Notion API (后续) | `@notionhq/client` |

### 存储
| 用途 | 方案 |
|------|------|
| 用户配置（API Key 等） | `chrome.storage.sync` |
| 当前会话知识点 | `chrome.storage.local` |

### 开发工具
| 工具 | 用途 |
|------|------|
| `pnpm` | 包管理 |
| `eslint` + `prettier` | 代码规范 |
| `@types/chrome` | Chrome API 类型定义 |

---

## 项目结构

```
Distill/
├── src/
│   ├── content/
│   │   └── gemini.ts          # Gemini DOM 解析器
│   ├── background/
│   │   ├── index.ts           # Service Worker 入口
│   │   └── extractor.ts       # Claude API 知识提取
│   ├── export/
│   │   ├── anki.ts            # Anki 导出适配器
│   │   ├── obsidian.ts        # Obsidian 导出适配器
│   │   └── notion.ts          # Notion 导出适配器（后续）
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── components/
│   │       ├── KnowledgeCard.tsx
│   │       ├── KnowledgeList.tsx
│   │       └── ExportPanel.tsx
│   ├── options/
│   │   ├── index.html
│   │   └── main.tsx           # 设置页面
│   └── types/
│       └── index.ts           # 共享类型定义
├── public/
│   ├── manifest.json
│   └── icons/
├── memory-bank/               # Vibe coding 文档
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Claude API 调用策略

```typescript
// 使用 prompt caching 降低成本
// System prompt（含格式规范）走 cache_control
// 对话内容作为 user message
const response = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 4096,
  system: [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" }
    }
  ],
  messages: [{ role: "user", content: conversationText }]
});
```

---

## Gemini DOM 选择器策略

Gemini 的 DOM 结构可能变化，采用**多选择器降级**策略：

```typescript
const GEMINI_SELECTORS = {
  // 用户消息
  userMessage: [
    'user-query .query-text',
    '[data-message-author-role="user"]',
    '.user-message'
  ],
  // AI 回复
  modelResponse: [
    'model-response .response-content',
    '[data-message-author-role="model"]',
    '.model-response'
  ]
};
```

若自动检测失败，提供**手动框选**模式（用户 highlight 对话区域后提取）。
