# Distill

> 将 AI 对话蒸馏为结构化知识点的浏览器插件

Distill 是一个 Chrome 浏览器扩展，能够自动提取你与 AI 的对话内容，借助大语言模型将其整理为结构化的知识卡片，并支持导出到 Anki、Obsidian、Notion 等主流知识管理工具。

## 功能特性

- **一键提取**：在 Gemini 对话页面点击按钮，自动抓取完整对话内容
- **AI 结构化**：调用 Claude 或 GLM 模型，将对话归纳为「问题 / 答案 / 延伸 / 标签」四维知识点
- **卡片管理**：在 Popup 中查看、编辑、删除提取到的知识卡片
- **多平台导出**：
  - **Anki**：导出 `.txt` 文件，直接 Import 生成闪卡
  - **Obsidian**：导出 `.zip`，每个知识点对应一个带 YAML frontmatter 的 Markdown 文件
  - **Notion**：导出 `.csv`，直接导入 Notion Database

## 界面预览

```
┌─────────────────────────────────┐
│ Distill  3           [提取知识点] │  ← 当前已提取 3 个知识点
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 期现套利为何会亏损？         │ │  ← 问题（加粗）
│ │ 当市场情绪看跌时，资金费率   │ │  ← 答案（最多3行）
│ │ 转负，空头需向多头支付...    │ │
│ │ [期货] [套利] [资金费率]    │ │  ← 标签
│ └─────────────────────────────┘ │
│ ...                             │
├─────────────────────────────────┤
│ [Anki]  [Obsidian]  [Notion]  ⚙ │  ← 导出 + 设置
└─────────────────────────────────┘
```

## 安装与构建

### 前置要求

- Node.js 18+
- pnpm

### 步骤

```bash
# 克隆仓库
git clone https://github.com/blank-knight/Distill.git
cd Distill

# 安装依赖
pnpm install

# 构建插件
pnpm build
```

构建完成后，`dist/` 目录即为插件包。

### 加载到 Chrome

1. 打开 Chrome，地址栏输入 `chrome://extensions`
2. 开启右上角**开发者模式**
3. 点击**加载已解压的扩展程序**
4. 选择项目的 `dist/` 文件夹

## 配置

点击插件 Popup 底部的 **⚙ 设置**，进入设置页面：

| 配置项 | 说明 |
|--------|------|
| 模型选择 | Claude（Anthropic）或 GLM（智谱 AI） |
| Claude API Key | 从 [console.anthropic.com](https://console.anthropic.com) 获取 |
| GLM API Key | 从 [open.bigmodel.cn](https://open.bigmodel.cn) 获取 |
| 默认语言 | 知识点语言：跟随对话 / 中文 / 英文 |
| 默认导出格式 | Anki / Obsidian |

配置完成后点击**测试 API Key** 验证可用性，再**保存设置**。

## 使用方法

### 提取知识点

1. 打开 [Gemini](https://gemini.google.com) 进行一段对话
2. 点击 Chrome 工具栏中的 **Distill** 图标
3. 点击 **提取知识点** 按钮
4. 等待 AI 处理完成，知识卡片出现在 Popup 中

### 管理知识卡片

- **展开**：点击卡片查看完整答案和延伸内容
- **编辑**：悬停卡片，点击 ✎ 图标修改任意字段
- **删除**：悬停卡片，点击 ✕ 图标

### 导出

#### Anki

1. 点击 **Anki** 按钮，下载 `distill-anki-xxxx.txt`
2. 打开 Anki 桌面客户端
3. 菜单 → **文件 → 导入** → 选择下载的 `.txt` 文件
4. 确认分隔符为 Tab，字段1=正面、字段2=背面，标签在第3列
5. 点击**导入**，闪卡自动创建完成

#### Obsidian

1. 点击 **Obsidian** 按钮，下载 `distill-xxxx.zip`
2. 解压到 Obsidian Vault 的任意文件夹
3. 每个知识点对应一个 `.md` 文件，包含完整 YAML frontmatter 和内容

#### Notion

1. 点击 **Notion** 按钮，下载 `distill-notion-xxxx.csv`
2. 在 Notion 中新建一个 **Database（Table 视图）**
3. 点击右上角 `···` → **Import** → **CSV** → 选择下载的文件
4. Notion 自动将各列映射为数据库属性（Question / Answer / Extension / Tags / Source / Created）

## 技术栈

| 层次 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 + crxjs |
| 样式 | Tailwind CSS v4 |
| AI | Anthropic SDK（Claude Haiku）/ ZhipuAI（GLM-4-Flash） |
| 导出 | JSZip（Obsidian）|

## 项目结构

```
src/
├── background/       # Service Worker
│   ├── index.ts      # 消息路由与存储
│   └── extractor.ts  # AI 知识提取核心
├── content/
│   └── gemini.ts     # Gemini 页面对话抓取
├── popup/            # 插件 Popup 界面
│   ├── main.tsx
│   └── components/
├── options/          # 设置页面
│   └── main.tsx
├── export/           # 导出适配器
│   ├── anki.ts
│   ├── obsidian.ts
│   └── notion.ts
└── types/            # 共享类型定义
```

## 当前限制

- 仅支持 **Gemini**（`gemini.google.com`）页面的对话提取，Claude.ai / ChatGPT 等平台待后续支持
- Notion 导出为离线 CSV，暂不支持通过 Notion API 直接推送
