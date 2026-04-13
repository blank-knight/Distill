export interface KnowledgePoint {
  id: string;
  question: string;
  answer: string;
  extension: string;
  tags: string[];
  source_url: string;
  created_at: string;
}

export type MessageRole = 'user' | 'model';

export interface ConversationMessage {
  role: MessageRole;
  content: string;
}

export type ExportFormat = 'anki' | 'obsidian' | 'notion';

export type LanguageOption = 'zh' | 'en' | 'auto';

export type ModelType =
  | 'claude'
  | 'openai'
  | 'deepseek'
  | 'qwen'
  | 'moonshot'
  | 'doubao'
  | 'glm';

export interface ModelMeta {
  label: string;         // 显示名称
  defaultModel: string;  // 默认模型 ID
  baseUrl: string;       // API 基础地址
  docUrl: string;        // 文档/控制台链接
  apiKeyLabel: string;   // API Key 输入框 placeholder
}

export const MODEL_META: Record<ModelType, ModelMeta> = {
  claude: {
    label: 'Claude (Anthropic)',
    defaultModel: 'claude-haiku-4-5-20251001',
    baseUrl: 'https://api.anthropic.com',
    docUrl: 'https://console.anthropic.com',
    apiKeyLabel: 'sk-ant-...',
  },
  openai: {
    label: 'OpenAI (GPT)',
    defaultModel: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    docUrl: 'https://platform.openai.com/api-keys',
    apiKeyLabel: 'sk-...',
  },
  deepseek: {
    label: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    docUrl: 'https://platform.deepseek.com',
    apiKeyLabel: 'sk-...',
  },
  qwen: {
    label: '通义千问 (Qwen)',
    defaultModel: 'qwen-turbo',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    docUrl: 'https://dashscope.console.aliyun.com',
    apiKeyLabel: 'sk-...',
  },
  moonshot: {
    label: '月之暗面 (Moonshot)',
    defaultModel: 'moonshot-v1-8k',
    baseUrl: 'https://api.moonshot.cn/v1',
    docUrl: 'https://platform.moonshot.cn',
    apiKeyLabel: 'sk-...',
  },
  doubao: {
    label: '豆包 (Doubao)',
    defaultModel: '',  // 用户须填写 endpoint ID
    baseUrl: 'https://ark.volcengine.com/api/v3',
    docUrl: 'https://console.volcengine.com/ark',
    apiKeyLabel: 'API Key',
  },
  glm: {
    label: 'GLM (智谱 AI)',
    defaultModel: 'glm-4-flash',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    docUrl: 'https://open.bigmodel.cn',
    apiKeyLabel: 'xxxxxxxx.xxxxxxxx',
  },
};

export interface UserSettings {
  model: ModelType;
  // API Keys（每个模型一个字段，保持向后兼容）
  claudeApiKey: string;
  openaiApiKey: string;
  deepseekApiKey: string;
  qwenApiKey: string;
  moonshotApiKey: string;
  doubaoApiKey: string;
  doubaoModel: string;   // 豆包需要用户指定 endpoint/model ID
  glmApiKey: string;
  // 其他设置
  defaultExportFormat: ExportFormat;
  defaultLanguage: LanguageOption;
}

export const DEFAULT_SETTINGS: UserSettings = {
  model: 'glm',
  claudeApiKey: '',
  openaiApiKey: '',
  deepseekApiKey: '',
  qwenApiKey: '',
  moonshotApiKey: '',
  doubaoApiKey: '',
  doubaoModel: '',
  glmApiKey: '',
  defaultExportFormat: 'anki',
  defaultLanguage: 'auto',
};
