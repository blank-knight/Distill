# Distill — 程序设计文档

> 将 AI 对话蒸馏为结构化知识点的浏览器插件

---

## 一、核心目标

用户在和 AI 对话后，能一键提取对话中的知识精华，生成「问题 + 回答 + 延伸」格式的知识卡片，并导出到 Anki / Notion / Obsidian。

---

## 二、用户故事

1. 用户在 Gemini 聊了一个技术话题
2. 点击浏览器右上角 Distill 图标（或快捷键）
3. 插件自动抓取当前对话内容
4. 调用 Claude API 智能分析，提取若干知识点
5. 弹窗展示知识点列表，用户可编辑/删除/打标签
6. 一键导出到目标平台（Anki / Notion / Obsidian）

---

## 三、支持的对话平台

| 平台 | 状态 |
|------|------|
| Gemini (gemini.google.com) | ✅ MVP |
| Claude.ai | 后续迭代 |
| ChatGPT | 后续迭代 |

---

## 四、知识点数据结构

```json
{
  "id": "uuid",
  "question": "什么是 RAG（检索增强生成）？",
  "answer": "RAG 是一种将外部知识库检索与语言模型生成结合的架构，用于减少幻觉、提升答案准确性。",
  "extension": "相关概念：向量数据库、Embedding、Fine-tuning vs RAG 的区别。推荐阅读：LangChain 文档中的 RAG 章节。",
  "tags": ["AI", "RAG", "NLP"],
  "source_url": "https://gemini.google.com/...",
  "created_at": "2026-04-11T10:00:00Z"
}
```

---

## 五、导出格式

### 5.1 Anki
- 方案：生成 `.txt` 文件（Tab 分隔），Anki 原生支持导入
- 字段：`Question` | `Answer（含延伸）` | `Tags`
- 备选：如果用户安装了 AnkiConnect 插件，直接通过 API 推送卡片

### 5.2 Notion
- 方案：通过 Notion API 在指定 Database 中创建条目
- 每个知识点 = 一个 Page，含 Question / Answer / Extension / Tags 属性
- 需要用户提供 Notion Integration Token 和 Database ID

### 5.3 Obsidian
- 方案：生成 `.md` 文件压缩包（zip），用户手动放入 Vault
- 格式：每个知识点一个文件，含 YAML frontmatter
- 文件名：`{question_slug}.md`

---

## 六、核心模块

```
┌─────────────────────────────────────────────────────┐
│                  Browser Extension                  │
│                                                     │
│  ┌─────────────┐    ┌──────────────────────────┐   │
│  │  Content    │    │   Background Service     │   │
│  │  Script     │───▶│   Worker                 │   │
│  │             │    │   - Claude API 调用       │   │
│  │ 抓取 Gemini │    │   - 知识点提取            │   │
│  │ 对话 DOM    │    │   - Storage 管理          │   │
│  └─────────────┘    └──────────────────────────┘   │
│                              │                      │
│                     ┌────────▼────────┐             │
│                     │   Popup UI      │             │
│                     │ - 知识点列表    │             │
│                     │ - 编辑/删除     │             │
│                     │ - 导出操作      │             │
│                     └─────────────────┘             │
└─────────────────────────────────────────────────────┘
```

### 模块职责

| 模块 | 文件 | 职责 |
|------|------|------|
| Content Script | `src/content/gemini.ts` | 解析 Gemini DOM，提取对话文本 |
| Background Worker | `src/background/index.ts` | 调用 Claude API，管理 Chrome Storage |
| Claude Extractor | `src/background/extractor.ts` | 构建 prompt，解析 API 响应 |
| Export Adapters | `src/export/*.ts` | Anki / Notion / Obsidian 各平台适配器 |
| Popup UI | `src/popup/` | React 组件，展示和操作知识点 |
| Settings Page | `src/options/` | 配置 API Key、Notion Token 等 |

---

## 七、用户配置项

| 配置 | 说明 |
|------|------|
| Claude API Key | 必填，用于知识提取 |
| Notion Token | 可选，Notion 导出必填 |
| Notion Database ID | 可选，Notion 导出必填 |
| 默认导出格式 | Anki / Notion / Obsidian |
| 知识点语言 | 中文 / 英文 / 跟随对话 |

---

## 八、MVP 范围

**MVP 包含：**
- Gemini 对话抓取
- Claude API 知识提取
- Popup 展示 + 基础编辑
- Anki .txt 导出（最简单，无需额外配置）
- Obsidian .md 导出

**MVP 不包含（后续迭代）：**
- Notion API 对接（需要复杂配置）
- AnkiConnect API（需要用户安装插件）
- 多平台支持（ChatGPT / Claude.ai）
- 知识库本地持久化和搜索
