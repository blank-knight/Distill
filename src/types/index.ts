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

export type ModelType = 'claude' | 'glm';

export interface UserSettings {
  model: ModelType;
  claudeApiKey: string;
  glmApiKey: string;
  defaultExportFormat: ExportFormat;
  defaultLanguage: LanguageOption;
  notionToken?: string;
  notionDatabaseId?: string;
}